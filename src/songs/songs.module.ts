import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SongsController } from './songs.controller';
import { SongsService } from './songs.service';

@Module({
  imports: [AiModule, PrismaModule],
  controllers: [SongsController],
  providers: [SongsService],
})
export class SongsModule {}
