import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { FORYOU_UNLOCK_LIKES } from '../common/constants';
import { mapComment } from '../common/utils/comment-mapper';
import { mapSong } from '../common/utils/song-mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeed(sort: string = 'new', page = 1, pageSize = 20) {
    const orderBy =
      sort === 'hot'
        ? [{ plays: 'desc' as const }, { likes: 'desc' as const }]
        : [{ createdAt: 'desc' as const }];

    const skip = (page - 1) * pageSize;
    const [songs, total] = await Promise.all([
      this.prisma.song.findMany({
        where: { published: true, status: 'published' },
        orderBy,
        skip,
        take: pageSize,
      }),
      this.prisma.song.count({
        where: { published: true, status: 'published' },
      }),
    ]);

    return { list: songs.map((s) => mapSong(s)), total, page, pageSize, sort };
  }

  async getResonance() {
    const songs = await this.prisma.song.findMany({
      where: { published: true, status: 'published' },
      orderBy: { likes: 'desc' },
      take: 6,
    });

    return {
      intro: '今天也有新的声音在悄悄发生',
      moodTags: ['松弛', '夜晚', '治愈'],
      list: songs.map((s) => mapSong(s)),
    };
  }

  async likeSong(songId: string, user: User) {
    const song = await this.prisma.song.findUnique({ where: { id: songId } });
    if (!song) throw new NotFoundException('作品不存在');

    const existing = await this.prisma.like.findFirst({
      where: { userId: user.id, songId },
    });
    if (existing) throw new ConflictException('已经点赞过了');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.like.create({ data: { userId: user.id, songId } });
      const next = await tx.song.update({
        where: { id: songId },
        data: { likes: { increment: 1 } },
      });

      const likedPlaylist = await tx.playlist.findFirst({
        where: { userId: user.id, type: 'liked', isSystem: true },
      });
      if (likedPlaylist) {
        const exists = await tx.playlistSong.findFirst({
          where: { playlistId: likedPlaylist.id, songId },
        });
        if (!exists) {
          await tx.playlistSong.create({
            data: { playlistId: likedPlaylist.id, songId },
          });
          await tx.playlist.update({
            where: { id: likedPlaylist.id },
            data: { songCount: { increment: 1 } },
          });
        }
      }

      return next;
    });

    let unlocked = false;
    if (
      song.mode === 'foryou' &&
      !song.unlocked &&
      updated.likes >= FORYOU_UNLOCK_LIKES
    ) {
      await this.prisma.song.update({
        where: { id: songId },
        data: { unlocked: true },
      });
      unlocked = true;
    }

    return {
      liked: true,
      likeCount: updated.likes,
      ...(unlocked ? { unlocked: true } : {}),
    };
  }

  async collectSong(songId: string, user: User, playlistId?: string) {
    const song = await this.prisma.song.findUnique({ where: { id: songId } });
    if (!song) throw new NotFoundException('作品不存在');

    const existing = await this.prisma.collect.findFirst({
      where: { userId: user.id, songId },
    });
    if (existing) throw new ConflictException('已经收藏过了');

    await this.prisma.collect.create({
      data: { userId: user.id, songId, playlistId },
    });

    if (playlistId) {
      const playlistSong = await this.prisma.playlistSong.findFirst({
        where: { playlistId, songId },
      });
      if (!playlistSong) {
        await this.prisma.$transaction([
          this.prisma.playlistSong.create({ data: { playlistId, songId } }),
          this.prisma.playlist.update({
            where: { id: playlistId },
            data: { songCount: { increment: 1 } },
          }),
        ]);
      }
    }

    const collectCount = await this.prisma.collect.count({ where: { songId } });
    return { collected: true, collectCount };
  }

  async getComments(songId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { songId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return { list: comments.map(mapComment) };
  }

  async addComment(
    songId: string,
    user: User,
    text: string,
    anon: boolean = false,
  ) {
    const song = await this.prisma.song.findUnique({ where: { id: songId } });
    if (!song) throw new NotFoundException('作品不存在');

    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          songId,
          userId: user.id,
          userName: user.name,
          userColor: user.color,
          text,
          anon,
        },
      });
      await tx.song.update({
        where: { id: songId },
        data: { commentCount: { increment: 1 } },
      });
      return created;
    });
    return { comment: mapComment(comment) };
  }
}
