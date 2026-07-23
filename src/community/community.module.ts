import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';

@Module({
  imports: [AiModule],
  controllers: [CommunityController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}
