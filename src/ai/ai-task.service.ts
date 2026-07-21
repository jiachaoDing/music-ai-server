import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { AdminService } from '../admin/admin.service';
import { AudioStorageService } from '../common/services/audio-storage.service';
import { CoverStorageService } from '../common/services/cover-storage.service';
import { assertChallengeJoinable } from '../common/utils/challenge-utils';
import {
  buildSampleAlbumPayload,
  buildSampleTaskPayload,
} from '../common/utils/sample-compat';
import { mapSong } from '../common/utils/song-mapper';
import { PrismaService } from '../prisma/prisma.service';
import { AiConcurrencyService } from './ai-concurrency.service';
import { AiMockService } from './ai-mock.service';
import { AlbumRequestDto } from './dto/album-request.dto';
import { LyricsRequestDto } from './dto/lyrics-request.dto';
import { MusicRequestDto } from './dto/music-request.dto';
import { AiRequestContext, MiniMaxService } from './minimax.service';

const GENERATE_COST = 2;
const ALBUM_COST = 5;
const REMIX_COST = 1;

type CreateGeneratedSongOptions = {
  fileKey?: string;
  taskId?: string;
  status?: string;
  published?: boolean;
  publishedAt?: Date | null;
  hostPick?: boolean;
};

@Injectable()
export class AiTaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly miniMaxService: MiniMaxService,
    private readonly mockService: AiMockService,
    private readonly adminService: AdminService,
    private readonly audioStorageService: AudioStorageService,
    private readonly coverStorageService: CoverStorageService,
    private readonly aiConcurrencyService: AiConcurrencyService,
  ) {}

  async generateLyrics(dto: LyricsRequestDto, context?: AiRequestContext) {
    try {
      const result = await this.miniMaxService.generateLyrics(dto, context);
      const styles = dto.styles?.length
        ? dto.styles
        : result.style
          ? [result.style]
          : [];
      return {
        title: result.title,
        styles,
        style: result.style,
        lyrics: result.lyrics,
        tags: styles.slice(0, 3),
        rawText: result.rawText,
      };
    } catch {
      return this.mockService.generateLyrics(dto);
    }
  }

  async submitGenerate(dto: MusicRequestDto, user: User) {
    await assertChallengeJoinable(this.prisma, dto.challengeId);

    const points = await this.adminService.deductPoints(
      user.id,
      -GENERATE_COST,
      'generate song',
    );

    const queueAhead = this.getCurrentQueueAhead();
    const task = await this.prisma.aiTask.create({
      data: {
        type: 'generate',
        status: 'queued',
        stage: 'waiting_for_ai',
        progress: 10,
        queueAhead,
        userId: user.id,
        input: JSON.parse(JSON.stringify(dto)),
      },
    });

    void this.processGenerateTask(task.id, dto, user).catch((error) =>
      this.markTaskFailed(task.id, error, user.id, GENERATE_COST),
    );

    return this.buildSubmitResponse(
      task.id,
      queueAhead,
      points.points,
      GENERATE_COST,
    );
  }

  private async processGenerateTask(
    taskId: string,
    dto: MusicRequestDto,
    user: User,
  ) {
    try {
      const song = await this.createGeneratedSong(dto, user, {
        fileKey: taskId,
        taskId,
      });

      await this.prisma.aiTask.update({
        where: { id: taskId },
        data: {
          status: 'done',
          progress: 100,
          stage: 'done',
          songId: song.id,
          result: { song: mapSong(song) },
        },
      });
    } catch (error) {
      await this.prisma.aiTask.update({
        where: { id: taskId },
        data: {
          status: 'error',
          stage: 'failed',
          progress: 0,
          error: JSON.stringify({
            code: 600,
            message:
              error instanceof Error ? error.message : 'AI service unavailable',
          }),
        },
      });
      await this.refundTaskCost(
        taskId,
        user.id,
        GENERATE_COST,
        'generate song refund',
      );
    }
  }

  async createGeneratedSong(
    dto: MusicRequestDto,
    user: Pick<User, 'id' | 'name' | 'color'>,
    options: CreateGeneratedSongOptions = {},
  ) {
    const result = await this.miniMaxService
      .generateMusic(
        dto,
        this.buildAiRequestContext(options.taskId, 'generating music', 40),
      )
      .catch(() => this.mockService.generateMusic(dto));
    const audioUrl = await this.audioStorageService.persistAudio(
      result.audioUrl,
      options.fileKey ?? `song_${Date.now()}`,
    );
    const tags = dto.style
      .split(/[,/，]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 6);

    const song = await this.prisma.song.create({
      data: {
        title: dto.title,
        style: dto.style,
        tags,
        prompt: dto.prompt ?? dto.style,
        lyrics: dto.lyrics,
        audioUrl,
        duration: result.duration ?? 0,
        status: options.status ?? 'draft',
        published: options.published ?? false,
        publishedAt:
          options.publishedAt ?? (options.published ? new Date() : null),
        hostPick: options.hostPick ?? false,
        mode: dto.mode ?? 'song',
        isInstrumental: dto.isInstrumental ?? false,
        originId: dto.originId ?? undefined,
        forWho: dto.forWho,
        challengeId: dto.challengeId ?? null,
        unlocked: dto.mode !== 'foryou',
        authorId: user.id,
        authorName: user.name,
        authorColor: user.color,
      },
    });

    let coverUrl: string | null = null;
    try {
      const coverResult = await this.miniMaxService.generateCover(
        {
          title: dto.title,
          style: dto.style,
        },
        this.buildAiRequestContext(options.taskId, 'generating cover', 70),
      );
      if (coverResult.imageUrl) {
        const persistedUrl = await this.coverStorageService.persistCover(
          coverResult.imageUrl,
          song.id,
        );
        coverUrl = persistedUrl ?? null;
      }
    } catch {}

    let aiReview: string | null = null;
    if (!dto.isInstrumental) {
      try {
        const reviewResult = await this.miniMaxService.generateReview(
          {
            title: dto.title,
            style: dto.style,
            lyrics: dto.lyrics,
          },
          this.buildAiRequestContext(options.taskId, 'generating review', 90),
        );
        aiReview = reviewResult?.text ?? null;
      } catch {}
    }

    return this.prisma.song.update({
      where: { id: song.id },
      data: {
        coverImg: coverUrl,
        review: aiReview,
      },
    });
  }

  async getTask(id: string, user?: User) {
    return this.getTaskSample(id, user);
  }

  async submitAlbum(dto: AlbumRequestDto, user: User) {
    const points = await this.adminService.deductPoints(
      user.id,
      -ALBUM_COST,
      'generate album',
    );

    const queueAhead = this.getCurrentQueueAhead();
    const task = await this.prisma.aiTask.create({
      data: {
        type: 'album',
        status: 'queued',
        stage: 'waiting_for_ai',
        progress: 5,
        queueAhead,
        userId: user.id,
        input: JSON.parse(JSON.stringify(dto)),
      },
    });

    void this.processAlbumTask(task.id, dto, user).catch((error) =>
      this.markTaskFailed(task.id, error, user.id, ALBUM_COST),
    );

    return this.buildSubmitResponse(
      task.id,
      queueAhead,
      points.points,
      ALBUM_COST,
    );
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
          title: `${dto.theme} EP`,
          theme: dto.theme,
          description: `EP based on ${dto.theme}`,
          authorId: user.id,
          authorName: user.name,
          trackCount,
        },
      });

      await this.prisma.aiTask.update({
        where: { id: taskId },
        data: { albumId: album.id },
      });

      const songs: Array<ReturnType<typeof mapSong> & { order: number }> = [];

      for (let i = 1; i <= trackCount; i += 1) {
        await this.prisma.aiTask.update({
          where: { id: taskId },
          data: {
            stage: `waiting for track ${i}/${trackCount} AI`,
            progress: Math.round((i / trackCount) * 80),
            result: {
              tracks: songs.map((s) => ({
                id: s.id,
                title: s.title,
                status: 'done',
                duration: s.duration,
              })),
            },
          },
        });

        const lyrics = await this.generateLyrics(
          {
            prompt: `${dto.theme} track ${i}`,
            mode: 'song',
          },
          this.buildAiRequestContext(
            taskId,
            `creating track ${i}/${trackCount}: generating lyrics`,
            Math.max(10, Math.round(((i - 1) / trackCount) * 80)),
          ),
        );
        const styleText = lyrics.styles?.join(' / ') ?? 'pop';

        const music = await this.miniMaxService
          .generateMusic(
            {
              title: lyrics.title,
              style: styleText,
              lyrics: lyrics.lyrics,
            },
            this.buildAiRequestContext(
              taskId,
              `creating track ${i}/${trackCount}: generating music`,
              Math.max(20, Math.round((i / trackCount) * 80)),
            ),
          )
          .catch(() =>
            this.mockService.generateMusic({
              title: lyrics.title,
              style: styleText,
              lyrics: lyrics.lyrics,
            }),
          );
        const audioUrl = await this.audioStorageService.persistAudio(
          music.audioUrl,
          `${album.id}_${i}`,
        );

        const song = await this.prisma.song.create({
          data: {
            title: lyrics.title,
            style: styleText,
            prompt: dto.theme,
            lyrics: lyrics.lyrics,
            audioUrl,
            duration: music.duration ?? 0,
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
          stage: 'done',
          progress: 100,
          result: {
            album: {
              id: album.id,
              title: album.title,
              name: album.title,
              description: album.description,
              intro: album.description,
              coverUrl: album.coverUrl,
              authorId: album.authorId,
              author: album.authorName ?? user.name,
              total: trackCount,
              trackCount,
              createdAt: album.createdAt.toISOString(),
            },
            tracks: songs,
            songs,
          },
        },
      });
    } catch (error) {
      await this.prisma.aiTask.update({
        where: { id: taskId },
        data: {
          status: 'error',
          stage: 'failed',
          progress: 0,
          error: JSON.stringify({
            code: 600,
            message:
              error instanceof Error
                ? error.message
                : 'album generation failed',
          }),
        },
      });
      await this.refundTaskCost(
        taskId,
        user.id,
        ALBUM_COST,
        'album generation refund',
      );
    }
  }

  async submitRemix(
    originId: string,
    user: User,
    dto: { title?: string; style: string; lyrics?: string; prompt: string },
  ) {
    const originalSong = await this.prisma.song.findUnique({
      where: { id: originId },
    });
    if (!originalSong) throw new NotFoundException('original song not found');

    const points = await this.adminService.deductPoints(
      user.id,
      -REMIX_COST,
      'remix',
    );

    const queueAhead = this.getCurrentQueueAhead();
    const task = await this.prisma.aiTask.create({
      data: {
        type: 'remix',
        status: 'queued',
        stage: 'waiting_for_ai',
        progress: 10,
        queueAhead,
        userId: user.id,
        input: { originId, ...dto },
      },
    });

    void this.processRemixTask(
      task.id,
      originId,
      user,
      dto,
      originalSong.title,
    ).catch((error) =>
      this.markTaskFailed(task.id, error, user.id, REMIX_COST),
    );

    return this.buildSubmitResponse(
      task.id,
      queueAhead,
      points.points,
      REMIX_COST,
    );
  }

  private async processRemixTask(
    taskId: string,
    originId: string,
    user: User,
    dto: { title?: string; style: string; lyrics?: string; prompt: string },
    originalTitle: string,
  ) {
    try {
      const title =
        dto.title?.trim() || `${originalTitle} (${dto.style} version)`;
      const music = await this.miniMaxService
        .generateMusic(
          {
            title,
            style: dto.style,
            lyrics: dto.lyrics ?? '',
          },
          this.buildAiRequestContext(taskId, 'generating remix music', 50),
        )
        .catch(() =>
          this.mockService.generateMusic({
            title,
            style: dto.style,
            lyrics: dto.lyrics ?? '',
          }),
        );

      const audioUrl = await this.audioStorageService.persistAudio(
        music.audioUrl,
        taskId,
      );

      const song = await this.prisma.song.create({
        data: {
          title,
          style: dto.style,
          prompt: dto.prompt,
          lyrics: dto.lyrics,
          audioUrl,
          duration: music.duration ?? 0,
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
          stage: 'done',
          songId: song.id,
          result: { song: mapSong(song) },
        },
      });
    } catch (error) {
      await this.prisma.aiTask.update({
        where: { id: taskId },
        data: {
          status: 'error',
          stage: 'failed',
          progress: 0,
          error: JSON.stringify({
            code: 600,
            message: error instanceof Error ? error.message : 'remix failed',
          }),
        },
      });
      await this.refundTaskCost(taskId, user.id, REMIX_COST, 'remix refund');
    }
  }

  async generateDj(songId: string) {
    const song = await this.prisma.song.findUnique({ where: { id: songId } });
    if (!song) throw new NotFoundException('song not found');

    let djText = this.mockService.generateDjText(song.title).text;
    try {
      const scriptResult = await this.miniMaxService.generateDjScript({
        title: song.title,
        style: song.style,
        lyrics: song.lyrics || undefined,
        authorName: song.authorName || undefined,
      });
      if (scriptResult?.text) {
        djText = scriptResult.text;
      }
    } catch (error) {
      console.error('[DJ] script generation failed:', error);
    }

    let djUrl: string | null = null;
    try {
      const ttsUrl = await this.miniMaxService.generateTts(djText, song.style);
      if (ttsUrl) {
        const persistedUrl = await this.audioStorageService.persistAudio(
          ttsUrl,
          `dj_${songId}`,
        );
        djUrl = persistedUrl ?? null;
      }
    } catch (error) {
      console.error('[DJ] tts generation failed:', error);
    }

    await this.prisma.song.update({
      where: { id: songId },
      data: { djText, djUrl },
    });
    return { text: djText, audioUrl: djUrl };
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

    if (!album) throw new NotFoundException('album not found');

    const tracks = album.albumSongs.map((as) => mapSong(as.song));
    return buildSampleAlbumPayload({
      album,
      tracks,
    });
  }

  dayLyric(type: 'vocal' | 'instrumental') {
    return this.mockService.generateDayLyric(type);
  }

  async getQueueStatus() {
    return {
      active: this.aiConcurrencyService.getActiveCount(),
      pending: this.aiConcurrencyService.getPendingCount(),
      max: this.aiConcurrencyService.getMaxConcurrency(),
    };
  }

  async getTaskSample(id: string, user?: User) {
    const task = await this.prisma.aiTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('task not found');
    this.assertTaskOwner(task.userId, user);

    const song = task.songId
      ? await this.prisma.song.findUnique({ where: { id: task.songId } })
      : null;
    const album = task.albumId
      ? await this.prisma.album.findUnique({
          where: { id: task.albumId },
          include: {
            albumSongs: {
              include: { song: true },
              orderBy: { order: 'asc' },
            },
          },
        })
      : null;

    const result = task.result as Record<string, unknown> | null;
    const mappedAlbum = album
      ? buildSampleAlbumPayload({
          album,
          tracks: album.albumSongs.map((as) => mapSong(as.song)),
        }).album
      : ((result?.album as Record<string, unknown> | undefined) ?? null);

    const mappedSong = song
      ? mapSong(song)
      : ((result?.song as Record<string, unknown> | undefined) ?? null);

    const queuePos =
      task.status === 'queued' ? await this.getDynamicQueueAhead(task) : 0;

    return buildSampleTaskPayload({
      taskId: task.id,
      status: task.status,
      song: mappedSong,
      album: mappedAlbum,
      stage: task.stage,
      error: task.error,
      progress: task.progress,
      queuePos,
      queueAhead: queuePos,
      active: this.aiConcurrencyService.getActiveCount(),
      maxConcurrency: this.aiConcurrencyService.getMaxConcurrency(),
      result: task.result,
    });
  }

  private getCurrentQueueAhead() {
    return (
      this.aiConcurrencyService.getActiveCount() +
      this.aiConcurrencyService.getPendingCount()
    );
  }

  private buildAiRequestContext(
    taskId: string | undefined,
    stage: string,
    progress: number,
  ): AiRequestContext | undefined {
    if (!taskId) return undefined;
    return {
      taskId,
      onStart: () => this.markTaskRunning(taskId, stage, progress),
    };
  }

  private async markTaskRunning(
    taskId: string,
    stage: string,
    progress: number,
  ) {
    await this.prisma.aiTask.update({
      where: { id: taskId },
      data: {
        status: 'running',
        stage,
        progress,
        queueAhead: 0,
      },
    });
  }

  private async getDynamicQueueAhead(task: { id: string; createdAt: Date }) {
    const inMemoryAhead = this.aiConcurrencyService.getQueueAhead(task.id);
    if (inMemoryAhead !== null) return inMemoryAhead;

    return this.prisma.aiTask.count({
      where: {
        status: { in: ['queued', 'running'] },
        createdAt: { lt: task.createdAt },
      },
    });
  }

  private buildSubmitResponse(
    taskId: string,
    queueAhead: number,
    points: number,
    cost: number,
  ) {
    return {
      taskId,
      status: 'queued',
      queuePos: queueAhead,
      queueAhead,
      active: this.aiConcurrencyService.getActiveCount(),
      concurrency: this.aiConcurrencyService.getMaxConcurrency(),
      maxConcurrency: this.aiConcurrencyService.getMaxConcurrency(),
      points,
      cost,
    };
  }

  private assertTaskOwner(taskUserId: string | null, user?: User) {
    if (user && taskUserId && taskUserId !== user.id) {
      throw new ForbiddenException('Forbidden task access');
    }
  }

  private async markTaskFailed(
    taskId: string,
    error: unknown,
    userId?: string,
    cost = 0,
  ) {
    await this.prisma.aiTask.update({
      where: { id: taskId },
      data: {
        status: 'error',
        stage: 'failed',
        progress: 0,
        error: JSON.stringify({
          code: 600,
          message: error instanceof Error ? error.message : 'AI task failed',
        }),
      },
    });
    if (userId && cost > 0) {
      await this.refundTaskCost(taskId, userId, cost, 'AI task refund');
    }
  }

  private async refundTaskCost(
    taskId: string,
    userId: string,
    cost: number,
    reason: string,
  ) {
    if (cost <= 0) return;

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.pointsLedger.findFirst({
        where: { userId, relatedId: taskId, delta: cost },
      });
      if (existing) return;

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) return;

      const balance = user.points + cost;
      await tx.user.update({
        where: { id: userId },
        data: { points: balance },
      });
      await tx.pointsLedger.create({
        data: {
          userId,
          delta: cost,
          reason,
          balance,
          relatedId: taskId,
        },
      });
    });
  }
}
