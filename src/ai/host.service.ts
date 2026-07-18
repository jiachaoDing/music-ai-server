import { Injectable } from '@nestjs/common';
import { mapSong, mapSongBrief } from '../common/utils/song-mapper';
import { PrismaService } from '../prisma/prisma.service';

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

@Injectable()
export class HostService {
  constructor(private readonly prisma: PrismaService) {}

  async getHostPage() {
    const [featuredSong, topics, featuredSongs, stats] = await Promise.all([
      this.prisma.song.findFirst({
        where: { hostPick: true, published: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.challenge.findMany({
        where: { active: true },
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

    return {
      name: 'Echo 主理人',
      avatarUrl: '/images/host.png',
      bio: '负责推荐灵感、策展作品和维护社区氛围',
      stats: {
        featuredCount: featuredSongs.length,
        totalLikes: stats._sum.likes || 0,
        totalPlays: stats._sum.plays || 0,
      },
      todayPick: featuredSong
        ? {
            ...mapSong(featuredSong),
            quote: this.generatePickQuote(featuredSong.title),
          }
        : null,
      topics: topics.map((t) => ({
        id: t.id,
        title: t.title,
        prompt: t.desc,
      })),
      featuredSongs: featuredSongs.map((s) => mapSong(s)),
      greeting: this.buildGreeting(),
    };
  }

  private generatePickQuote(title: string): string {
    const quotes = [
      `「${title}」—— 今日最想分享的声音。`,
      `循环播放中：${title}`,
      `这一首，送给此刻的你。《${title}》`,
      `今日翻牌：${title}，希望你喜欢。`,
      `🎧 ${title} · 主理人推荐`,
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
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
      recommendations: recommendations.map((s) => mapSong(s)),
    };
  }

  async getChallenges() {
    const list = await this.prisma.challenge.findMany({
      where: { active: true, status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { songs: true } } },
    });
    return {
      list: list.map((c) => ({
        id: c.id,
        title: c.title,
        prompt: c.desc,
        songCount: c._count.songs,
      })),
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

    let currentTheme = themes.find((t) => t.id === currentId);
    if (!currentTheme) {
      currentTheme = themes[0] || {
        id: currentId,
        name: '深夜雨声',
        emoji: '🌧',
        prompt: 'Lo-fi, rainy night, calm, chill, study beats',
      };
    }

    return {
      greeting: `${this.buildGreeting()} AI 即兴生成专属纯音乐`,
      live: true,
      current: { ...currentTheme, isNowRecommend: true },
      themes,
      timeSlots: TIME_SLOTS,
    };
  }

  private buildGreeting() {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了，适合听一点安静的声音。';
    if (hour < 12) return '早上好，今天也要好好听音乐。';
    if (hour < 18) return '下午好，来一首放松的歌吧。';
    return '晚上好，适合听一点城市夜景。';
  }
}
