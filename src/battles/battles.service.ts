import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Battle, User } from '@prisma/client';
import { mapSong } from '../common/utils/song-mapper';
import { PrismaService } from '../prisma/prisma.service';

type BattleWithCreator = Battle & {
  creator: {
    id: string;
    name: string;
  };
};

@Injectable()
export class BattlesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currentUser?: User) {
    const battles = await this.prisma.battle.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      list: await this.mapBattles(battles, currentUser),
    };
  }

  async findOne(battleId: string, currentUser?: User) {
    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
      include: {
        creator: {
          select: { id: true, name: true },
        },
      },
    });
    if (!battle) throw new NotFoundException('擂台不存在');

    const [mapped] = await this.mapBattles([battle], currentUser);
    return { battle: mapped };
  }

  async create(user: User, topic: string, aId: string, bId: string) {
    if (aId === bId) throw new BadRequestException('对战作品不能相同');
    const availableSongCount = await this.prisma.song.count({
      where: {
        id: { in: [aId, bId] },
        published: true,
        status: 'published',
      },
    });
    if (availableSongCount !== 2) {
      throw new BadRequestException('只能选择两首已发布的公开歌曲');
    }
    const battle = await this.prisma.battle.create({
      data: { topic, aId, bId, createdBy: user.id },
      include: {
        creator: {
          select: { id: true, name: true },
        },
      },
    });

    const [mapped] = await this.mapBattles([battle], user);
    return { battle: mapped };
  }

  async vote(battleId: string, user: User, side: 'A' | 'B') {
    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
    });
    if (!battle) throw new NotFoundException('擂台不存在');

    const existing = await this.prisma.battleVote.findFirst({
      where: { battleId, userId: user.id },
    });
    if (existing) throw new BadRequestException('已经投过票了');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.battleVote.create({
        data: { battleId, userId: user.id, side },
      });
      return tx.battle.update({
        where: { id: battleId },
        data:
          side === 'A'
            ? { aVotes: { increment: 1 } }
            : { bVotes: { increment: 1 } },
      });
    });

    return {
      voted: true,
      votesA: updated.aVotes,
      votesB: updated.bVotes,
    };
  }

  async remove(battleId: string, user: User) {
    const battle = await this.prisma.battle.findUnique({
      where: { id: battleId },
    });
    if (!battle) throw new NotFoundException('擂台不存在');

    const isAdmin = user.role === 'admin';
    if (!isAdmin) {
      throw new ForbiddenException('只有管理员可以删除擂台');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.battleVote.deleteMany({ where: { battleId } });
      await tx.battle.delete({ where: { id: battleId } });
    });

    return {
      success: true,
      message: '擂台删除成功',
      battleId,
    };
  }

  private async mapBattles(battles: BattleWithCreator[], currentUser?: User) {
    const songIds = battles.flatMap((battle) => [battle.aId, battle.bId]);
    const songs = songIds.length
      ? await this.prisma.song.findMany({
          where: { id: { in: songIds } },
        })
      : [];
    const songMap = new Map(songs.map((song) => [song.id, mapSong(song)]));

    const voteMap = new Map<string, 'A' | 'B'>();
    if (currentUser && battles.length) {
      const votes = await this.prisma.battleVote.findMany({
        where: {
          userId: currentUser.id,
          battleId: { in: battles.map((battle) => battle.id) },
        },
        select: { battleId: true, side: true },
      });
      for (const vote of votes) {
        if (vote.side === 'A' || vote.side === 'B') {
          voteMap.set(vote.battleId, vote.side);
        }
      }
    }

    return battles.map((battle) =>
      this.mapBattleRow(
        battle,
        songMap,
        currentUser,
        voteMap.get(battle.id) ?? null,
      ),
    );
  }

  private mapBattleRow(
    battle: BattleWithCreator,
    songMap: Map<string, ReturnType<typeof mapSong>>,
    currentUser?: User,
    votedSide?: 'A' | 'B' | null,
  ) {
    const isOwner = currentUser ? battle.createdBy === currentUser.id : false;

    return {
      id: battle.id,
      topic: battle.topic,
      aId: battle.aId,
      bId: battle.bId,
      songA: songMap.get(battle.aId) ?? null,
      songB: songMap.get(battle.bId) ?? null,
      votesA: battle.aVotes,
      votesB: battle.bVotes,
      aVotes: battle.aVotes,
      bVotes: battle.bVotes,
      createdBy: battle.createdBy,
      creatorId: battle.createdBy,
      creator: {
        id: battle.creator.id,
        username: battle.creator.name,
        nickname: battle.creator.name,
      },
      isOwner,
      status: battle.status,
      createdAt: battle.createdAt.toISOString(),
      updatedAt: battle.updatedAt.toISOString(),
      votedSide: votedSide ?? undefined,
    };
  }
}
