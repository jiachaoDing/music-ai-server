import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { mapSong } from '../common/utils/song-mapper';
import { mapTask } from '../common/utils/task-mapper';
import { AdminService } from '../admin/admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiMockService } from './ai-mock.service';
import { AlbumRequestDto } from './dto/album-request.dto';
import { LyricsRequestDto } from './dto/lyrics-request.dto';
import { MusicRequestDto } from './dto/music-request.dto';
import { MiniMaxService } from './minimax.service';

const GENERATE_COST = 2;

@Injectable()
export class AiTaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly miniMaxService: MiniMaxService,
    private readonly mockService: AiMockService,
    private readonly adminService: AdminService,
  ) {}

  async generateLyrics(dto: LyricsRequestDto) {
    try {
      const result = await this.miniMaxService.generateLyrics({
        prompt: dto.prompt,
      });
      const styles = dto.styles?.length
        ? dto.styles
        : [result.style ?? '流行', '治愈'];
      return {
        title: result.title,
        styles,
        lyrics: result.lyrics,
        tags: styles.slice(0, 3),
      };
    } catch {
      return this.mockService.generateLyrics(dto);
    }
  }

  async submitGenerate(dto: MusicRequestDto, user: User) {
    if (user) {
      await this.adminService.deductPoints(user.id, -GENERATE_COST, '生成歌曲');
    }

    const queueAhead = await this.prisma.aiTask.count({
      where: { status: { in: ['queued', 'running'] } },
    });

    const task = await this.prisma.aiTask.create({
      data: {
        type: 'generate',
        status: 'queued',
        stage:
          queueAhead > 0
            ? `排队中（前面还有 ${queueAhead} 个）`
            : '排队中',
        progress: 10,
        queueAhead,
        userId: user.id,
        input: dto as object,
      },
    });

    void this.processGenerateTask(task.id, dto, user);
    return { taskId: task.id };
  }

  private async processGenerateTask(
    taskId: string,
    dto: MusicRequestDto,
    user: User,
  ) {
    await this.prisma.aiTask.update({
      where: { id: taskId },
      data: {
        status: 'running',
        stage: '🎹 正在作曲编曲演唱…大约30~60秒',
        progress: 50,
        queueAhead: 0,
      },
    });

    try {
      const result = await this.miniMaxService
        .generateMusic(dto)
        .catch(() => this.mockService.generateMusic(dto));

      const song = await this.prisma.song.create({
        data: {
          title: dto.title,
          style: dto.style,
          prompt: dto.prompt ?? dto.style,
          lyrics: dto.lyrics,
          audioUrl: result.audioUrl,
          status: 'draft',
          mode: dto.mode ?? 'song',
          isInstrumental: dto.isInstrumental ?? false,
          originId: dto.originId ?? undefined,
          forWho: dto.forWho,
          unlocked: dto.mode !== 'foryou',
          authorId: user.id,
          authorName: user.name,
          authorColor: user.color,
        },
      });

      const updatedTask = await this.prisma.aiTask.update({
        where: { id: taskId },
        data: {
          status: 'done',
          progress: 100,
          stage: '生成完成',
          songId: song.id,
          result: { song: mapSong(song) } as object,
        },
      });

      return updatedTask;
    } catch (error) {
      await this.prisma.aiTask.update({
        where: { id: taskId },
        data: {
          status: 'error',
          stage: '生成失败',
          progress: 0,
          error: JSON.stringify({
            code: 600,
            message:
              error instanceof Error
                ? error.message
                : 'AI 服务暂时不可用，请稍后重试',
          }),
        },
      });
    }
  }

  async getTask(id: string) {
    const task = await this.prisma.aiTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('任务不存在');

    const song = task.songId
      ? await this.prisma.song.findUnique({ where: { id: task.songId } })
      : null;

    return mapTask(task, song);
  }

  async submitAlbum(dto: AlbumRequestDto, user: User) {
    await this.adminService.deductPoints(user.id, -5, 'AI 音乐制作人专辑');

    const task = await this.prisma.aiTask.create({
      data: {
        type: 'album',
        status: 'queued',
        stage: '专辑制作排队中',
        progress: 5,
        queueAhead: 0,
        userId: user.id,
        input: dto as object,
      },
    });

    void this.processAlbumTask(task.id, dto, user);
    return { taskId: task.id };
  }

  private async processAlbumTask(
    taskId: string,
    dto: AlbumRequestDto,
    user: User,
  ) {
    const trackCount = dto.trackCount ?? 4;

    try {
      const album = await this.prisma.album.create({
        data: {
          title: `${dto.theme} · 概念 EP`,
          theme: dto.theme,
          description: `围绕「${dto.theme}」生成的概念 EP`,
          authorId: user.id,
          authorName: user.name,
          trackCount,
        },
      });

      await this.prisma.aiTask.update({
        where: { id: taskId },
        data: { albumId: album.id, status: 'running', progress: 10 },
      });

      const songs: Array<ReturnType<typeof mapSong> & { order: number }> = [];

      for (let i = 1; i <= trackCount; i++) {
        await this.prisma.aiTask.update({
          where: { id: taskId },
          data: {
            stage: `✍️ 正在创作第 ${i} 首歌词…（共 ${trackCount} 首）`,
            progress: Math.round((i / trackCount) * 80),
            result: {
              songs: songs.map((s) => ({
                id: s.id,
                title: s.title,
                status: 'done',
                duration: s.duration,
              })),
            } as object,
          },
        });

        const lyrics = await this.generateLyrics({
          prompt: `${dto.theme} 曲目${i}`,
          mode: 'song',
        });
        const styleText = lyrics.styles?.join(' / ') ?? '流行';

        const music = await this.miniMaxService
          .generateMusic({
            title: lyrics.title,
            style: styleText,
            lyrics: lyrics.lyrics,
          })
          .catch(() =>
            this.mockService.generateMusic({
              title: lyrics.title,
              style: styleText,
              lyrics: lyrics.lyrics,
            }),
          );

        const song = await this.prisma.song.create({
          data: {
            title: lyrics.title,
            style: styleText,
            prompt: dto.theme,
            lyrics: lyrics.lyrics,
            audioUrl: music.audioUrl,
            status: 'draft',
            mode: 'song',
            albumId: album.id,
            authorId: user.id,
            authorName: user.name,
          },
        });

        await this.prisma.albumSong.create({
          data: { albumId: album.id, songId: song.id, order: i },
        });

        songs.push({ ...mapSong(song), order: i });
      }

      await this.prisma.aiTask.update({
        where: { id: taskId },
        data: {
          status: 'done',
          stage: '专辑制作完成',
          progress: 100,
          result: {
            album: {
              id: album.id,
              title: album.title,
              description: album.description,
              coverUrl: album.coverUrl,
              trackCount,
              createdAt: album.createdAt.toISOString(),
            },
            songs,
          } as object,
        },
      });
    } catch (error) {
      await this.prisma.aiTask.update({
        where: { id: taskId },
        data: {
          status: 'error',
          stage: '专辑制作失败',
          error: JSON.stringify({
            code: 600,
            message:
              error instanceof Error ? error.message : '专辑制作失败',
          }),
        },
      });
    }
  }

  async submitRemix(
    originId: string,
    user: User,
    dto: { style: string; lyrics?: string; prompt: string },
  ) {
    await this.adminService.deductPoints(user.id, -1, '二创 / 翻唱');

    const originalSong = await this.prisma.song.findUnique({
      where: { id: originId },
    });
    if (!originalSong) throw new NotFoundException('原作品不存在');

    const task = await this.prisma.aiTask.create({
      data: {
        type: 'remix',
        status: 'queued',
        stage: '翻唱任务排队中',
        progress: 10,
        userId: user.id,
        input: { originId, ...dto } as object,
      },
    });

    void this.processRemixTask(task.id, originId, user, dto, originalSong.title);
    return { taskId: task.id };
  }

  private async processRemixTask(
    taskId: string,
    originId: string,
    user: User,
    dto: { style: string; lyrics?: string; prompt: string },
    originalTitle: string,
  ) {
    await this.prisma.aiTask.update({
      where: { id: taskId },
      data: { status: 'running', stage: '正在生成翻唱版本', progress: 50 },
    });

    try {
      const title = `${originalTitle}（${dto.style}版）`;
      const music = await this.miniMaxService
        .generateMusic({
          title,
          style: dto.style,
          lyrics: dto.lyrics ?? '',
        })
        .catch(() =>
          this.mockService.generateMusic({
            title,
            style: dto.style,
            lyrics: dto.lyrics ?? '',
          }),
        );

      const song = await this.prisma.song.create({
        data: {
          title,
          style: dto.style,
          prompt: dto.prompt,
          lyrics: dto.lyrics,
          audioUrl: music.audioUrl,
          status: 'draft',
          mode: 'remix',
          originId,
          authorId: user.id,
          authorName: user.name,
          authorColor: user.color,
        },
      });

      await this.prisma.remixRelation.create({
        data: {
          sourceSongId: originId,
          newSongId: song.id,
          type: 'remix',
          createdBy: user.id,
        },
      });

      await this.prisma.song.update({
        where: { id: originId },
        data: { coverCount: { increment: 1 } },
      });

      await this.prisma.aiTask.update({
        where: { id: taskId },
        data: {
          status: 'done',
          progress: 100,
          stage: '翻唱完成',
          songId: song.id,
          result: { song: mapSong(song) } as object,
        },
      });
    } catch (error) {
      await this.prisma.aiTask.update({
        where: { id: taskId },
        data: {
          status: 'error',
          error: JSON.stringify({
            code: 600,
            message: error instanceof Error ? error.message : '翻唱失败',
          }),
        },
      });
    }
  }

  async generateDj(songId: string) {
    const song = await this.prisma.song.findUnique({ where: { id: songId } });
    if (!song) throw new NotFoundException('作品不存在');

    const dj = this.mockService.generateDjText(song.title);
    await this.prisma.song.update({
      where: { id: songId },
      data: { djText: dj.text, djUrl: dj.audioUrl },
    });
    return dj;
  }

  async getAlbumById(id: string) {
    const album = await this.prisma.album.findUnique({
      where: { id },
      include: {
        albumSongs: {
          include: { song: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!album) throw new NotFoundException('专辑不存在');

    return {
      album: {
        id: album.id,
        title: album.title,
        description: album.description,
        coverUrl: album.coverUrl,
        authorId: album.authorId,
        trackCount: album.trackCount,
        createdAt: album.createdAt.toISOString(),
      },
      songs: album.albumSongs.map((as) => mapSong(as.song)),
    };
  }

  dayLyric(type: 'vocal' | 'instrumental') {
    return this.mockService.generateDayLyric(type);
  }
}
