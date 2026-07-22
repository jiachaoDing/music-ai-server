import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  mapChallengeListItem,
  publishedChallengeSongCountInclude,
  PUBLISHED_CHALLENGE_SONG_WHERE,
} from '../common/utils/challenge-utils';
import { mapSong } from '../common/utils/song-mapper';
import { PrismaService } from '../prisma/prisma.service';
import { AiTaskService } from './ai-task.service';
import { MiniMaxService } from './minimax.service';

const TIME_SLOTS: Record<string, string> = {
  '0-5': 'radio_sleep',
  '5-9': 'radio_coffee',
  '9-12': 'radio_energy',
  '12-14': 'radio_lazy',
  '14-18': 'radio_work',
  '18-21': 'radio_sunset',
  '21-23': 'radio_city',
  '23-24': 'radio_rain',
};

export const HOST_PROFILE = {
  id: 'echo-host',
  name: 'Echo 主理人',
  avatarUrl: '/images/host.png',
  color: '#ea4c89',
  role: 'host',
  bio: '负责推荐灵感、策展作品和维护社区氛围。',
};

const HOST_VIBES = [
  {
    title: '通勤里的小宇宙',
    style: 'City pop / Indie pop / Warm',
    keyword: '上班路上、耳机、城市光线',
  },
  {
    title: '今天也有点想逃跑',
    style: 'Lo-fi / Bedroom pop / Soft',
    keyword: '疲惫、治愈、轻轻放过自己',
  },
  {
    title: '把普通日子唱亮',
    style: 'Pop / Funk / Bright',
    keyword: '快乐、生活碎片、可爱瞬间',
  },
  {
    title: '夜晚情绪收容所',
    style: 'R&B / Ambient / Emotional',
    keyword: '深夜、未发送的消息、心事',
  },
  {
    title: '给重要的人一首歌',
    style: 'Ballad / Folk / Tender',
    keyword: '告白、感谢、想念、陪伴',
  },
];

@Injectable()
export class HostService implements OnModuleInit {
  private hostDailyRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiTaskService: AiTaskService,
    private readonly miniMaxService: MiniMaxService,
  ) {}

  onModuleInit() {
    if (process.env.DISABLE_HOST_DAILY === 'true') return;

    setTimeout(() => {
      void this.runHostDaily().catch((error) => {
        this.hostDailyRunning = false;
        console.warn('[HostDaily] run failed:', error);
      });
    }, 8000);

    setInterval(() => {
      void this.runHostDaily().catch((error) => {
        this.hostDailyRunning = false;
        console.warn('[HostDaily] run failed:', error);
      });
    }, 60 * 60 * 1000);
  }

  async ensureHostUser(): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { id: HOST_PROFILE.id },
    });

    if (existing) {
      const needsUpdate =
        existing.name !== HOST_PROFILE.name ||
        existing.avatarUrl !== HOST_PROFILE.avatarUrl ||
        existing.color !== HOST_PROFILE.color ||
        existing.role !== HOST_PROFILE.role;

      if (!needsUpdate) return existing;

      return this.prisma.user.update({
        where: { id: HOST_PROFILE.id },
        data: {
          name: HOST_PROFILE.name,
          avatarUrl: HOST_PROFILE.avatarUrl,
          color: HOST_PROFILE.color,
          role: HOST_PROFILE.role,
        },
      });
    }

    const passwordHash = await bcrypt.hash(
      `system-host-${Date.now()}-${Math.random()}`,
      10,
    );

    return this.prisma.user.create({
      data: {
        id: HOST_PROFILE.id,
        name: HOST_PROFILE.name,
        avatarUrl: HOST_PROFILE.avatarUrl,
        color: HOST_PROFILE.color,
        role: HOST_PROFILE.role,
        passwordHash,
      },
    });
  }

  async runHostDaily() {
    if (this.hostDailyRunning) return { skipped: true, reason: 'running' };

    this.hostDailyRunning = true;
    try {
      await this.ensureHostUser();

      const day = this.todayKey();
      const existing = await this.prisma.hostContent.findFirst({
        where: { type: 'host_daily_topic', title: day, active: true },
      });

      const vibe = HOST_VIBES[Math.floor(Math.random() * HOST_VIBES.length)];
      const dailyState = existing
        ? this.parseDailyState(existing.content)
        : { day };
      const officialSong = dailyState.officialSongId
        ? null
        : await this.createDailyOfficialSong(vibe);
      const topic = dailyState.topicId
        ? null
        : await this.createDailyTopic(vibe);
      const pick = dailyState.pick ?? (await this.pickDailySong());
      const nextState = {
        ...dailyState,
        day,
        officialSongId:
          dailyState.officialSongId ?? officialSong?.id ?? null,
        topicId: dailyState.topicId ?? topic?.id ?? null,
        vibe: dailyState.vibe ?? vibe,
        pick,
      };

      if (existing) {
        await this.prisma.hostContent.update({
          where: { id: existing.id },
          data: {
            content: JSON.stringify(nextState),
            note: topic?.title ?? existing.note,
            color: HOST_PROFILE.color,
          },
        });
      } else {
        await this.prisma.hostContent.create({
          data: {
            type: 'host_daily_topic',
            title: day,
            content: JSON.stringify(nextState),
            note: topic?.title ?? pick?.title ?? day,
            color: HOST_PROFILE.color,
            active: true,
          },
        });
      }

      if (!officialSong && !topic && !pick) {
        return { skipped: true, reason: 'already_done' };
      }

      return {
        skipped: false,
        songId: officialSong?.id ?? dailyState.officialSongId ?? null,
        topicId: topic?.id ?? dailyState.topicId ?? null,
        pickId: pick?.songId ?? null,
      };
    } finally {
      this.hostDailyRunning = false;
    }
  }

  private async createDailyOfficialSong(vibe: (typeof HOST_VIBES)[number]) {
    const hostUser = await this.ensureHostUser();
    const plan = await this.miniMaxService
      .generateHostOfficialSong(vibe)
      .catch(() => ({
        title: vibe.title.slice(0, 12),
        style: vibe.style,
        lyrics: this.fallbackHostLyrics(vibe),
      }));

    return this.aiTaskService.createGeneratedSong(
      {
        title: plan.title.slice(0, 24) || vibe.title,
        style: plan.style || vibe.style,
        lyrics: plan.lyrics || this.fallbackHostLyrics(vibe),
        mode: 'song',
        prompt: vibe.title,
        isInstrumental: false,
      },
      hostUser,
      {
        fileKey: `host_${this.todayKey()}`,
        status: 'published',
        published: true,
        publishedAt: new Date(),
        hostPick: true,
      },
    );
  }

  private async pickDailySong() {
    const songs = await this.prisma.song.findMany({
      where: {
        published: true,
        status: 'published',
        authorId: { not: HOST_PROFILE.id },
      },
    });

    const freshSongs = songs.filter(
      (song) =>
        !song.hostPicked &&
        Date.now() - song.createdAt.getTime() < 3 * 24 * 60 * 60 * 1000,
    );
    const candidates = freshSongs.length ? freshSongs : songs;
    const target = candidates[Math.floor(Math.random() * candidates.length)];

    if (!target) return null;

    const comment = await this.miniMaxService
      .generateHostPickComment({
        title: target.title,
        style: target.style,
        lyrics: target.lyrics ?? undefined,
        authorName: target.authorName ?? undefined,
      })
      .catch(() => ({
        text: `这首《${target.title}》有一种很真诚的表达，值得被更多人听见。`,
      }));

    const text = `【主理人翻牌】${comment.text}`;

    await this.prisma.$transaction([
      this.prisma.comment.create({
        data: {
          songId: target.id,
          userId: HOST_PROFILE.id,
          userName: HOST_PROFILE.name,
          userColor: HOST_PROFILE.color,
          text,
          anon: false,
        },
      }),
      this.prisma.song.update({
        where: { id: target.id },
        data: {
          hostPicked: true,
          commentCount: { increment: 1 },
        },
      }),
    ]);

    return {
      songId: target.id,
      title: target.title,
      author: target.authorName,
      reason: comment.text,
    };
  }

  private parseDailyState(content: string): {
    day?: string;
    officialSongId?: string | null;
    topicId?: string | null;
    vibe?: (typeof HOST_VIBES)[number];
    pick?: {
      songId: string;
      title?: string;
      author?: string | null;
      reason?: string;
    } | null;
  } {
    try {
      const parsed = JSON.parse(content) as {
        day?: string;
        officialSongId?: string | null;
        topicId?: string | null;
        vibe?: (typeof HOST_VIBES)[number];
        pick?: {
          songId: string;
          title?: string;
          author?: string | null;
          reason?: string;
        } | null;
      };
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  async getHostPage() {
    await this.ensureHostUser();

    const day = this.todayKey();
    const [dailyContent, featuredSong, topics, featuredSongs, stats] =
      await Promise.all([
        this.prisma.hostContent.findFirst({
          where: { type: 'host_daily_topic', title: day, active: true },
        }),
      this.prisma.song.findFirst({
        where: { hostPick: true, published: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.challenge.findMany({
        where: { active: true, status: 'active', createdBy: 'host' },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.song.findMany({
        where: { hostPick: true, published: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.song.aggregate({
        _count: { id: true },
        _sum: { likes: true, plays: true },
        where: { hostPick: true },
      }),
    ]);
    const dailyState = dailyContent
      ? this.parseDailyState(dailyContent.content)
      : {};
    const pickedSong = dailyState.pick?.songId
      ? await this.prisma.song.findUnique({
          where: { id: dailyState.pick.songId },
        })
      : null;

    return {
      name: HOST_PROFILE.name,
      avatarUrl: HOST_PROFILE.avatarUrl,
      bio: HOST_PROFILE.bio,
      stats: {
        featuredCount: stats._count.id,
        totalLikes: stats._sum.likes || 0,
        totalPlays: stats._sum.plays || 0,
      },
      todayPick: pickedSong
        ? {
            ...mapSong(pickedSong),
            quote: dailyState.pick?.reason ?? this.generatePickQuote(pickedSong.title),
          }
        : featuredSong
        ? {
            ...mapSong(featuredSong),
            quote: this.generatePickQuote(featuredSong.title),
          }
        : null,
      topics: topics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        prompt: topic.desc,
      })),
      featuredSongs: featuredSongs.map((song) => mapSong(song)),
      greeting: this.buildGreeting(),
    };
  }

  async getCuration() {
    const [content, featuredSong, recommendations] = await Promise.all([
      this.prisma.hostContent.findFirst({
        where: { active: true, type: 'curation' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.song.findFirst({
        where: { hostPick: true, published: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.song.findMany({
        where: { published: true, status: 'published' },
        orderBy: { likes: 'desc' },
        take: 6,
      }),
    ]);

    return {
      hostNote: content?.content ?? '今晚适合听一点柔软的声音。',
      featuredSong: featuredSong ? mapSong(featuredSong) : null,
      recommendations: recommendations.map((song) => mapSong(song)),
    };
  }

  async getChallenges() {
    const list = await this.prisma.challenge.findMany({
      where: { active: true, status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: publishedChallengeSongCountInclude,
    });

    return {
      list: list.map(mapChallengeListItem),
    };
  }

  async getChallengeDetail(challengeId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      include: publishedChallengeSongCountInclude,
    });

    if (!challenge) {
      throw new NotFoundException('话题不存在');
    }

    const songs = await this.prisma.song.findMany({
      where: {
        challengeId,
        ...PUBLISHED_CHALLENGE_SONG_WHERE,
      },
      orderBy: { createdAt: 'desc' },
    });

    const participantMap = new Map<
      string,
      { id: string; nickname: string; songCount: number }
    >();

    for (const song of songs) {
      if (!song.authorId) continue;

      const existing = participantMap.get(song.authorId);
      if (existing) {
        existing.songCount += 1;
        continue;
      }

      participantMap.set(song.authorId, {
        id: song.authorId,
        nickname: song.authorName ?? '创作者',
        songCount: 1,
      });
    }

    return {
      challenge: mapChallengeListItem(challenge),
      songs: songs.map((song) => ({
        id: song.id,
        title: song.title,
        style: song.style,
        audioUrl: song.audioUrl,
        coverUrl: song.coverImg ?? song.cover,
        author: song.authorId
          ? {
              id: song.authorId,
              nickname: song.authorName ?? '创作者',
            }
          : null,
        createdAt: song.createdAt.toISOString(),
      })),
      participants: Array.from(participantMap.values()),
    };
  }

  async getRadio() {
    const hour = new Date().getHours();
    const currentId =
      hour < 5
        ? 'radio_sleep'
        : hour < 9
          ? 'radio_coffee'
          : hour < 12
            ? 'radio_energy'
            : hour < 14
              ? 'radio_lazy'
              : hour < 18
                ? 'radio_work'
                : hour < 21
                  ? 'radio_sunset'
                  : hour < 23
                    ? 'radio_city'
                    : 'radio_rain';

    const themes = await this.prisma.radioTheme.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });

    let currentTheme = themes.find((theme) => theme.id === currentId);
    if (!currentTheme) {
      currentTheme = themes[0] || {
        id: currentId,
        name: '深夜雨声',
        emoji: '雨',
        prompt: 'Lo-fi, rainy night, calm, chill, study beats',
        active: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return {
      greeting: `${this.buildGreeting()} AI 即兴生成专属纯音乐。`,
      live: true,
      current: { ...currentTheme, isNowRecommend: true },
      themes,
      timeSlots: TIME_SLOTS,
    };
  }

  private async createDailyTopic(vibe: (typeof HOST_VIBES)[number]) {
    const generated = await this.miniMaxService
      .generateHostTopic(vibe)
      .catch(() => ({
        title: vibe.title,
        emoji: '♪',
        desc: `用 ${vibe.keyword} 写一首歌，风格可以靠近 ${vibe.style}。`,
      }));

    const topic = await this.prisma.challenge.create({
      data: {
        title: generated.title.slice(0, 24) || vibe.title,
        desc: generated.desc.slice(0, 80) || vibe.keyword,
        emoji: generated.emoji.slice(0, 4) || '♪',
        color: HOST_PROFILE.color,
        createdBy: 'host',
        status: 'active',
        active: true,
      },
    });

    const staleTopics = await this.prisma.challenge.findMany({
      where: { createdBy: 'host' },
      orderBy: { createdAt: 'desc' },
      skip: 5,
      select: { id: true },
    });

    if (staleTopics.length) {
      await this.prisma.challenge.updateMany({
        where: { id: { in: staleTopics.map((topic) => topic.id) } },
        data: { active: false, status: 'archived' },
      });
    }

    return topic;
  }

  private generatePickQuote(title: string): string {
    const quotes = [
      `《${title}》是今日最想分享的声音。`,
      `循环播放中：${title}`,
      `这一首，送给此刻的你：《${title}》。`,
      `今日翻牌：${title}，希望你喜欢。`,
      `${title} · 主理人推荐`,
    ];

    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  private buildGreeting() {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了，适合听一点安静的声音。';
    if (hour < 12) return '早上好，今天也要好好听音乐。';
    if (hour < 18) return '下午好，来一首放松的歌吧。';
    return '晚上好，适合听一点城市夜景。';
  }

  private fallbackHostLyrics(vibe: (typeof HOST_VIBES)[number]) {
    const firstKeyword = vibe.keyword.split(/[、,，\s]/).filter(Boolean)[0] ?? vibe.title;

    return `[Verse]
${firstKeyword}落在今天的窗
我把心事调成最轻的光
一个人也能走得很稳当
这一刻是自己的主场

[Chorus]
就让这首歌替我说出口
那些没说的都在旋律里停留
${vibe.title}是今天的暗号
听见的人都会刚刚好

[Verse]
街灯慢慢替夜晚点名
谁的脚步和我同一个频
不必认识也算彼此证明
我们都在努力前行

[Bridge]
如果今天有一点累
就把音量调到最大一回

[Chorus]
就让这首歌替我说出口
那些没说的都在旋律里停留
${vibe.title}是今天的暗号
听见的人都会刚刚好`;
  }

  private todayKey() {
    return new Date().toISOString().slice(0, 10);
  }
}
