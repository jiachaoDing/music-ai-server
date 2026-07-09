import { Injectable } from '@nestjs/common';
import { mapSong, mapSongBrief } from '../common/utils/song-mapper';
import { PrismaService } from '../prisma/prisma.service';

const RADIO_THEMES = [
  { id: 'radio_rain', emoji: '🌧', name: '深夜雨声', prompt: 'Lo-fi, rainy night, calm, chill, study beats' },
  { id: 'radio_coffee', emoji: '☕️', name: '清晨咖啡', prompt: 'warm jazz, morning coffee, relaxing, soft piano' },
  { id: 'radio_work', emoji: '💻', name: '专注工作', prompt: 'ambient, focus, minimal, steady, concentration' },
  { id: 'radio_space', emoji: '🪐', name: '宇宙漫游', prompt: 'cinematic space ambient, dreamy, ethereal, synth' },
  { id: 'radio_heal', emoji: '🌿', name: '解压治愈', prompt: 'healing, soft pad, meditation, peaceful, nature' },
  { id: 'radio_fire', emoji: '🔥', name: '燃起来', prompt: 'epic electronic, energetic, workout, driving beat' },
  { id: 'radio_forest', emoji: '🌲', name: '雨后森林', prompt: 'forest ambient, birdsong, calm, organic, natural' },
  { id: 'radio_city', emoji: '🌃', name: '城市夜景', prompt: 'synthwave, city night, neon, retro, cruising' },
  { id: 'radio_lazy', emoji: '🛋', name: '午后慵懒', prompt: 'bossa nova, lazy afternoon, warm, mellow, cozy' },
  { id: 'radio_sunset', emoji: '🌅', name: '海边日落', prompt: 'tropical chill, sunset, beach, soft guitar, breezy' },
  { id: 'radio_retro', emoji: '📼', name: '复古胶片', prompt: 'vintage lo-fi, vinyl, nostalgic, warm tape, retro' },
  { id: 'radio_sleep', emoji: '😴', name: '安睡入眠', prompt: 'sleep ambient, soft drone, gentle, dreamy, slow' },
  { id: 'radio_fireplace', emoji: '🪵', name: '雪夜炉火', prompt: 'cozy piano, winter night, fireplace, warm, intimate' },
  { id: 'radio_energy', emoji: '🌈', name: '元气满满', prompt: 'happy ukulele, upbeat, sunny, cheerful, light pop' },
];

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
    const [featuredSong, topics, featuredSongs] = await Promise.all([
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
    ]);

    return {
      name: 'Echo 主理人',
      avatarUrl: '/images/host.png',
      bio: '负责推荐灵感、策展作品和维护社区氛围',
      todayPick: featuredSong ? mapSong(featuredSong) : null,
      topics: topics.map((t) => ({
        id: t.id,
        title: t.title,
        prompt: t.desc,
      })),
      featuredSongs: featuredSongs.map((s) => mapSong(s)),
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
      recommendations: recommendations.map((s) => mapSong(s)),
    };
  }

  async getChallenges() {
    const list = await this.prisma.challenge.findMany({
      where: { active: true, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    return {
      list: list.map((c) => ({
        id: c.id,
        title: c.title,
        prompt: c.desc,
      })),
    };
  }

  getRadio() {
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

    const currentTheme = RADIO_THEMES.find((t) => t.id === currentId)!;

    return {
      greeting: `${this.buildGreeting()} AI 即兴生成专属纯音乐`,
      live: true,
      current: { ...currentTheme, isNowRecommend: true },
      themes: RADIO_THEMES,
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
