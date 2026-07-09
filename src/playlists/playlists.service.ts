import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import {
  LIKED_PLAYLIST_COLOR,
  LIKED_PLAYLIST_NAME,
} from '../common/constants';
import { mapPlaylist } from '../common/utils/playlist-mapper';
import { mapSong } from '../common/utils/song-mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlaylistsService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureLikedPlaylist(userId: string) {
    const existing = await this.prisma.playlist.findFirst({
      where: { userId, type: 'liked', isSystem: true },
    });
    if (existing) return existing;

    return this.prisma.playlist.create({
      data: {
        userId,
        name: LIKED_PLAYLIST_NAME,
        type: 'liked',
        isSystem: true,
        color: LIKED_PLAYLIST_COLOR,
      },
    });
  }

  async list(user: User) {
    await this.ensureLikedPlaylist(user.id);
    const playlists = await this.prisma.playlist.findMany({
      where: { userId: user.id },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'desc' }],
    });
    return { list: playlists.map(mapPlaylist) };
  }

  create(user: User, name: string, color?: string) {
    return this.prisma.playlist
      .create({
        data: { userId: user.id, name, color, type: 'custom' },
      })
      .then((playlist) => ({ playlist: mapPlaylist(playlist) }));
  }

  async rename(id: string, user: User, name: string) {
    const playlist = await this.ensureOwner(id, user.id);
    if (playlist.isSystem) {
      throw new BadRequestException('系统歌单不可重命名');
    }
    const updated = await this.prisma.playlist.update({
      where: { id },
      data: { name },
    });
    return { playlist: mapPlaylist(updated) };
  }

  async remove(id: string, user: User) {
    const playlist = await this.ensureOwner(id, user.id);
    if (playlist.isSystem) {
      throw new BadRequestException('系统歌单不可删除');
    }
    await this.prisma.playlist.delete({ where: { id } });
    return { deleted: true };
  }

  async addSong(playlistId: string, user: User, songId: string) {
    await this.ensureOwner(playlistId, user.id);
    const exists = await this.prisma.playlistSong.findFirst({
      where: { playlistId, songId },
    });
    if (exists) throw new BadRequestException('歌曲已在歌单中');

    await this.prisma.$transaction([
      this.prisma.playlistSong.create({ data: { playlistId, songId } }),
      this.prisma.playlist.update({
        where: { id: playlistId },
        data: { songCount: { increment: 1 } },
      }),
    ]);
    return { added: true };
  }

  async removeSong(playlistId: string, user: User, songId: string) {
    const playlist = await this.ensureOwner(playlistId, user.id);
    await this.prisma.playlistSong.deleteMany({ where: { playlistId, songId } });
    if (playlist.songCount > 0) {
      await this.prisma.playlist.update({
        where: { id: playlistId },
        data: { songCount: { decrement: 1 } },
      });
    }
    return { removed: true };
  }

  async getById(id: string, user: User) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      include: {
        playlistSongs: {
          include: { song: true },
        },
      },
    });
    if (!playlist) throw new NotFoundException('歌单不存在');
    if (playlist.userId !== user.id) throw new BadRequestException('无权操作');

    return {
      playlist: mapPlaylist(playlist),
      songs: playlist.playlistSongs.map((ps) => mapSong(ps.song)),
    };
  }

  private async ensureOwner(id: string, userId: string) {
    const playlist = await this.prisma.playlist.findUnique({ where: { id } });
    if (!playlist) throw new NotFoundException('歌单不存在');
    if (playlist.userId !== userId) throw new BadRequestException('无权操作');
    return playlist;
  }
}
