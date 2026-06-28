import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CoverRequestDto } from './dto/cover-request.dto';
import { LyricsRequestDto } from './dto/lyrics-request.dto';
import { MusicRequestDto } from './dto/music-request.dto';
import { MiniMaxService } from './minimax.service';

@ApiTags('ai')
@Controller('api/ai')
export class AiController {
  constructor(private readonly miniMaxService: MiniMaxService) {}

  @Get('status')
  @ApiOperation({ summary: '检查 AI 配置是否可用' })
  getStatus() {
    return this.miniMaxService.getStatus();
  }

  @Post('lyrics')
  @ApiOperation({ summary: '根据提示词生成标题、风格和歌词' })
  generateLyrics(@Body() dto: LyricsRequestDto) {
    return this.miniMaxService.generateLyrics(dto);
  }

  @Post('music')
  @ApiOperation({ summary: '根据标题、风格和歌词生成音乐' })
  generateMusic(@Body() dto: MusicRequestDto) {
    return this.miniMaxService.generateMusic(dto);
  }

  @Post('cover')
  @ApiOperation({ summary: '根据歌曲信息生成封面' })
  generateCover(@Body() dto: CoverRequestDto) {
    return this.miniMaxService.generateCover(dto);
  }
}
