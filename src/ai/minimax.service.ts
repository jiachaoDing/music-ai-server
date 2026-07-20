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

const STYLE_VOICE_MAP: Record<string, { voice_id: string; speed: number }> = {
  '抒情': { voice_id: 'female-qingse', speed: 0.85 },
  '治愈': { voice_id: 'female-qingse', speed: 0.9 },
  'Lo-fi': { voice_id: 'male-qn-qingse', speed: 0.9 },
  '民谣': { voice_id: 'male-qn-qingse', speed: 0.9 },
  '摇滚': { voice_id: 'male-qn-jingying', speed: 1.1 },
  '电子': { voice_id: 'female-shaonv', speed: 1.1 },
  '欢快': { voice_id: 'female-shaonv', speed: 1.05 },
  '伤感': { voice_id: 'female-qingse', speed: 0.85 },
  '国风': { voice_id: 'female-yujie', speed: 0.9 },
  '爵士': { voice_id: 'female-qingse', speed: 0.95 },
  '说唱': { voice_id: 'male-qn-jingying', speed: 1.2 },
  '流行': { voice_id: 'female-qingse', speed: 1.0 },
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
      const mode = dto.mode || 'song';

      if (dto.image) {
        return this.generateLyricsFromImage(dto, mode);
      }

      const wrappedPrompt = this.wrapLyricsPrompt(dto);

      const response = await client.music.generateLyrics({
        mode: 'write_full_song',
        prompt: wrappedPrompt,
      });
      this.assertProviderSuccess(response.data);
      const lyrics = response.data.lyrics?.trim() || '';
      if (!lyrics) {
        throw new BadGatewayException('MiniMax 歌词生成结果为空。');
      }

      return {
        title: response.data.song_title?.trim() || '未命名',
        style: response.data.style_tags?.trim() || '',
        lyrics,
        rawText: JSON.stringify(response.data),
      };
    } catch (error) {
      this.handleMiniMaxError(error);
    }
  }

  private wrapLyricsPrompt(dto: LyricsRequestDto): string {
    const mode = dto.mode || 'song';
    const prompt = dto.prompt || '';
    const forWho = dto.forWho || '一个重要的人';

    const wrappers: Record<string, (p: string) => string> = {
      song: (p) => `创作一首中文歌曲，表达：${p}`,
      meme: (p) =>
        `把这个网络热梗/流行语写成一首洗脑魔性、副歌重复抓耳、适合传播的中文神曲：「${p}」`,
      emotion: (p) =>
        `把下面这段心情/日记/经历提炼升华成一首有画面感、有情绪张力的中文歌词：「${p}」`,
      foryou: (p) =>
        `为「${forWho}」写一首中文歌，要表达：「${p}」。真诚有故事感，副歌点题。`,
      photo: (p) => `看这张图片，为它写一首中文歌。${p ? '额外要求：' + p : ''}`,
    };

    const wrapper = wrappers[mode] || wrappers.song;
    return wrapper(prompt);
  }

  private parseLyricsResponse(rawText: string) {
    const cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    const jsonText = this.extractJsonText(cleaned);
    const parsed = jsonText ? this.safeParseObject(jsonText) : null;
    const jsonLyrics = this.pickString(parsed, 'lyrics');

    const title =
      this.pickString(parsed, 'title') ||
      (cleaned.match(/标题[:：]\s*(.+)/) || [])[1] ||
      '';
    const style =
      this.pickString(parsed, 'style') ||
      (cleaned.match(/风格[:：]\s*(.+)/) || [])[1] ||
      '';
    const labelSplit = cleaned.split(/歌词[:：]/);
    const sectionMatch = cleaned.match(/\[(?:Verse|Chorus|Bridge|Intro|Outro)[\s\S]*$/i);
    const lyrics = (
      jsonLyrics ||
      (labelSplit.length > 1 ? labelSplit.slice(1).join('歌词：') : '') ||
      sectionMatch?.[0] ||
      ''
    ).trim();

    if (!lyrics) {
      throw new BadGatewayException('MiniMax 歌词结果格式异常，请重新生成。');
    }

    return {
      title: title.trim() || '未命名',
      style: style.trim(),
      lyrics,
      rawText,
    };
  }

  private async generateLyricsFromImage(
    dto: LyricsRequestDto,
    mode: string,
  ) {
    const apiKey = process.env.MINIMAX_API_KEY?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException('MINIMAX_API_KEY 未配置');
    }
    const extraPrompt = dto.prompt ? `额外要求：${dto.prompt}` : '';

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
              '你是专业中文流行歌曲创作人。根据图片内容，先取一个歌名，再给出3-5个英文风格标签，然后写带[Verse][Chorus]段落的完整歌词。严格用如下格式输出：\n标题：xxx\n风格：xxx,xxx\n歌词：\n[Verse]...',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `看这张图片，为它写一首中文歌。${extraPrompt}`,
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
    return this.parseLyricsResponse(rawText);
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

  async generateHostTopic(vibe: {
    title: string;
    style: string;
    keyword: string;
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
              '你是 Echo AI 音乐社区的 AI 主理人。请为社区生成一个今日创作话题，鼓励用户用 AI 做一首歌。只返回 JSON，格式为 {"title":"话题名","emoji":"一个符号","desc":"60字以内的话题说明"}。',
          },
          {
            role: 'user',
            content: `今日灵感：${vibe.title}\n推荐风格：${vibe.style}\n关键词：${vibe.keyword}`,
          },
        ],
      });

      this.assertProviderSuccess(response.data);
      const rawText = response.data.choices[0]?.message.content?.trim() || '';
      const jsonText = this.extractJsonText(rawText);
      const parsed = jsonText ? this.safeParseObject(jsonText) : null;

      return {
        title: this.pickString(parsed, 'title') || vibe.title,
        emoji: this.pickString(parsed, 'emoji') || '♪',
        desc:
          this.pickString(parsed, 'desc') ||
          `用 ${vibe.keyword} 写一首歌，风格可以靠近 ${vibe.style}。`,
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
      const client = this.getClient();
      const lyricsPreview = song.lyrics ? song.lyrics.slice(0, 240) : '';
      const response = await client.chat.createCompletion({
        model: TEXT_MODEL,
        max_completion_tokens: 220,
        messages: [
          {
            role: 'system',
            content:
              '你是 Echo AI 音乐社区的 AI 主理人。请给用户作品写一段温暖、具体、像社区翻牌一样的短评，30到60字，不要 Markdown，不要 JSON，不要使用引号。',
          },
          {
            role: 'user',
            content: `作品名：${song.title}\n作者：${song.authorName ?? '社区创作者'}\n风格：${song.style}\n歌词片段：${lyricsPreview}`,
          },
        ],
      });

      this.assertProviderSuccess(response.data);
      const text =
        response.data.choices[0]?.message.content
          ?.replace(/<think>[\s\S]*?<\/think>/gi, '')
          .trim() || '';

      return {
        text:
          text ||
          `这首《${song.title}》有一种很真诚的表达，值得被更多人听见。`,
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
      const client = this.getClient();
      const titleResponse = await client.chat.createCompletion({
        model: TEXT_MODEL,
        max_completion_tokens: 120,
        messages: [
          {
            role: 'user',
            content: `你是音乐社区 Echo 的主理人，要发一首今日主打歌。主题氛围是「${vibe.title}」。给这首歌起一个文艺、有记忆点的中文歌名，12字以内。直接输出歌名本身，不要书名号、不要引号、不要解释。`,
          },
        ],
      });
      this.assertProviderSuccess(titleResponse.data);
      const title =
        titleResponse.data.choices[0]?.message.content
          ?.replace(/<think>[\s\S]*?<\/think>/gi, '')
          .replace(/[《》“”"']/g, '')
          .split('\n')[0]
          .trim()
          .slice(0, 12) || vibe.title.slice(0, 12);

      const lyricsResponse = await client.chat.createCompletion({
        model: TEXT_MODEL,
        max_completion_tokens: 1600,
        messages: [
          {
            role: 'user',
            content: `你是顶级华语作词人。围绕主题「${vibe.title}」（关键词：${vibe.keyword}）写一首完整、动人的中文歌词。要求：
1. 用 [Verse] / [Chorus] / [Bridge] 分段，至少包含两段 Verse、两段 Chorus、一段 Bridge。
2. 副歌要有记忆点、可传唱，主歌叙事有画面。
3. 只输出歌词本身，保留 [Verse]/[Chorus]/[Bridge] 标签，不要标题、不要解释。`,
          },
        ],
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

  async generateDjScript(song: {
    title: string;
    style: string;
    lyrics?: string;
    authorName?: string;
  }) {
    try {
      const apiKey = process.env.MINIMAX_API_KEY?.trim();
      if (!apiKey) {
        throw new ServiceUnavailableException('MINIMAX_API_KEY 未配置');
      }

      const lyricsPreview = song.lyrics
        ? song.lyrics.slice(0, 100)
        : '';

      console.log('[DJ脚本] 开始生成:', { title: song.title, style: song.style });

      const response = await fetch(`${MINIMAX_BASE_URL}/v1/chat/completions`, {
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
                '你是 Echo AI 音乐社区的 AI DJ，擅长用富有感染力的语言介绍歌曲。播报内容要简短（60-80字），自然流畅，有电台主播的感觉。结合歌曲的风格和歌词意境，营造独特的氛围。不要使用Markdown格式。',
            },
            {
              role: 'user',
              content: `请为歌曲《${song.title}》（风格：${song.style}）创作一段 DJ 播报开场白。${
                lyricsPreview ? `歌词片段：${lyricsPreview}` : ''
              }`,
            },
          ],
        }),
      });

      const data = await response.json();
      console.log('[DJ脚本] API响应:', JSON.stringify(data, null, 2));
      this.assertProviderSuccess(data);

      const rawText = data.choices?.[0]?.message?.content?.trim() || '';
      const text = rawText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      console.log('[DJ脚本] 生成成功:', { text });
      return { text };
    } catch (error) {
      console.error('[DJ脚本] 生成失败:', error);
      this.handleMiniMaxError(error);
    }
  }

  async generateTts(
    text: string,
    style?: string,
  ): Promise<string> {
    try {
      const client = this.getClient();
      const voiceConfig = this.resolveVoiceConfig(style);

      const response = await client.speech.synthesize({
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

    const styleKeys = Object.keys(STYLE_VOICE_MAP);
    for (const key of styleKeys) {
      if (style.includes(key)) {
        return STYLE_VOICE_MAP[key];
      }
    }

    return {
      voice_id: 'Chinese (Mandarin)_Lyrical_Voice',
      speed: 1.0,
    };
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
