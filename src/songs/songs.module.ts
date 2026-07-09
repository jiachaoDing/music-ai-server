import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import {
  MeSongsController,
  PlayController,
  PublishController,
  SongController,
} from './songs.controller';
import { SongsController } from './songs-generate.controller';
import { SongsService } from './songs.service';

@Module({
  imports: [AiModule],
  controllers: [
    SongsController,
    SongController,
    MeSongsController,
    PublishController,
    PlayController,
  ],
  providers: [SongsService],
  exports: [SongsService],
})
export class SongsModule {}
