import { Injectable } from '@nestjs/common';
import { MusicRequestDto } from '../ai/dto/music-request.dto';
import { MiniMaxService } from '../ai/minimax.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SongsService {
  constructor(
    private readonly miniMaxService: MiniMaxService,
    private readonly prisma: PrismaService,
  ) {}

  async generateAndSave(dto: MusicRequestDto) {
    const generatedMusic = await this.miniMaxService.generateMusic(dto);

    return this.prisma.song.create({
      data: {
        title: dto.title,
        style: dto.style,
        prompt: dto.style,
        status: 'generated',
        audioUrl: generatedMusic.audioUrl,
        lyric: dto.lyrics,
      },
    });
  }
}
