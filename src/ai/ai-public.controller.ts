import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from '../admin/admin.service';
import { AudioStorageService } from '../common/services/audio-storage.service';
import { PosterService } from '../common/services/poster.service';
import { mapSong } from '../common/utils/song-mapper';
import { PrismaService } from '../prisma/prisma.service';
import { AiTaskService } from './ai-task.service';
import { HostService } from './host.service';
import { MiniMaxService } from './minimax.service';
import { AlbumRequestDto } from './dto/album-request.dto';
import { LyricsRequestDto } from './dto/lyrics-request.dto';
import { MusicRequestDto } from './dto/music-request.dto';

@ApiTags('ai-public')
@Controller('api')
export class AiPublicController {
  constructor(
    private readonly aiTaskService: AiTaskService,
    private readonly hostService: HostService,
    private readonly miniMaxService: MiniMaxService,
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
    private readonly audioStorageService: AudioStorageService,
    private readonly posterService: PosterService,
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

  @Post('ai/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '提交 AI 音乐生成任务' })
  submitGenerateAlias(@Body() dto: MusicRequestDto, @CurrentUser() user: User) {
    return this.aiTaskService.submitGenerate(dto, user);
  }

  @Get('task/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询异步任务状态' })
  getTask(@Param('id') id: string, @CurrentUser() user: User) {
    return this.aiTaskService.getTaskSample(id, user);
  }

  @Get('ai/tasks/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询异步任务状态' })
  getTaskAlias(@Param('id') id: string, @CurrentUser() user: User) {
    return this.aiTaskService.getTaskSample(id, user);
  }

  @Post('albums')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'AI 音乐制作人专辑' })
  createAlbum(@Body() dto: AlbumRequestDto, @CurrentUser() user: User) {
    return this.aiTaskService.submitAlbum(dto, user);
  }

  @Post('album')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'AI 音乐制作人专辑' })
  createAlbumCompat(@Body() dto: AlbumRequestDto, @CurrentUser() user: User) {
    return this.aiTaskService.submitAlbum(dto, user);
  }

  @Post('ai/album')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'AI 音乐制作人专辑' })
  createAlbumAlias(@Body() dto: AlbumRequestDto, @CurrentUser() user: User) {
    return this.aiTaskService.submitAlbum(dto, user);
  }

  @Post('ai/remix')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '提交翻唱/二创任务' })
  remixAlias(
    @Body() dto: MusicRequestDto & { originId?: string },
    @CurrentUser() user: User,
  ) {
    if (!dto.originId) throw new BadRequestException('originId is required');
    return this.aiTaskService.submitRemix(dto.originId, user, {
      title: dto.title,
      style: dto.style,
      lyrics: dto.lyrics,
      prompt: dto.prompt ?? dto.style,
    });
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

  @Get('challenges/:id')
  @ApiOperation({ summary: '话题挑战详情' })
  getChallengeDetail(@Param('id') id: string) {
    return this.hostService.getChallengeDetail(id);
  }

  @Get('radio')
  @ApiOperation({ summary: '电台主题数据' })
  async getRadio() {
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

  @Get('me/albums')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户的专辑列表' })
  getMyAlbums(@CurrentUser() user: User) {
    return this.aiTaskService.getAlbumsByUser(user.id);
  }

  @Get('albums/:id')
  @ApiOperation({ summary: '获取专辑详情' })
  getAlbum(@Param('id') id: string) {
    return this.aiTaskService.getAlbumById(id);
  }

  @Get('album/:id')
  @ApiOperation({ summary: '获取专辑详情' })
  getAlbumCompat(@Param('id') id: string) {
    return this.aiTaskService.getAlbumById(id);
  }

  @Post('song/:id/publish-copy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'AI 发布文案' })
  async generatePublishCopy(@Param('id') id: string) {
    const song = await this.prisma.song.findUnique({ where: { id } });
    if (!song) throw new NotFoundException('作品不存在');

    const result = await this.miniMaxService
      .generatePublishCopy({
        title: song.title,
        style: song.style,
        lyrics: song.lyrics || undefined,
      })
      .catch(() => ({
        description: `分享一首我创作的${song.style}风格歌曲《${song.title}》，希望你喜欢！`,
        tags: song.style
          .split('/')
          .map((s) => s.trim())
          .slice(0, 3),
      }));

    await this.prisma.song.update({
      where: { id },
      data: { description: result.description, tags: result.tags },
    });

    return result;
  }

  @Post('radio/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '电台纯音乐生成' })
  async generateRadioMusic(
    @Body() body: { themeId: string },
    @CurrentUser() user: User,
  ) {
    await this.adminService.deductPoints(user.id, -1, '电台纯音乐');

    const theme = await this.prisma.radioTheme.findUnique({
      where: { id: body.themeId },
    });

    if (!theme) {
      throw new NotFoundException('电台主题不存在');
    }

    const music = await this.miniMaxService
      .generateMusic({
        title: `${theme.name} · AI即兴`,
        style: theme.prompt,
        lyrics: '',
        isInstrumental: true,
      })
      .catch(() => ({
        status: 'generated' as const,
        title: `${theme.name} · AI即兴`,
        style: theme.name,
        audioUrl: 'https://example.com/mock-radio.mp3',
        duration: 180,
      }));

    const audioUrl = await this.audioStorageService.persistAudio(
      music.audioUrl,
      `radio_${body.themeId}_${Date.now()}`,
    );

    const song = await this.prisma.song.create({
      data: {
        title: `${theme.name} · AI即兴`,
        style: theme.name,
        audioUrl,
        duration: music.duration ?? 180,
        mode: 'radio',
        isInstrumental: true,
        authorId: user.id,
        authorName: user.name,
        authorColor: user.color,
      },
    });

    return { song: mapSong(song) };
  }

  @Get('radio/refresh')
  @ApiOperation({ summary: '换一批电台主题' })
  refreshRadio() {
    return this.hostService.getRadio();
  }

  @Get('song/:id/poster')
  @ApiOperation({ summary: '下载歌曲海报' })
  async downloadPoster(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.posterService.generateSongPoster(id);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="poster_${id}.png"`,
    );
    res.send(buffer);
  }
}
