import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { mapSong } from '../common/utils/song-mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BattlesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const battles = await this.prisma.battle.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    const songIds = battles.flatMap((b) => [b.aId, b.bId]);
    const songs = await this.prisma.song.findMany({
      where: { id: { in: songIds } },
    });
    const songMap = new Map(songs.map((s) => [s.id, mapSong(s)]));

    return {
      list: battles.map((b) => ({
        id: b.id,
        topic: b.topic,
        songA: songMap.get(b.aId) ?? null,
        songB: songMap.get(b.bId) ?? null,
        votesA: b.aVotes,
        votesB: b.bVotes,
        status: b.status,
      })),
    };
  }

  async create(user: User, topic: string, aId: string, bId: string) {
    if (aId === bId) throw new BadRequestException('对战作品不能相同');
    const battle = await this.prisma.battle.create({
      data: { topic, aId, bId, createdBy: user.id },
    });
    return { battle };
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
}
