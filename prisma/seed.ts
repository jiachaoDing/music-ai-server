import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.DATABASE_URL ??
      'postgresql://music_ai:music_ai@localhost:5432/music_ai?schema=public',
  }),
});

async function main() {
  const adminId = 'bootstrap_admin';
  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { id: adminId },
    update: {},
    create: {
      id: adminId,
      name: 'admin',
      passwordHash,
      role: 'admin',
      points: 9999,
    },
  });

  await prisma.inviteCode.upsert({
    where: { code: 'ECHO-2026' },
    update: {},
    create: {
      id: 'bootstrap_invite',
      code: 'ECHO-2026',
      createdBy: adminId,
      status: 'unused',
    },
  });

  const radioThemes = [
    { id: 'radio_rain', emoji: '🌧', name: '深夜雨声', prompt: 'Lo-fi, rainy night, calm, chill, study beats', sortOrder: 1 },
    { id: 'radio_coffee', emoji: '☕️', name: '清晨咖啡', prompt: 'warm jazz, morning coffee, relaxing, soft piano', sortOrder: 2 },
    { id: 'radio_work', emoji: '💻', name: '专注工作', prompt: 'ambient, focus, minimal, steady, concentration', sortOrder: 3 },
    { id: 'radio_space', emoji: '🪐', name: '宇宙漫游', prompt: 'cinematic space ambient, dreamy, ethereal, synth', sortOrder: 4 },
    { id: 'radio_heal', emoji: '🌿', name: '解压治愈', prompt: 'healing, soft pad, meditation, peaceful, nature', sortOrder: 5 },
    { id: 'radio_fire', emoji: '🔥', name: '燃起来', prompt: 'epic electronic, energetic, workout, driving beat', sortOrder: 6 },
    { id: 'radio_forest', emoji: '🌲', name: '雨后森林', prompt: 'forest ambient, birdsong, calm, organic, natural', sortOrder: 7 },
    { id: 'radio_city', emoji: '🌃', name: '城市夜景', prompt: 'synthwave, city night, neon, retro, cruising', sortOrder: 8 },
    { id: 'radio_lazy', emoji: '🛋', name: '午后慵懒', prompt: 'bossa nova, lazy afternoon, warm, mellow, cozy', sortOrder: 9 },
    { id: 'radio_sunset', emoji: '🌅', name: '海边日落', prompt: 'tropical chill, sunset, beach, soft guitar, breezy', sortOrder: 10 },
    { id: 'radio_retro', emoji: '📼', name: '复古胶片', prompt: 'vintage lo-fi, vinyl, nostalgic, warm tape, retro', sortOrder: 11 },
    { id: 'radio_sleep', emoji: '😴', name: '安睡入眠', prompt: 'sleep ambient, soft drone, gentle, dreamy, slow', sortOrder: 12 },
    { id: 'radio_fireplace', emoji: '🪵', name: '雪夜炉火', prompt: 'cozy piano, winter night, fireplace, warm, intimate', sortOrder: 13 },
    { id: 'radio_energy', emoji: '🌈', name: '元气满满', prompt: 'happy ukulele, upbeat, sunny, cheerful, light pop', sortOrder: 14 },
  ];

  for (const theme of radioThemes) {
    await prisma.radioTheme.upsert({
      where: { id: theme.id },
      update: {},
      create: theme,
    });
  }

  console.log('Seed done: admin user + invite code ECHO-2026 + 14 radio themes');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
