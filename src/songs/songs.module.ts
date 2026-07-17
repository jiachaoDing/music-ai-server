import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AudioStorageService } from '../common/services/audio-storage.service';
import { CoverStorageService } from '../common/services/cover-storage.service';
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
  providers: [SongsService, CoverStorageService, AudioStorageService],
  exports: [SongsService],
})
export class SongsModule {}

