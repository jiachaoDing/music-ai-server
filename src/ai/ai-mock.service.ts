import { Injectable } from '@nestjs/common';
import { LyricsRequestDto } from './dto/lyrics-request.dto';
import { MusicRequestDto } from './dto/music-request.dto';
import { CoverRequestDto } from './dto/cover-request.dto';

const STYLE_TAGS = [
  '流行',
  '国风',
  '抒情',
  '电子',
  '摇滚',
  '民谣',
  '说唱',
  '爵士',
  '治愈',
  '欢快',
  '伤感',
  'Lo-fi',
];

@Injectable()
export class AiMockService {
  generateLyrics(dto: LyricsRequestDto) {
    const styles = dto.styles?.length ? dto.styles : ['流行', '治愈'];
    const prompt = dto.prompt || '未命名';
    return {
      title: `《${prompt.slice(0, 12)}》`,
      styles,
      style: styles.join(' / '),
      lyrics: `[Verse]\n关于「${prompt}」的歌词\n[Chorus]\n回声在此回响`,
      tags: styles.slice(0, 3),
      rawText: prompt,
      mock: true,
    };
  }

  generateMusic(dto: MusicRequestDto) {
    return {
      status: 'generated',
      title: dto.title,
      style: dto.style,
      audioUrl: 'https://example.com/mock-audio.mp3',
      duration: 0,
      mock: true,
    };
  }

  generateCover(dto: CoverRequestDto) {
    return {
      status: 'generated',
      imageUrl: 'https://picsum.photos/seed/echo-music/512/512',
      mock: true,
    };
  }

  generateDjText(title: string) {
    return {
      text: `接下来这首歌，像一盏开在深夜路口的灯。欢迎来到回声电台，为你播放「${title}」。`,
      audioUrl: null,
      mock: true,
    };
  }

  generateDayLyric(type: 'vocal' | 'instrumental', keyword = '今日好运') {
    const instrumental = type === 'instrumental';
    return {
      title: instrumental ? '今日微光（纯音乐）' : '今日微光',
      lyrics: instrumental
        ? ''
        : `[Verse]\n今天的风很轻\n关键词：${keyword}\n[Chorus]\n我把松弛写成旋律`,
      style: '治愈 / Lo-fi',
      styles: ['治愈', 'Lo-fi'],
      mode: 'fortune',
      isInstrumental: instrumental,
      mock: true,
    };
  }

  static pickStyles(input?: string[]) {
    return input?.length ? input : ['流行', '治愈'];
  }

  static styleTags() {
    return STYLE_TAGS;
  }
}
