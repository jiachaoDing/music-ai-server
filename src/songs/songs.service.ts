import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { AudioStorageService } from '../common/services/audio-storage.service';
import { CoverStorageService } from '../common/services/cover-storage.service';
import { mapSong } from '../common/utils/song-mapper';
import { MusicRequestDto } from '../ai/dto/music-request.dto';
import { MiniMaxService } from '../ai/minimax.service';
import { AiTaskService } from '../ai/ai-task.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublishSongDto } from './dto/publish-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';

@Injectable()
export class SongsService {
  constructor(
    private readonly miniMaxService: MiniMaxService,
    private readonly prisma: PrismaService,
    private readonly aiTaskService: AiTaskService,
    private readonly audioStorageService: AudioStorageService,
    private readonly coverStorageService: CoverStorageService,
  ) {}

  async generateAndSave(dto: MusicRequestDto, user?: User) {
    const generatedMusic = await this.miniMaxService.generateMusic(dto);
    const audioUrl = await this.audioStorageService.persistAudio(
      generatedMusic.audioUrl,
      `song_${Date.now()}`,
    );

    const song = await this.prisma.song.create({
      data: {
        title: dto.title,
        style: dto.style,
        prompt: dto.style,
        status: 'draft',
        mode: dto.mode ?? 'song',
        audioUrl,
        duration: generatedMusic.duration,
        lyrics: dto.lyrics,
        isInstrumental: dto.isInstrumental ?? false,
        authorId: user?.id,
        authorName: user?.name,
        authorColor: user?.color,
      },
    });

    return mapSong(song);
  }

  async findMySongs(user: User, published?: string, status?: string) {
    const where: Record<string, unknown> = { authorId: user.id };

    if (published !== undefined) {
      where.published = published === 'true';
    } else if (status) {
      where.status = status;
    }

    const songs = await this.prisma.song.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return { list: songs.map((s) => mapSong(s)), total: songs.length };
  }

  async findOne(id: string, user?: User) {
    const song = await this.prisma.song.findUnique({ where: { id } });
    if (!song) throw new NotFoundException('作品不存在');

    const isOwner = user?.id === song.authorId;
    const isPublic = song.published && song.status === 'published';
    if (!isPublic && !isOwner) {
      throw new ForbiddenException('无权查看该作品');
    }

    const collectCount = await this.prisma.collect.count({ where: { songId: id } });
    return { song: mapSong(song, { collectCount }) };
  }

  async updateSong(id: string, user: User, dto: UpdateSongDto) {
    const song = await this.getOwnedSong(id, user.id);
    if (!['draft', 'private', 'generating'].includes(song.status)) {
      throw new BadRequestException('当前状态不可编辑');
    }
    const coverImg = await this.coverStorageService.persistCover(
      dto.coverUrl,
      id,
    );
    const updated = await this.prisma.song.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        lyrics: dto.lyrics,
        tags: dto.tags,
        ...(coverImg !== undefined ? { coverImg } : {}),
      },
    });
    return { song: mapSong(updated) };
  }

  async publish(id: string, user: User, dto: PublishSongDto) {
    const song = await this.getOwnedSong(id, user.id);
    if (dto.published !== false && dto.copyrightConfirmed === false) {
      throw new BadRequestException('发布前请确认版权声明');
    }

    const published = dto.published ?? true;
    const updated = await this.prisma.song.update({
      where: { id },
      data: {
        published,
        status: published ? 'published' : 'private',
        publishedAt: published ? new Date() : null,
      },
    });
    return { song: mapSong(updated) };
  }

  async recordPlay(id: string) {
    const song = await this.prisma.song.findUnique({ where: { id } });
    if (!song) throw new NotFoundException('作品不存在');
    const updated = await this.prisma.song.update({
      where: { id },
      data: { plays: { increment: 1 } },
    });
    return { playCount: updated.plays };
  }

  private async getOwnedSong(id: string, userId: string) {
    const song = await this.prisma.song.findUnique({ where: { id } });
    if (!song) throw new NotFoundException('作品不存在');
    if (song.authorId !== userId) throw new ForbiddenException('无权操作该作品');
    return song;
  }

  remix(
    id: string,
    user: User,
    dto: { style: string; lyrics?: string; prompt: string },
  ) {
    return this.aiTaskService.submitRemix(id, user, dto);
  }
}




