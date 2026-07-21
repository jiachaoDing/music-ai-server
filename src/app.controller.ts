import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { GenerateSongDto } from './dto/generate-song.dto';

export const AI_QUEUE_STATUS_SERVICE = 'AI_QUEUE_STATUS_SERVICE';

type QueueStatusService = {
  getQueueStatus(): unknown;
};

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(AI_QUEUE_STATUS_SERVICE)
    private readonly queueStatusService: QueueStatusService,
  ) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('api/status')
  getStatus() {
    return this.queueStatusService.getQueueStatus();
  }

  @Get('api/songs')
  getSongs() {
    return this.appService.getSongs();
  }

  @Post('api/generate/mock')
  generateMock(@Body() dto: GenerateSongDto) {
    return this.appService.generateMock(dto);
  }
}
