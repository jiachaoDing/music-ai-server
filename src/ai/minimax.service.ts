import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { AiConcurrencyService } from './ai-concurrency.service';
import { CoverRequestDto } from './dto/cover-request.dto';
import { LyricsRequestDto } from './dto/lyrics-request.dto';
import { MusicRequestDto } from './dto/music-request.dto';

type MiniMaxSdk = typeof import('../../node_modules/minimax-api/dist/index.js');
type JsonObject = Record<string, unknown>;

export type AiRequestContext = {
  taskId?: string;
  onStart?: () => Promise<void> | void;
  retries?: number;
  timeoutMs?: number;
};

const MINIMAX_BASE_URL = 'https://api.minimaxi.com';
const TEXT_MODEL = 'MiniMax-M3';
const MUSIC_MODEL = 'music-2.6';
const IMAGE_MODEL = 'image-01';
const TTS_MODEL = 'tts-1';
const DEFAULT_RETRIES = 2;
const DEFAULT_TIMEOUT_MS = 240000;
const nodeRequire = createRequire(__filename);

const MODE_PROMPTS: Record<string, string> = {
  song: 'Write a complete Chinese pop song with clear verse and chorus sections.',
  meme: 'Turn the idea into a catchy and humorous Chinese meme song.',
  emotion: 'Turn the emotion or diary-like input into a warm Chinese lyric.',
  photo: 'Write a Chinese song based on the image and the extra instruction.',
  foryou: 'Write a sincere Chinese song for the specified person.',
};

const STYLE_VOICE_MAP: Record<string, { voice_id: string; speed: number }> = {
  'lo-fi': { voice_id: 'male-qn-qingse', speed: 0.9 },
  jazz: { voice_id: 'female-qingse', speed: 0.95 },
  rock: { voice_id: 'male-qn-jingying', speed: 1.1 },
  electronic: { voice_id: 'female-shaonv', speed: 1.1 },
  pop: { voice_id: 'female-qingse', speed: 1.0 },
};

@Injectable()
export class MiniMaxService {
  private sdk: MiniMaxSdk | null = null;

  constructor(private readonly aiConcurrencyService: AiConcurrencyService) {}

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

  async generateLyrics(dto: LyricsRequestDto, context?: AiRequestContext) {
    try {
      if (dto.image) {
        return this.generateLyricsFromImage(dto, context);
      }

      const wrappedPrompt = this.wrapLyricsPrompt(dto);
      const response = await this.runProviderRequest(async () => {
        const client = this.getClient();
        return client.music.generateLyrics({
          mode: 'write_full_song',
          prompt: wrappedPrompt,
        });
      }, context);

      this.assertProviderSuccess(response.data);
      const lyrics = response.data.lyrics?.trim() || '';
      if (!lyrics) {
        throw new BadGatewayException('MiniMax lyrics response is empty');
      }

      return {
        title: response.data.song_title?.trim() || 'Untitled',
        style: response.data.style_tags?.trim() || '',
        lyrics,
        rawText: JSON.stringify(response.data),
      };
    } catch (error) {
      this.handleMiniMaxError(error);
    }
  }

  async generateHostTopic(vibe: {
    title: string;
    style: string;
    keyword: string;
  }) {
    try {
      const response = await this.runProviderRequest(async () => {
        const client = this.getClient();
        return client.chat.createCompletion({
          model: TEXT_MODEL,
          max_completion_tokens: 300,
          messages: [
            {
              role: 'system',
              content:
                'You are the AI curator of a music community. Return JSON only: {"title":"","emoji":"","desc":""}.',
            },
            {
              role: 'user',
              content: `Topic seed: ${vibe.title}\nStyle: ${vibe.style}\nKeyword: ${vibe.keyword}`,
            },
          ],
        });
      });

      this.assertProviderSuccess(response.data);
      const rawText = response.data.choices[0]?.message.content?.trim() || '';
      const parsed = this.safeParseObject(this.extractJsonText(rawText) ?? '');
      return {
        title: this.pickString(parsed, 'title') || vibe.title,
        emoji: this.pickString(parsed, 'emoji') || '*',
        desc:
          this.pickString(parsed, 'desc') ||
          `Create a song around ${vibe.keyword} in ${vibe.style}.`,
      };
    } catch (error) {
      this.handleMiniMaxError(error);
    }
  }

  async generateHostPickComment(song: {
    title: string;
    style: string;
    lyrics?: string;
    authorName?: string;
  }) {
    try {
      const lyricsPreview = song.lyrics ? song.lyrics.slice(0, 240) : '';
      const response = await this.runProviderRequest(async () => {
        const client = this.getClient();
        return client.chat.createCompletion({
          model: TEXT_MODEL,
          max_completion_tokens: 220,
          messages: [
            {
              role: 'system',
              content:
                'Write a short, warm music community curator comment in Chinese. No markdown and no JSON.',
            },
            {
              role: 'user',
              content: `Song: ${song.title}\nAuthor: ${song.authorName ?? 'creator'}\nStyle: ${song.style}\nLyrics preview: ${lyricsPreview}`,
            },
          ],
        });
      });

      this.assertProviderSuccess(response.data);
      const text =
        response.data.choices[0]?.message.content
          ?.replace(/<think>[\s\S]*?<\/think>/gi, '')
          .trim() || '';
      return {
        text:
          text ||
          `This song, ${song.title}, has a sincere expression worth hearing.`,
      };
    } catch (error) {
      this.handleMiniMaxError(error);
    }
  }

  async generateHostOfficialSong(vibe: {
    title: string;
    style: string;
    keyword: string;
  }) {
    try {
      const titleResponse = await this.runProviderRequest(async () => {
        const client = this.getClient();
        return client.chat.createCompletion({
          model: TEXT_MODEL,
          max_completion_tokens: 120,
          messages: [
            {
              role: 'user',
              content: `Name a Chinese song for this theme. Output only the title, max 12 Chinese characters.\nTheme: ${vibe.title}\nKeyword: ${vibe.keyword}`,
            },
          ],
        });
      });

      this.assertProviderSuccess(titleResponse.data);
      const title =
        titleResponse.data.choices[0]?.message.content
          ?.replace(/<think>[\s\S]*?<\/think>/gi, '')
          .replace(/[《》"'`]/g, '')
          .split('\n')[0]
          .trim()
          .slice(0, 12) || vibe.title.slice(0, 12);

      const lyricsResponse = await this.runProviderRequest(async () => {
        const client = this.getClient();
        return client.chat.createCompletion({
          model: TEXT_MODEL,
          max_completion_tokens: 1600,
          messages: [
            {
              role: 'user',
              content: `Write complete Chinese lyrics with [Verse], [Chorus] and [Bridge].\nTheme: ${vibe.title}\nKeyword: ${vibe.keyword}`,
            },
          ],
        });
      });

      this.assertProviderSuccess(lyricsResponse.data);
      const lyrics =
        lyricsResponse.data.choices[0]?.message.content
          ?.replace(/<think>[\s\S]*?<\/think>/gi, '')
          .trim() || '';

      return {
        title,
        style: vibe.style,
        lyrics,
      };
    } catch (error) {
      this.handleMiniMaxError(error);
    }
  }

  async generateReview(
    song: {
      title: string;
      style: string;
      lyrics?: string;
    },
    context?: AiRequestContext,
  ) {
    try {
      const response = await this.runProviderRequest(async () => {
        const client = this.getClient();
        return client.chat.createCompletion({
          model: TEXT_MODEL,
          max_completion_tokens: 200,
          messages: [
            {
              role: 'system',
              content:
                'Write a concise Chinese music review in one or two sentences.',
            },
            {
              role: 'user',
              content: `Song: ${song.title}\nStyle: ${song.style}\nLyrics: ${song.lyrics ?? ''}`,
            },
          ],
        });
      }, context);

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
      const response = await this.runProviderRequest(async () => {
        const client = this.getClient();
        return client.chat.createCompletion({
          model: TEXT_MODEL,
          max_completion_tokens: 300,
          messages: [
            {
              role: 'system',
              content:
                'Return JSON only: {"description":"short Chinese publish copy","tags":["tag1","tag2","tag3"]}.',
            },
            {
              role: 'user',
              content: `Song: ${song.title}\nStyle: ${song.style}\nLyrics: ${song.lyrics ?? ''}`,
            },
          ],
        });
      });

      this.assertProviderSuccess(response.data);
      const rawText = response.data.choices[0]?.message.content?.trim() || '';
      const parsed = this.safeParseObject(this.extractJsonText(rawText) ?? '');
      return {
        description: this.pickString(parsed, 'description') || '',
        tags: Array.isArray(parsed?.tags)
          ? parsed.tags.map((tag: unknown) => String(tag))
          : [],
      };
    } catch (error) {
      this.handleMiniMaxError(error);
    }
  }

  async generateDjScript(
    song: {
      title: string;
      style: string;
      lyrics?: string;
      authorName?: string;
    },
    context?: AiRequestContext,
  ) {
    try {
      const apiKey = process.env.MINIMAX_API_KEY?.trim();
      if (!apiKey) {
        throw new ServiceUnavailableException('MINIMAX_API_KEY is not set');
      }

      const lyricsPreview = song.lyrics ? song.lyrics.slice(0, 100) : '';
      const data = await this.runProviderRequest(async () => {
        const response = await fetch(
          `${MINIMAX_BASE_URL}/v1/chat/completions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: TEXT_MODEL,
              max_completion_tokens: 300,
              temperature: 0.8,
              messages: [
                {
                  role: 'system',
                  content:
                    'Write a 60-80 character Chinese AI DJ intro for a song. No markdown.',
                },
                {
                  role: 'user',
                  content: `Song: ${song.title}\nStyle: ${song.style}\nLyrics preview: ${lyricsPreview}`,
                },
              ],
            }),
          },
        );
        return this.parseFetchJson(response);
      }, context);

      this.assertProviderSuccess(data);
      const rawText = data.choices?.[0]?.message?.content?.trim() || '';
      const text = rawText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      return { text };
    } catch (error) {
      this.handleMiniMaxError(error);
    }
  }

  async generateTts(
    text: string,
    style?: string,
    context?: AiRequestContext,
  ): Promise<string> {
    try {
      const response = await this.runProviderRequest(async () => {
        const client = this.getClient();
        const voiceConfig = this.resolveVoiceConfig(style);
        return client.speech.synthesize({
          model: 'speech-2.8-hd',
          text,
          voice_setting: {
            voice_id: voiceConfig.voice_id,
            speed: voiceConfig.speed,
          },
          audio_setting: {
            sample_rate: 32000,
            format: 'mp3',
          },
        });
      }, context);

      this.assertProviderSuccess(response.data);
      const data = response.data.data as { audio_url?: string; audio?: string };
      if (data.audio_url) return data.audio_url;
      if (data.audio) {
        const buffer = Buffer.from(data.audio, 'hex');
        return `data:audio/mp3;base64,${buffer.toString('base64')}`;
      }
      return '';
    } catch (error) {
      this.handleMiniMaxError(error);
    }
  }

  async generateMusic(dto: MusicRequestDto, context?: AiRequestContext) {
    try {
      const isInstrumental = dto.isInstrumental ?? !dto.lyrics?.trim();
      const musicPrompt = isInstrumental
        ? `${dto.style}, instrumental, no vocals, background music, ambient, melody only`
        : dto.style;
      const lyrics = isInstrumental
        ? '[Instrumental]\nThis is instrumental background music without vocals.'
        : dto.lyrics || '';

      const response = await this.runProviderRequest(async () => {
        const client = this.getClient();
        return client.music.generate({
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
      }, context);

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

  async generateCover(dto: CoverRequestDto, context?: AiRequestContext) {
    try {
      const prompt =
        dto.prompt?.trim() ||
        `Album cover art, ${dto.title ?? 'Chinese song'}, ${dto.style ?? 'warm pop music'}, no text, high quality`;

      const response = await this.runProviderRequest(async () => {
        const client = this.getClient();
        return client.image.generateFromText({
          model: IMAGE_MODEL,
          prompt,
          aspect_ratio: '1:1',
          response_format: 'url',
        });
      }, context);

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

  private async generateLyricsFromImage(
    dto: LyricsRequestDto,
    context?: AiRequestContext,
  ) {
    const apiKey = process.env.MINIMAX_API_KEY?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException('MINIMAX_API_KEY is not set');
    }

    const data = await this.runProviderRequest(async () => {
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
            {
              role: 'system',
              content:
                'Write a Chinese song from the image. Return title, style and lyrics with [Verse] and [Chorus].',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extra instruction: ${dto.prompt ?? ''}`,
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
      return this.parseFetchJson(response);
    }, context);

    this.assertProviderSuccess(data);
    const rawText = data.choices?.[0]?.message?.content?.trim() || '';
    if (!rawText) {
      throw new BadGatewayException('MiniMax lyrics response is empty');
    }
    return this.parseLyricsResponse(rawText);
  }

  private wrapLyricsPrompt(dto: LyricsRequestDto): string {
    const mode = dto.mode || 'song';
    const basePrompt = MODE_PROMPTS[mode] || MODE_PROMPTS.song;
    const styles = dto.styles?.length
      ? `\nPreferred styles: ${dto.styles.join(', ')}`
      : '';
    const forWho = dto.forWho ? `\nWrite for: ${dto.forWho}` : '';
    return `${basePrompt}\nIdea: ${dto.prompt || ''}${styles}${forWho}\nReturn a complete lyric with title and style tags.`;
  }

  private parseLyricsResponse(rawText: string) {
    const cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    const jsonText = this.extractJsonText(cleaned);
    const parsed = jsonText ? this.safeParseObject(jsonText) : null;
    const jsonLyrics = this.pickString(parsed, 'lyrics');
    const title =
      this.pickString(parsed, 'title') ||
      (cleaned.match(/title[:\s]+(.+)/i) || [])[1] ||
      '';
    const style =
      this.pickString(parsed, 'style') ||
      (cleaned.match(/style[:\s]+(.+)/i) || [])[1] ||
      '';
    const sectionMatch = cleaned.match(
      /\[(?:Verse|Chorus|Bridge|Intro|Outro)[\s\S]*$/i,
    );
    const lyrics = (jsonLyrics || sectionMatch?.[0] || cleaned).trim();

    if (!lyrics) {
      throw new BadGatewayException(
        'MiniMax lyrics response format is invalid',
      );
    }

    return {
      title: title.trim() || 'Untitled',
      style: style.trim(),
      lyrics,
      rawText,
    };
  }

  private resolveVoiceConfig(style?: string): {
    voice_id: string;
    speed: number;
  } {
    if (!style) {
      return {
        voice_id: 'Chinese (Mandarin)_Lyrical_Voice',
        speed: 1.0,
      };
    }

    const lowerStyle = style.toLowerCase();
    for (const key of Object.keys(STYLE_VOICE_MAP)) {
      if (lowerStyle.includes(key.toLowerCase())) {
        return STYLE_VOICE_MAP[key];
      }
    }

    return {
      voice_id: 'Chinese (Mandarin)_Lyrical_Voice',
      speed: 1.0,
    };
  }

  private runProviderRequest<T>(
    handler: () => Promise<T>,
    context?: AiRequestContext,
  ) {
    return this.aiConcurrencyService.run(
      () =>
        this.runWithRetry(handler, {
          retries: context?.retries ?? DEFAULT_RETRIES,
          timeoutMs: context?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        }),
      {
        taskId: context?.taskId,
        onStart: context?.onStart,
      },
    );
  }

  private async runWithRetry<T>(
    handler: () => Promise<T>,
    options: { retries: number; timeoutMs: number },
  ) {
    let lastError: unknown;

    for (let attempt = 0; attempt <= options.retries; attempt += 1) {
      try {
        const result = await this.withTimeout(handler(), options.timeoutMs);
        if (result === null || result === undefined) {
          throw new BadGatewayException('MiniMax empty response');
        }
        return result;
      } catch (error) {
        lastError = error;
        if (attempt >= options.retries || !this.shouldRetry(error)) {
          throw error;
        }
        await this.sleep(500 * (attempt + 1));
      }
    }

    throw lastError;
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new BadGatewayException(
            `MiniMax request timeout after ${timeoutMs}ms`,
          ),
        );
      }, timeoutMs);

      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  private async parseFetchJson(response: Response) {
    if (!response.ok) {
      throw new BadGatewayException(`MiniMax HTTP ${response.status}`);
    }
    const data = (await response.json()) as JsonObject;
    if (!data || Object.keys(data).length === 0) {
      throw new BadGatewayException('MiniMax empty response');
    }
    return data;
  }

  private shouldRetry(error: unknown) {
    const status = this.getErrorStatus(error);
    if (status === 429 || (status >= 500 && status < 600)) return true;

    const message =
      error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();
    return (
      message.includes('429') ||
      message.includes('rate') ||
      message.includes('limit') ||
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('econnreset') ||
      message.includes('etimedout') ||
      message.includes('empty response') ||
      /\b5\d\d\b/.test(message)
    );
  }

  private getErrorStatus(error: unknown) {
    const candidate = error as {
      status?: number;
      response?: { status?: number };
      getStatus?: () => number;
    };
    return (
      candidate.getStatus?.() ??
      candidate.status ??
      candidate.response?.status ??
      0
    );
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private hasApiKey() {
    return Boolean(process.env.MINIMAX_API_KEY?.trim());
  }

  private getClient() {
    const apiKey = process.env.MINIMAX_API_KEY?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'MINIMAX_API_KEY is not set. Configure it in backend .env or server environment.',
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
      throw new BadGatewayException(
        `MiniMax request failed: ${baseResp.status_msg}`,
      );
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
      throw new BadGatewayException(`MiniMax request failed: ${error.message}`);
    }
    if (error instanceof Error) {
      throw new BadGatewayException(`MiniMax request failed: ${error.message}`);
    }
    throw new BadGatewayException(
      'MiniMax request failed with an unknown error',
    );
  }

  private parseLyrics(rawText: string) {
    return this.parseLyricsResponse(rawText);
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
