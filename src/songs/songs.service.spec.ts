import { BadGatewayException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MiniMaxService } from '../ai/minimax.service';
import { SongsService } from './songs.service';

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    async $disconnect() {
      return undefined;
    }
  },
}));

describe('SongsService', () => {
  const dto = {
    title: '毕业那天的风',
    style: '流行, 温暖, 治愈',
    lyrics: '第一段歌词...\n副歌歌词...',
  };

  let miniMaxService: { generateMusic: ReturnType<typeof vi.fn> };
  let prismaService: {
    user: { upsert: ReturnType<typeof vi.fn> };
    song: { create: ReturnType<typeof vi.fn> };
  };
  let songsService: SongsService;

  beforeEach(() => {
    miniMaxService = {
      generateMusic: vi.fn(),
    };
    prismaService = {
      user: {
        upsert: vi.fn(),
      },
      song: {
        create: vi.fn(),
      },
    };
    songsService = new SongsService(
      miniMaxService as unknown as MiniMaxService,
      prismaService as never,
    );
  });

  it('generates music and saves the created song', async () => {
    const createdAt = new Date('2026-06-29T00:00:00.000Z');
    const updatedAt = new Date('2026-06-29T00:00:01.000Z');
    const createdSong = {
      id: 'song_001',
      title: dto.title,
      style: dto.style,
      prompt: dto.style,
      status: 'generated',
      audioUrl: 'https://example.com/song.mp3',
      lyrics: dto.lyrics,
      authorId: 'system-user',
      authorName: 'Echo Creator',
      authorColor: null,
      createdAt,
      updatedAt,
    };
    const author = {
      id: 'system-user',
      name: 'Echo Creator',
      color: null,
    };

    miniMaxService.generateMusic.mockResolvedValue({
      status: 'generated',
      title: dto.title,
      style: dto.style,
      audioUrl: createdSong.audioUrl,
      providerResponse: {},
    });
    prismaService.user.upsert.mockResolvedValue(author);
    prismaService.song.create.mockResolvedValue(createdSong);

    await expect(songsService.generateAndSave(dto)).resolves.toEqual(
      createdSong,
    );
    expect(miniMaxService.generateMusic).toHaveBeenCalledWith(dto);
    expect(prismaService.user.upsert).toHaveBeenCalledWith({
      where: { id: 'system-user' },
      update: {},
      create: {
        id: 'system-user',
        name: 'Echo Creator',
        passwordHash: 'system-generated-user',
      },
    });
    expect(prismaService.song.create).toHaveBeenCalledWith({
      data: {
        title: dto.title,
        style: dto.style,
        prompt: dto.style,
        status: 'generated',
        audioUrl: createdSong.audioUrl,
        lyrics: dto.lyrics,
        author: { connect: { id: author.id } },
        authorName: author.name,
        authorColor: author.color,
      },
    });
  });

  it('does not create a song when music generation fails', async () => {
    const error = new BadGatewayException('MiniMax 请求失败');
    miniMaxService.generateMusic.mockRejectedValue(error);

    await expect(songsService.generateAndSave(dto)).rejects.toBe(error);
    expect(prismaService.song.create).not.toHaveBeenCalled();
  });
});
