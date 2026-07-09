import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiTaskService } from './ai-task.service';
import { HostService } from './host.service';
import { AlbumRequestDto } from './dto/album-request.dto';
import { LyricsRequestDto } from './dto/lyrics-request.dto';
import { MusicRequestDto } from './dto/music-request.dto';

@ApiTags('ai-public')
@Controller('api')
export class AiPublicController {
  constructor(
    private readonly aiTaskService: AiTaskService,
    private readonly hostService: HostService,
  ) {}

  @Post('lyrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'AI 生成歌词' })
  generateLyrics(@Body() dto: LyricsRequestDto) {
    return this.aiTaskService.generateLyrics(dto);
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '提交 AI 音乐生成任务' })
  submitGenerate(@Body() dto: MusicRequestDto, @CurrentUser() user: User) {
    return this.aiTaskService.submitGenerate(dto, user);
  }

  @Get('task/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询异步任务状态' })
  getTask(@Param('id') id: string) {
    return this.aiTaskService.getTask(id);
  }

  @Post('albums')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'AI 音乐制作人专辑' })
  createAlbum(@Body() dto: AlbumRequestDto, @CurrentUser() user: User) {
    return this.aiTaskService.submitAlbum(dto, user);
  }

  @Get('host')
  @ApiOperation({ summary: 'AI 主理人主页' })
  getHost() {
    return this.hostService.getHostPage();
  }

  @Get('curation')
  @ApiOperation({ summary: '主理人策展内容' })
  getCuration() {
    return this.hostService.getCuration();
  }

  @Get('challenges')
  @ApiOperation({ summary: '话题挑战列表' })
  getChallenges() {
    return this.hostService.getChallenges();
  }

  @Get('radio')
  @ApiOperation({ summary: '电台主题数据' })
  getRadio() {
    return this.hostService.getRadio();
  }

  @Post('dj/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '生成 AI DJ 播报' })
  generateDj(@Param('id') id: string) {
    return this.aiTaskService.generateDj(id);
  }

  @Get('daylyric')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '时运曲歌词' })
  dayLyric(@Query('type') type: 'vocal' | 'instrumental' = 'vocal') {
    return this.aiTaskService.dayLyric(type);
  }

  @Get('albums/:id')
  @ApiOperation({ summary: '获取专辑详情' })
  getAlbum(@Param('id') id: string) {
    return this.aiTaskService.getAlbumById(id);
  }
}
