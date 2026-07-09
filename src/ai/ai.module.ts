import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AiController } from './ai.controller';
import { AiMockService } from './ai-mock.service';
import { AiPublicController } from './ai-public.controller';
import { AiTaskService } from './ai-task.service';
import { HostService } from './host.service';
import { MiniMaxService } from './minimax.service';

@Module({
  imports: [AdminModule],
  controllers: [AiController, AiPublicController],
  providers: [MiniMaxService, AiMockService, AiTaskService, HostService],
  exports: [MiniMaxService, AiTaskService, HostService],
})
export class AiModule {}
