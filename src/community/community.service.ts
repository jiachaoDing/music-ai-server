import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { MiniMaxService } from '../ai/minimax.service';
import { FORYOU_UNLOCK_LIKES } from '../common/constants';
import { mapComment } from '../common/utils/comment-mapper';
import { mapSong } from '../common/utils/song-mapper';
import { PrismaService } from '../prisma/prisma.service';

const RESONANCE_MOODS = [
  {
    title: '松弛',
    style: 'lo-fi, chill, bedroom pop, ambient, soft',
    tags: ['松弛', '夜晚', '治愈'],
    note: '今天和你同频的人，都在听一些慢下来的声音。',
  },
  {
    title: '城市',
    style: 'city pop, synthwave, electronic, neon, pop',
    tags: ['城市', '霓虹', '电子'],
    note: '把城市音量调低一点，听见和你同频的心跳。',
  },
  {
    title: '热烈',
    style: 'funk, dance, energetic, bright, party',
    tags: ['热烈', '快乐', '律动'],
    note: '今天适合把情绪放大，和同频的人一起亮起来。',
  },
  {
    title: '真诚',
    style: 'folk, ballad, acoustic, tender, emotional',
    tags: ['真诚', '民谣', '抒情'],
    note: '有些话不用说太满，同频的人会在旋律里听懂。',
  },
  {
    title: '再出发',
    style: 'rock, motivational, epic, driving, anthem',
    tags: ['再出发', '摇滚', '向前'],
    note: '今天的同频，是给自己一点重新开始的力气。',
  },
];

function hashString(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly miniMaxService: MiniMaxService,
  ) {}

  async getFeed(sort: string = 'new', page = 1, pageSize = 20, query?: string) {
    const orderBy =
      sort === 'hot'
        ? [{ plays: 'desc' as const }, { likes: 'desc' as const }]
        : [{ createdAt: 'desc' as const }];

    const skip = (page - 1) * pageSize;
    const keyword = query?.trim().slice(0, 80);
    const where = {
      published: true,
      status: 'published',
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword, mode: 'insensitive' as const } },
              { authorName: { contains: keyword, mode: 'insensitive' as const } },
              { style: { contains: keyword, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [songs, total] = await Promise.all([
      this.prisma.song.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
      this.prisma.song.count({
        where,
      }),
    ]);

    return { list: songs.map((s) => mapSong(s)), total, page, pageSize, sort, query: keyword ?? '' };
  }

  async getResonance(name = '旅人') {
    const day = new Date().toISOString().slice(0, 10);
    const mood =
      RESONANCE_MOODS[hashString(`${name}|${day}`) % RESONANCE_MOODS.length];
    const moodKeys = mood.style
      .toLowerCase()
      .split(/[,/]/)
      .map((item) => item.trim().split(/\s+/)[0])
      .filter(Boolean);

    const songs = await this.prisma.song.findMany({
      where: { published: true, status: 'published' },
      orderBy: [{ createdAt: 'desc' }],
      take: 80,
    });

    const scoredSongs = songs
      .map((song) => {
        const searchable = [
          song.title,
          song.style,
          (song.tags as string[] | null)?.join(' ') ?? '',
          song.lyrics ?? '',
        ]
          .join(' ')
          .toLowerCase();
        const resonanceScore = moodKeys.reduce(
          (score, key) => score + (key && searchable.includes(key) ? 1 : 0),
          0,
        );
        const hotScore = song.likes * 3 + song.plays + song.coverCount * 5;
        return { song, resonanceScore, hotScore };
      })
      .sort(
        (a, b) =>
          b.resonanceScore - a.resonanceScore ||
          b.hotScore - a.hotScore ||
          b.song.createdAt.getTime() - a.song.createdAt.getTime(),
      );

    const matchedSongs = scoredSongs
      .filter((item) => item.resonanceScore > 0)
      .map((item) => item.song);
    const fallbackSongs = scoredSongs.map((item) => item.song);
    const list = (matchedSongs.length ? matchedSongs : fallbackSongs).slice(0, 20);
    const mappedSongs = list.map((song) => mapSong(song));

    return {
      mood: {
        title: mood.title,
        style: mood.style,
        tags: mood.tags,
      },
      moodLabel: `同「${mood.title}」频`,
      note: mood.note,
      intro: mood.note,
      moodTags: mood.tags,
      list: mappedSongs,
      songs: mappedSongs,
      total: mappedSongs.length,
    };
  }

  private async getLegacyResonance() {
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

    if (!song.published || song.status !== 'published') {
      throw new BadRequestException('草稿作品发布后才能点赞');
    }

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

    if (!song.published || song.status !== 'published') {
      throw new BadRequestException('草稿作品发布后才能收藏');
    }

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
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
      select: { published: true, status: true },
    });
    if (!song) throw new NotFoundException('作品不存在');
    if (!song.published || song.status !== 'published') {
      return { list: [] };
    }

    const comments = await this.prisma.comment.findMany({
      where: { songId, deletedAt: null, status: 'approved' },
      orderBy: { createdAt: 'desc' },
    });
    comments.sort((left, right) => {
      const hostDifference =
        Number(right.userId === 'echo-host') -
        Number(left.userId === 'echo-host');
      if (hostDifference) return hostDifference;
      return right.createdAt.getTime() - left.createdAt.getTime();
    });
    return { list: comments.map(mapComment) };
  }

  async addComment(
    songId: string,
    user: User,
    text: string,
    anon: boolean = false,
  ) {
    const normalizedText = text.trim();
    if (!normalizedText) throw new BadRequestException('留言不能为空');
    if (normalizedText.length > 240) {
      throw new BadRequestException('评论不能超过 240 字');
    }

    const song = await this.prisma.song.findUnique({ where: { id: songId } });
    if (!song) throw new NotFoundException('作品不存在');

    if (!song.published || song.status !== 'published') {
      throw new BadRequestException('草稿作品发布后才能评论');
    }

    await this.assertCommentFrequency(user.id, normalizedText);
    const basicRuleReason = this.getBasicRuleRejection(normalizedText);
    if (basicRuleReason) {
      throw new BadRequestException(basicRuleReason);
    }

    let moderation: {
      decision: 'approve' | 'reject' | 'review';
      reason: string;
    };
    try {
      moderation = await this.miniMaxService.moderateComment(normalizedText);
    } catch {
      moderation = {
        decision: 'review',
        reason: 'AI 审核暂时不可用，已转交管理员审核',
      };
    }
    if (moderation.decision === 'reject') {
      throw new BadRequestException(
        moderation.reason || '评论可能包含不适宜内容，请修改后重试',
      );
    }

    const status =
      moderation.decision === 'approve' ? 'approved' : 'pending';
    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          songId,
          userId: user.id,
          userName: user.name,
          userColor: user.color,
          text: normalizedText,
          anon,
          status,
          moderationReason: moderation.reason,
          moderationSource: 'ai',
          moderatedAt: new Date(),
        },
      });
      if (status !== 'approved') {
        return { created, commentCount: song.commentCount };
      }
      const updatedSong = await tx.song.update({
        where: { id: songId },
        data: { commentCount: { increment: 1 } },
        select: { commentCount: true },
      });
      return { created, commentCount: updatedSong.commentCount };
    });
    return {
      status,
      message:
        status === 'approved'
          ? '评论发布成功'
          : '评论已提交，正在等待管理员审核',
      comment: status === 'approved' ? mapComment(comment.created) : null,
      commentCount: comment.commentCount,
    };
  }

  private getBasicRuleRejection(text: string) {
    if (
      /(https?:\/\/|www\.|(?:微信|vx|v信|qq)[:：号\s]*[a-z0-9_-]{5,})/i.test(
        text,
      )
    ) {
      return '评论中不能包含广告链接或联系方式';
    }
    if (/(.)\1{11,}/u.test(text)) {
      return '评论包含过多重复内容，请修改后重试';
    }
    return null;
  }

  private async assertCommentFrequency(userId: string, text: string) {
    const recent = await this.prisma.comment.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 60_000) },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { text: true },
    });
    if (recent.some((comment) => comment.text.trim() === text)) {
      throw new BadRequestException('请勿重复提交相同评论');
    }
    if (recent.length >= 5) {
      throw new BadRequestException('评论过于频繁，请稍后再试');
    }
  }
}
