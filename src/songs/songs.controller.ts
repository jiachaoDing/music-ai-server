import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { PublishSongDto } from './dto/publish-song.dto';
import { RemixSongDto } from './dto/remix-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { SongsService } from './songs.service';

type AuthRequest = Request & { user?: User | null };

@ApiTags('me')
@Controller('api/me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MeSongsController {
  constructor(private readonly songsService: SongsService) {}

  @Get('songs')
  @ApiOperation({ summary: '获取当前用户作品列表' })
  @ApiQuery({ name: 'published', required: false })
  @ApiQuery({ name: 'status', required: false })
  getMySongs(
    @CurrentUser() user: User,
    @Query('published') published?: string,
    @Query('status') status?: string,
  ) {
    return this.songsService.findMySongs(user, published, status);
  }
}

@ApiTags('songs')
@Controller('api/song')
export class SongController {
  constructor(private readonly songsService: SongsService) {}

  @Get(':id')
  @ApiOperation({ summary: '获取作品详情' })
  @UseGuards(OptionalJwtAuthGuard)
  getSong(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.songsService.findOne(id, req.user ?? undefined);
  }

  @Patch(':id')
  @ApiOperation({ summary: '发布前编辑作品' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  updateSong(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateSongDto,
  ) {
    return this.songsService.updateSong(id, user, dto);
  }

  @Post(':id/remix')
  @ApiOperation({ summary: '创建翻唱/二创' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remix(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: RemixSongDto,
  ) {
    return this.songsService.remix(id, user, dto);
  }
}

@ApiTags('publish')
@Controller('api/publish')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PublishController {
  constructor(private readonly songsService: SongsService) {}

  @Post(':id')
  @ApiOperation({ summary: '发布或转私密作品' })
  publish(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: PublishSongDto,
  ) {
    return this.songsService.publish(id, user, dto);
  }
}

@ApiTags('play')
@Controller('api/play')
export class PlayController {
  constructor(private readonly songsService: SongsService) {}

  @Post(':id')
  @ApiOperation({ summary: '记录播放次数' })
  play(@Param('id') id: string) {
    return this.songsService.recordPlay(id);
  }
}
