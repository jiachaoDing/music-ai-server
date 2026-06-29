import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const DEFAULT_DATABASE_URL =
  'postgresql://music_ai:music_ai@localhost:5432/music_ai?schema=public';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
      }),
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
