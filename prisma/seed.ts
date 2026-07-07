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

  console.log('Seed done: admin user + invite code ECHO-2026');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
