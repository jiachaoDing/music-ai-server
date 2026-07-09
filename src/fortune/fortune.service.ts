import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from '../admin/admin.service';

const STREAK_BADGES = [
  { days: 3, name: '初心萌芽', emoji: '🌱' },
  { days: 7, name: '一周自洽', emoji: '🌤' },
  { days: 15, name: '半月发光', emoji: '✨' },
  { days: 30, name: '月度回声', emoji: '🌙' },
  { days: 100, name: '百日同行', emoji: '🏆' },
];

function mapFortune(fortune: {
  id: string;
  userId: string;
  date: string;
  keyword: string;
  mood: unknown;
  battery: number;
  luckyColor: unknown;
  luckyNumber: number;
  peak?: string | null;
  encourage?: string | null;
  action?: string | null;
  dos?: unknown;
  donts?: unknown;
  recharge?: string | null;
  img?: string | null;
  imgGenerating?: boolean;
  streak: number;
  songId?: string | null;
  songTitle?: string | null;
  createdAt: Date;
}) {
  const mood = (fortune.mood as Record<string, string> | null) ?? {
    emoji: '🌤',
    name: '晴后微光',
    color: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
    stylePrompt: '治愈, Lo-fi, 轻松',
  };
  const luckyColor = (fortune.luckyColor as { name: string; hex: string }) ?? {
    name: '薄荷绿',
    hex: '#86efac',
  };

  const currentBadge = [...STREAK_BADGES]
    .reverse()
    .find((b) => fortune.streak >= b.days);
  const nextBadge = STREAK_BADGES.find((b) => fortune.streak < b.days);

  return {
    id: fortune.id,
    userId: fortune.userId,
    date: fortune.date,
    keyword: fortune.keyword,
    mood,
    battery: fortune.battery,
    luckyColor,
    luckyNumber: fortune.luckyNumber,
    peak: fortune.peak ?? '20:00-22:00',
    encourage: fortune.encourage ?? '今天也要好好听音乐',
    action: fortune.action ?? '听一首喜欢的歌',
    dos: (fortune.dos as string[] | null) ?? ['听一首轻快的歌', '早点休息'],
    donts: (fortune.donts as string[] | null) ?? ['过度纠结', '临时改计划'],
    recharge: fortune.recharge ?? '散步十分钟',
    img: fortune.img ?? '',
    imgGenerating: fortune.imgGenerating ?? false,
    streak: fortune.streak,
    streakBadge: {
      name: currentBadge?.name ?? '',
      emoji: currentBadge?.emoji ?? '',
      nextName: nextBadge?.name ?? '',
      nextEmoji: nextBadge?.emoji ?? '',
      daysToNext: nextBadge ? nextBadge.days - fortune.streak : 0,
    },
    songId: fortune.songId,
    songTitle: fortune.songTitle,
    createdAt: fortune.createdAt.toISOString(),
  };
}

@Injectable()
export class FortuneService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
  ) {}

  private today() {
    return new Date().toISOString().slice(0, 10);
  }

  async getDayFortune(user: User) {
    const date = this.today();
    const existing = await this.prisma.fortune.findUnique({
      where: { userId_date: { userId: user.id, date } },
    });
    if (existing) return { fortune: mapFortune(existing) };

    await this.adminService.deductPoints(user.id, -1, '时运曲').catch(() => null);

    const keyword = ['温柔', '勇敢', '松弛', '专注', '浪漫'][
      Math.floor(Math.random() * 5)
    ];

    const fortune = await this.prisma.fortune.create({
      data: {
        userId: user.id,
        date,
        keyword,
        mood: {
          emoji: '🌤',
          name: '晴后微光',
          color: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
          stylePrompt: '治愈, Lo-fi, 轻松',
        },
        battery: 75 + Math.floor(Math.random() * 20),
        luckyColor: { name: '薄荷绿', hex: '#86efac' },
        luckyNumber: Math.floor(Math.random() * 9) + 1,
        peak: '20:00-22:00',
        encourage: '今天适合慢慢把事情理顺。',
        action: '整理一个待完成的小任务',
        dos: ['听一首轻快的歌', '早点休息'],
        donts: ['过度纠结', '临时改计划'],
        recharge: '散步十分钟',
        streak: user.streak + 1,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        streak: user.streak + 1,
        lastCheckin: date,
      },
    });

    return { fortune: mapFortune(fortune) };
  }

  getDayArt() {
    const seed = this.today();
    return {
      imageUrl: `https://picsum.photos/seed/${seed}/600/800`,
    };
  }

  async getFortunes(user: User, month: string) {
    const [list, currentUser] = await Promise.all([
      this.prisma.fortune.findMany({
        where: {
          userId: user.id,
          date: { startsWith: month },
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.user.findUnique({
        where: { id: user.id },
        select: { streak: true },
      }),
    ]);

    return {
      month,
      streak: currentUser?.streak ?? 0,
      list: list.map(mapFortune),
    };
  }
}
