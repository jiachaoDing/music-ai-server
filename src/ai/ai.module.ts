import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AudioStorageService } from '../common/services/audio-storage.service';
import { CoverStorageService } from '../common/services/cover-storage.service';
import { PosterService } from '../common/services/poster.service';
import { AiController } from './ai.controller';
import { AiConcurrencyService } from './ai-concurrency.service';
import { AiMockService } from './ai-mock.service';
import { AiPublicController } from './ai-public.controller';
import { AiTaskService } from './ai-task.service';
import { HostService } from './host.service';
import { MiniMaxService } from './minimax.service';

@Module({
  imports: [AdminModule],
  controllers: [AiController, AiPublicController],
  providers: [
    MiniMaxService,
    AiConcurrencyService,
    AiMockService,
    AiTaskService,
    HostService,
    AudioStorageService,
    CoverStorageService,
    PosterService,
  ],
  exports: [MiniMaxService, AiConcurrencyService, AiTaskService, HostService],
})
export class AiModule {}
