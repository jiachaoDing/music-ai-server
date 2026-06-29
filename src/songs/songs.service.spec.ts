import { BadGatewayException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MiniMaxService } from '../ai/minimax.service';
import { PrismaService } from '../prisma/prisma.service';
import { SongsService } from './songs.service';

describe('SongsService', () => {
  const dto = {
    title: '毕业那天的风',
    style: '流行, 温暖, 治愈',
    lyrics: '第一段歌词...\n副歌歌词...',
  };

  let miniMaxService: { generateMusic: ReturnType<typeof vi.fn> };
  let prismaService: { song: { create: ReturnType<typeof vi.fn> } };
  let songsService: SongsService;

  beforeEach(() => {
    miniMaxService = {
      generateMusic: vi.fn(),
    };
    prismaService = {
      song: {
        create: vi.fn(),
      },
    };
    songsService = new SongsService(
      miniMaxService as unknown as MiniMaxService,
      prismaService as unknown as PrismaService,
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
      lyric: dto.lyrics,
      createdAt,
      updatedAt,
    };

    miniMaxService.generateMusic.mockResolvedValue({
      status: 'generated',
      title: dto.title,
      style: dto.style,
      audioUrl: createdSong.audioUrl,
      providerResponse: {},
    });
    prismaService.song.create.mockResolvedValue(createdSong);

    await expect(songsService.generateAndSave(dto)).resolves.toEqual(
      createdSong,
    );
    expect(miniMaxService.generateMusic).toHaveBeenCalledWith(dto);
    expect(prismaService.song.create).toHaveBeenCalledWith({
      data: {
        title: dto.title,
        style: dto.style,
        prompt: dto.style,
        status: 'generated',
        audioUrl: createdSong.audioUrl,
        lyric: dto.lyrics,
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
