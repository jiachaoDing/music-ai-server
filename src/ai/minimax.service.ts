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
const nodeRequire = createRequire(__filename);

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
      },
    };
  }

  async generateLyrics(dto: LyricsRequestDto) {
    try {
      const client = this.getClient();
      const response = await client.chat.createCompletion({
        model: TEXT_MODEL,
        max_completion_tokens: 800,
        messages: [
          {
            role: 'user',
            content:
              '请根据用户输入生成一首中文歌曲的标题、风格和歌词。只返回 JSON，格式为 {"title":"歌曲标题","style":"歌曲风格","lyrics":"完整歌词"}。用户输入：' +
              dto.prompt,
          },
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

  async generateMusic(dto: MusicRequestDto) {
    try {
      const client = this.getClient();
      const response = await client.music.generate({
        model: MUSIC_MODEL,
        prompt: dto.style,
        lyrics: dto.lyrics,
        audio_setting: {
          sample_rate: 44100,
          bitrate: 256000,
          format: 'mp3',
        },
        output_format: 'url',
      });
      this.assertProviderSuccess(response.data);

      return {
        status: 'generated',
        title: dto.title,
        style: dto.style,
        audioUrl: response.data.data?.audio ?? null,
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
