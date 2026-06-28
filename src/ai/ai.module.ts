import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { MiniMaxService } from './minimax.service';

@Module({
  controllers: [AiController],
  providers: [MiniMaxService],
})
export class AiModule {}
