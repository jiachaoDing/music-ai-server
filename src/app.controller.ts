import { Body, Controller, Get, Post } from '@nestjs/common';
import { AiTaskService } from './ai/ai-task.service';
import { AppService } from './app.service';
import { GenerateSongDto } from './dto/generate-song.dto';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly aiTaskService: AiTaskService,
  ) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('api/status')
  getStatus() {
    return this.aiTaskService.getQueueStatus();
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
