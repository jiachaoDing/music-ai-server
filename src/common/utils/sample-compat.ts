export type SampleMood = {
  t: string;
  s: string;
  emoji: string;
  color: string;
};

const SAMPLE_MOODS: SampleMood[] = [
  {
    t: 'good luck',
    s: 'uplifting pop, bright, sunshine, hopeful',
    emoji: '*',
    color: 'linear-gradient(135deg,#fa709a,#fee140)',
  },
  {
    t: 'gentle healing',
    s: 'healing, warm acoustic, gentle, soft piano',
    emoji: '~',
    color: 'linear-gradient(135deg,#43e97b,#38f9d7)',
  },
  {
    t: 'high energy',
    s: 'epic, energetic, motivational, driving beat',
    emoji: '!',
    color: 'linear-gradient(135deg,#f093fb,#f5576c)',
  },
  {
    t: 'dreamy romance',
    s: 'romantic, dreamy pop, sweet, lovely',
    emoji: '+',
    color: 'linear-gradient(135deg,#ff9a9e,#fecfef)',
  },
  {
    t: 'quiet focus',
    s: 'lo-fi, calm, chill, mellow, reflective',
    emoji: '.',
    color: 'linear-gradient(135deg,#30cfd0,#330867)',
  },
  {
    t: 'creative spark',
    s: 'creative electronic, futuristic, inspiring synth',
    emoji: '^',
    color: 'linear-gradient(135deg,#4facfe,#00f2fe)',
  },
];

const PEAK_SLOTS = [
  'morning 7-9',
  'late morning 10-12',
  'afternoon 2-4',
  'evening 5-7',
  'night 9-11',
  'late night after 11',
];

const RECHARGE_TIPS = [
  'take a quiet walk',
  'make a warm drink',
  'cook a simple meal',
  'listen to one song alone',
  'write down today in a few lines',
  'turn on do-not-disturb',
  'watch one favorite episode',
  'tidy one corner of the room',
];

const LUCKY_COLORS = [
  { name: 'warm clay', hex: '#e8a87c' },
  { name: 'mist blue', hex: '#8ab6d6' },
  { name: 'moss green', hex: '#8aa87b' },
  { name: 'oat', hex: '#e6dccb' },
  { name: 'lavender', hex: '#b9a3d6' },
  { name: 'soft pink', hex: '#f3b6b6' },
  { name: 'deep sea', hex: '#3a4a63' },
  { name: 'caramel', hex: '#d98e54' },
  { name: 'mint', hex: '#9bd6c4' },
];

const STREAK_BADGES = [
  { days: 3, name: 'first spark', emoji: '*' },
  { days: 7, name: 'one week', emoji: '+' },
  { days: 15, name: 'half month', emoji: '^' },
  { days: 30, name: 'monthly echo', emoji: '#' },
  { days: 100, name: 'hundred days', emoji: '@' },
];

function hashStr(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickMood(name: string, day: string) {
  const hash = hashStr(`${name}|${day}`);
  return {
    hash,
    mood: SAMPLE_MOODS[hash % SAMPLE_MOODS.length],
  };
}

function buildStreakBadge(streak: number) {
  const currentBadge = [...STREAK_BADGES]
    .reverse()
    .find((badge) => streak >= badge.days);
  const nextBadge = STREAK_BADGES.find((badge) => streak < badge.days);
  return {
    name: currentBadge?.name ?? '',
    emoji: currentBadge?.emoji ?? '',
    nextName: nextBadge?.name ?? '',
    nextEmoji: nextBadge?.emoji ?? '',
    daysToNext: nextBadge ? nextBadge.days - streak : 0,
  };
}

export function buildSampleFortune(name: string, day: string) {
  const { hash, mood } = pickMood(name, day);
  const battery = 28 + (hash % 70);
  const luckyColor = LUCKY_COLORS[(hash >>> 11) % LUCKY_COLORS.length];
  const luckyNumber = ((hash >>> 17) % 9) + 1;
  const peak = PEAK_SLOTS[(hash >>> 5) % PEAK_SLOTS.length];
  const recharge = RECHARGE_TIPS[(hash >>> 9) % RECHARGE_TIPS.length];

  const fortune = {
    id: `fortune_${day.replaceAll('-', '')}`,
    userId: '',
    date: day,
    keyword: mood.t,
    mood,
    battery,
    luckyColor,
    luckyNumber,
    peak,
    encourage:
      battery < 45
        ? 'Low energy is allowed today. Keep your pace quiet.'
        : 'Today has a steady rhythm. Follow your own pace.',
    action:
      battery < 45
        ? 'Keep one uninterrupted quiet hour for yourself.'
        : 'Pick one small thing and finish it calmly.',
    dos: ['do something that recharges you', 'enjoy a quiet moment alone'],
    donts: ['force unnecessary social time', 'overreact to minor messages'],
    recharge,
    img: '',
    imgGenerating: false,
    streak: 0,
    streakBadge: buildStreakBadge(0),
    songId: undefined,
    songTitle: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    ...fortune,
    name,
    day,
    title: `${name}'s daily song`,
    award: 0,
    points: 0,
    fortune,
  };
}

export function buildSampleDayFortune(name: string, day: string) {
  return buildSampleFortune(name, day);
}

export function buildSampleFortuneCard(name: string, day: string) {
  const { hash, mood } = pickMood(name, day);
  const stars = 3 + ((hash >>> 3) % 3);
  return {
    name,
    day,
    mood,
    stars,
    sign: `Loop one song around ${mood.t} today.`,
    title: `${name}'s daily song`,
  };
}

export function buildSampleDayLyric(input: {
  name: string;
  keyword: string;
  encourage: string;
  mood: string;
}) {
  const mood =
    SAMPLE_MOODS.find((item) => item.t === input.mood) ?? SAMPLE_MOODS[1];
  const title = `${input.name || 'traveler'} daily song`;
  const style = `${mood.s}, warm, intimate`;
  const keyword = input.keyword || 'today';
  const encourage = input.encourage || 'take your time';
  const lyrics = `[Verse]
${keyword} rests beside the window
I tune my thoughts to something low
${encourage}
Step by step, I let it go

[Chorus]
Let this moment belong to me
No need to rush, no need to prove
${keyword} becomes a little light
Slowly lighting up the room`;

  return { title, style, lyrics };
}

export function buildSampleDayArt(name: string, day: string) {
  const seed = encodeURIComponent(`${name}|${day}`);
  return { img: `https://picsum.photos/seed/${seed}/600/800` };
}

export const SAMPLE_MAX_CONCURRENCY = Number(
  process.env.MAX_AI_CONCURRENCY || process.env.MAX_CONCURRENCY || 2,
);

export function buildSampleTaskPayload(input: {
  taskId?: string;
  status: string;
  song?: unknown;
  album?: unknown;
  stage?: string | null;
  error?: string | null;
  progress?: number;
  queuePos?: number;
  queueAhead?: number;
  active?: number;
  maxConcurrency?: number;
  result?: unknown;
}) {
  const queueAhead = input.queueAhead ?? input.queuePos ?? 0;
  return {
    taskId: input.taskId,
    status: input.status,
    song: input.song ?? null,
    album: input.album ?? null,
    stage: input.stage ?? null,
    description:
      input.status === 'queued' ? `There are ${queueAhead} tasks ahead` : null,
    progress: input.progress ?? 0,
    error: input.error ?? null,
    queuePos: queueAhead,
    queueAhead,
    active: input.active ?? 0,
    maxConcurrency: input.maxConcurrency ?? SAMPLE_MAX_CONCURRENCY,
    result: input.result ?? null,
  };
}

export function buildSampleAlbumPayload(input: {
  album: {
    id: string;
    title: string;
    description?: string | null;
    coverUrl?: string | null;
    authorId: string;
    authorName?: string | null;
    trackCount: number;
    createdAt: Date;
  };
  tracks: Array<Record<string, unknown>>;
}) {
  const album = input.album;
  return {
    album: {
      id: album.id,
      title: album.title,
      name: album.title,
      description: album.description ?? '',
      intro: album.description ?? '',
      coverUrl: album.coverUrl ?? null,
      authorId: album.authorId,
      author: album.authorName ?? '',
      trackCount: album.trackCount,
      total: album.trackCount,
      createdAt: album.createdAt.toISOString(),
    },
    tracks: input.tracks,
    songs: input.tracks,
  };
}

export function buildSampleAdminStats(input: {
  users: number;
  newUsersToday: number;
  checkinsToday: number;
  songs: number;
  totalPoints: number;
  totalPlays: number;
  totalLikes: number;
  invitesTotal: number;
  invitesUsed: number;
  invitesFree: number;
  commentsTotal: number;
}) {
  return {
    ...input,
    econ: {
      checkin: 0,
      streak: {},
      signup: 0,
      invitedBonus: 0,
      cost: {
        song: 2,
        cover: 1,
        photo: 2,
        radio: 1,
        album: 5,
      },
    },
  };
}
