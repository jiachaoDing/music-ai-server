import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { FortuneController } from './fortune.controller';
import { FortuneService } from './fortune.service';

@Module({
  imports: [AdminModule],
  controllers: [FortuneController],
  providers: [FortuneService],
})
export class FortuneModule {}
