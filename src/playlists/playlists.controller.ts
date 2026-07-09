import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePlaylistDto, RenamePlaylistDto } from './dto/playlist.dto';
import { PlaylistsService } from './playlists.service';

@ApiTags('playlists')
@Controller('api/playlists')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Get()
  @ApiOperation({ summary: '我的歌单列表' })
  list(@CurrentUser() user: User) {
    return this.playlistsService.list(user);
  }

  @Post()
  @ApiOperation({ summary: '创建歌单' })
  create(@CurrentUser() user: User, @Body() dto: CreatePlaylistDto) {
    return this.playlistsService.create(user, dto.name, dto.color);
  }

  @Patch(':id')
  @ApiOperation({ summary: '重命名歌单' })
  rename(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: RenamePlaylistDto,
  ) {
    return this.playlistsService.rename(id, user, dto.name);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除歌单' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.playlistsService.remove(id, user);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取歌单详情' })
  getById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.playlistsService.getById(id, user);
  }

  @Post(':id/songs/:songId')
  @ApiOperation({ summary: '歌单添加歌曲' })
  addSong(
    @Param('id') id: string,
    @Param('songId') songId: string,
    @CurrentUser() user: User,
  ) {
    return this.playlistsService.addSong(id, user, songId);
  }

  @Delete(':id/songs/:songId')
  @ApiOperation({ summary: '歌单移除歌曲' })
  removeSong(
    @Param('id') id: string,
    @Param('songId') songId: string,
    @CurrentUser() user: User,
  ) {
    return this.playlistsService.removeSong(id, user, songId);
  }
}
