import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { CoverRequestDto } from './dto/cover-request.dto';
import { LyricsRequestDto } from './dto/lyrics-request.dto';
import { MusicRequestDto } from './dto/music-request.dto';

type MiniMaxSdk = typeof import('../../node_modules/minimax-api/dist/index.js');

const MINIMAX_BASE_URL = 'https://api.minimaxi.com';
const TEXT_MODEL = 'MiniMax-M3';
const MUSIC_MODEL = 'music-2.6';
const IMAGE_MODEL = 'image-01';
const TTS_MODEL = 'tts-1';
const nodeRequire = createRequire(__filename);

const MODE_PROMPTS: Record<string, string> = {
  song: '你是专业中文流行歌曲创作人，擅长根据灵感创作动人旋律和歌词，风格多样，情感真挚。',
  meme: '你是幽默音乐人，擅长将网络热梗和吐槽变成洗脑神曲，歌词要搞笑魔性，旋律抓耳。',
  emotion:
    '你是情感疗愈音乐人，擅长将复杂情绪转化为细腻温暖的歌词，风格抒情治愈，触动人心。',
  photo:
    '你是视觉音乐创作者，擅长根据图片内容创作意境匹配的歌曲，歌词要富有画面感。',
  foryou:
    '你是浪漫音乐人，擅长创作送给特定对象的专属歌曲，歌词要饱含深情和故事感，适合表白和纪念。',
};

type JsonObject = Record<string, unknown>;

@Injectable()
export class MiniMaxService {
  private sdk: MiniMaxSdk | null = null;

  getStatus() {
    return {
      provider: 'minimax',
      sdk: 'minimax-api',
      available: this.hasApiKey(),
      models: {
        text: TEXT_MODEL,
        music: MUSIC_MODEL,
        image: IMAGE_MODEL,
        tts: TTS_MODEL,
      },
    };
  }

  async generateLyrics(dto: LyricsRequestDto) {
    try {
      const client = this.getClient();
      const systemPrompt = MODE_PROMPTS[dto.mode || 'song'];

      if (dto.image) {
        return this.generateLyricsFromImage(dto, systemPrompt);
      }

      const userPrompt = this.buildLyricsUserPrompt(dto);

      const response = await client.chat.createCompletion({
        model: TEXT_MODEL,
        max_completion_tokens: 800,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });
      this.assertProviderSuccess(response.data);
      const rawText = response.data.choices[0]?.message.content?.trim();
      if (!rawText) {
        throw new BadGatewayException('MiniMax 歌词生成结果为空。');
      }
      return this.parseLyrics(rawText);
    } catch (error) {
      this.handleMiniMaxError(error);
    }
  }

  private async generateLyricsFromImage(
    dto: LyricsRequestDto,
    systemPrompt: string,
  ) {
    const apiKey = process.env.MINIMAX_API_KEY?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException('MINIMAX_API_KEY 未配置');
    }
    const extraPrompt = dto.prompt ? `额外要求：${dto.prompt}` : '';
    const stylePrompt = dto.styles?.length
      ? `风格倾向：${dto.styles.join('、')}`
      : '';

    const response = await fetch(`${MINIMAX_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: TEXT_MODEL,
        max_completion_tokens: 1200,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `看这张图片，为它写一首中文歌。${stylePrompt}${extraPrompt ? '，' + extraPrompt : ''}\n严格用如下格式输出：\n标题：xxx\n风格：xxx,xxx\n歌词：\n[Verse]...`,
              },
              {
                type: 'image_url',
                image_url: { url: dto.image },
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    this.assertProviderSuccess(data);
    const rawText = data.choices?.[0]?.message?.content?.trim() || '';
    if (!rawText) {
      throw new BadGatewayException('MiniMax 歌词生成结果为空。');
    }
    return this.parseImageLyrics(rawText);
  }

  private parseImageLyrics(rawText: string) {
    const cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    let title = (cleaned.match(/标题：(.+)/) || [])[1] || '';
    if (!title) {
      const titleMatch = cleaned.match(/^#\s*(.+)$/m);
      title = titleMatch
        ? titleMatch[1].replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '')
        : '';
    }

    let style = (cleaned.match(/风格：(.+)/) || [])[1] || '';
    if (!style) {
      const styleMatch = cleaned.match(/\*\*Style:\*\*\s*(.+)$/m);
      style = styleMatch ? styleMatch[1].replace(/\*/g, '') : '';
    }

    let lyrics = '';
    const lyricsMatch = cleaned.split(/歌词：/);
    if (lyricsMatch.length > 1) {
      lyrics = lyricsMatch[1].trim();
    } else {
      const verseMatch = cleaned.match(/\[Verse[\s\S]*$/);
      lyrics = verseMatch ? verseMatch[0].trim() : '';
      if (!lyrics) {
        const lines = cleaned
          .split('\n')
          .filter(
            (line) =>
              !line.startsWith('#') &&
              !line.startsWith('**') &&
              !line.startsWith('---') &&
              line.trim(),
          );
        lyrics = lines.join('\n');
      }
    }

    return {
      title: title.trim() || '看图写的歌',
      style: style.trim() || 'pop, emotional',
      lyrics: lyrics || cleaned,
      rawText,
    };
  }

  private buildLyricsUserPrompt(dto: LyricsRequestDto): string {
    let prompt = '请根据以下信息创作一首中文歌曲：\n';
    prompt += `灵感：${dto.prompt}\n`;

    if (dto.forWho) {
      prompt += `写给：${dto.forWho}\n`;
    }

    if (dto.styles?.length) {
      prompt += `风格：${dto.styles.join('、')}\n`;
    }

    prompt +=
      '只返回JSON格式：{"title":"歌曲标题","style":"歌曲风格","lyrics":"完整歌词，包含[Verse][Chorus][Bridge]等段落标记"}';

    return prompt;
  }

  async generateReview(song: {
    title: string;
    style: string;
    lyrics?: string;
  }) {
    try {
      const client = this.getClient();
      const response = await client.chat.createCompletion({
        model: TEXT_MODEL,
        max_completion_tokens: 200,
        messages: [
          {
            role: 'system',
            content:
              '你是 Echo AI 音乐社区的 AI 主理人，擅长用简短精炼的语言写乐评。乐评要富有感染力，1-2句话即可，带🤖标识。',
          },
          {
            role: 'user',
            content: `请为歌曲《${song.title}》（风格：${song.style}）写一段简短乐评。`,
          },
        ],
      });
      this.assertProviderSuccess(response.data);
      const text = response.data.choices[0]?.message.content?.trim() || '';
      return { text };
    } catch (error) {
      this.handleMiniMaxError(error);
    }
  }

  async generatePublishCopy(song: {
    title: string;
    style: string;
    lyrics?: string;
  }) {
    try {
      const client = this.getClient();
      const response = await client.chat.createCompletion({
        model: TEXT_MODEL,
        max_completion_tokens: 300,
        messages: [
          {
            role: 'system',
            content:
              '你是 Echo AI 音乐社区的 AI 主理人，擅长为歌曲生成吸引人的发布文案和标签。返回JSON格式：{"description":"简介","tags":["标签1","标签2","标签3"]}。',
          },
          {
            role: 'user',
            content: `请为歌曲《${song.title}》（风格：${song.style}）生成发布文案和3个标签。`,
          },
        ],
      });
      this.assertProviderSuccess(response.data);
      const rawText = response.data.choices[0]?.message.content?.trim() || '';
      const jsonText = this.extractJsonText(rawText);
      const parsed = jsonText ? this.safeParseObject(jsonText) : null;
      return {
        description: this.pickString(parsed, 'description') || '',
        tags: Array.isArray(parsed?.tags)
          ? parsed.tags.map((t: unknown) => String(t))
          : [],
      };
    } catch (error) {
      this.handleMiniMaxError(error);
    }
  }

  async generateTts(text: string): Promise<string> {
    try {
      const client = this.getClient();
      const response = await client.speech.synthesize({
        model: 'speech-2.8-hd',
        text,
        voice_setting: {
          voice_id: 'Chinese (Mandarin)_Lyrical_Voice',
          speed: 1.0,
        },
        audio_setting: {
          sample_rate: 32000,
          format: 'mp3',
        },
      });
      this.assertProviderSuccess(response.data);
      const data = response.data.data as { audio_url?: string; audio?: string };

      if (data.audio_url) {
        return data.audio_url;
      }

      if (data.audio) {
        const hexString = data.audio;
        const buffer = Buffer.from(hexString, 'hex');
        const base64 = buffer.toString('base64');
        return `data:audio/mp3;base64,${base64}`;
      }

      return '';
    } catch (error) {
      this.handleMiniMaxError(error);
    }
  }

  async generateMusic(dto: MusicRequestDto) {
    try {
      const client = this.getClient();
      const isInstrumental = dto.isInstrumental ?? !dto.lyrics?.trim();
      const musicPrompt = isInstrumental
        ? `${dto.style}, instrumental, no vocals, background music, ambient, melody only`
        : dto.style;

      const lyrics = isInstrumental
        ? '[Instrumental]\nThis is instrumental background music without vocals.'
        : dto.lyrics || '';

      const response = await client.music.generate({
        model: MUSIC_MODEL,
        prompt: musicPrompt,
        lyrics,
        audio_setting: {
          sample_rate: 44100,
          bitrate: 256000,
          format: 'mp3',
        },
        output_format: 'url',
      });
      this.assertProviderSuccess(response.data);
      const durationMs =
        response.data.extra_info?.music_duration ??
        (
          response.data.data as
            | {
                extra_info?: { music_duration?: number };
              }
            | undefined
        )?.extra_info?.music_duration;

      return {
        status: 'generated',
        title: dto.title,
        style: dto.style,
        audioUrl: response.data.data?.audio ?? null,
        duration: durationMs ? Math.round(durationMs / 1000) : 0,
        providerResponse: response.data,
      };
    } catch (error) {
      this.handleMiniMaxError(error);
    }
  }

  async generateCover(dto: CoverRequestDto) {
    try {
      const client = this.getClient();
      const prompt =
        dto.prompt?.trim() ||
        `Album cover art, ${dto.title ?? 'Chinese song'}, ${dto.style ?? 'warm pop music'}, no text, high quality`;
      const response = await client.image.generateFromText({
        model: IMAGE_MODEL,
        prompt,
        aspect_ratio: '1:1',
        response_format: 'url',
      });
      this.assertProviderSuccess(response.data);

      return {
        status: 'generated',
        imageUrl: response.data.data.image_urls?.[0] ?? null,
        providerResponse: response.data,
      };
    } catch (error) {
      this.handleMiniMaxError(error);
    }
  }

  private hasApiKey() {
    return Boolean(process.env.MINIMAX_API_KEY?.trim());
  }

  private getClient() {
    const apiKey = process.env.MINIMAX_API_KEY?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'MINIMAX_API_KEY 未配置，请在后端 .env 或服务器 SERVER_ENV 中配置。',
      );
    }
    return this.getSdk().MiniMaxClient.create({
      apiKey,
      baseURL: MINIMAX_BASE_URL,
      timeout: 180000,
    });
  }

  private getSdk() {
    if (!this.sdk) {
      const sdkPath = join(
        process.cwd(),
        'node_modules',
        'minimax-api',
        'dist',
        'index.js',
      );
      this.sdk = nodeRequire(sdkPath) as MiniMaxSdk;
    }
    return this.sdk;
  }

  private assertProviderSuccess(payload: {
    base_resp?: { status_code: number; status_msg: string };
  }) {
    const baseResp = payload.base_resp;
    if (baseResp && baseResp.status_code !== 0) {
      throw new BadGatewayException(`MiniMax 请求失败：${baseResp.status_msg}`);
    }
  }

  private handleMiniMaxError(error: unknown): never {
    if (
      error instanceof ServiceUnavailableException ||
      error instanceof BadGatewayException
    ) {
      throw error;
    }
    if (error instanceof this.getSdk().MiniMaxError) {
      throw new BadGatewayException(`MiniMax 请求失败：${error.message}`);
    }
    if (error instanceof Error) {
      throw new BadGatewayException(`MiniMax 请求失败：${error.message}`);
    }
    throw new BadGatewayException('MiniMax 请求失败：未知错误');
  }

  private parseLyrics(rawText: string) {
    const jsonText = this.extractJsonText(rawText);
    const parsed = jsonText ? this.safeParseObject(jsonText) : null;
    const title = this.pickString(parsed, 'title') || 'AI 生成歌曲';
    const style = this.pickString(parsed, 'style') || '中文流行';
    const lyrics = this.pickString(parsed, 'lyrics') || rawText;

    return {
      title,
      style,
      lyrics,
      rawText,
    };
  }

  private extractJsonText(text: string) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }
    return text.slice(start, end + 1);
  }

  private safeParseObject(text: string): JsonObject | null {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        return parsed as JsonObject;
      }
      return null;
    } catch {
      return null;
    }
  }

  private pickString(source: JsonObject | null, key: string) {
    const value = source?.[key];
    return typeof value === 'string' && value.trim() ? value.trim() : '';
  }
}
