import { Injectable } from '@nestjs/common';
import { GenerateSongDto } from './dto/generate-song.dto';

const demoSongs = [
  {
    id: 'song_001',
    title: 'Campus Sunrise',
    style: 'pop',
    prompt: '校园、清晨、轻快',
    status: 'ready',
  },
  {
    id: 'song_002',
    title: 'Neon Rain',
    style: 'electronic',
    prompt: '雨夜、霓虹、电子',
    status: 'ready',
  },
];

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'music-ai-server',
      timestamp: new Date().toISOString(),
    };
  }

  getSongs() {
    return demoSongs;
  }

  generateMock(dto: GenerateSongDto) {
    const style = dto.style?.trim() || 'pop';
    return {
      id: `mock_${Date.now()}`,
      title: `Mock ${style} Song`,
      style,
      prompt: dto.prompt,
      status: 'generated',
      audioUrl: null,
      lyric: `这是一首关于「${dto.prompt}」的 mock 歌曲歌词。`,
      createdAt: new Date().toISOString(),
    };
  }
}
