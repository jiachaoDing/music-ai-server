import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { GenerateSongDto } from './dto/generate-song.dto';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: '服务健康检查' })
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('api/songs')
  @ApiTags('songs')
  @ApiOperation({ summary: '获取歌曲列表' })
  getSongs() {
    return this.appService.getSongs();
  }

  @Post('api/generate/mock')
  @ApiTags('generate')
  @ApiOperation({ summary: 'mock AI 音乐生成' })
  generateMock(@Body() dto: GenerateSongDto) {
    return this.appService.generateMock(dto);
  }
}
