import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const AUDIO_DIR = join(process.cwd(), 'uploads', 'audio');
const AUDIO_URL_PREFIX = '/audio/';
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

@Injectable()
export class AudioStorageService {
  async persistAudio(audioUrl: string | null | undefined, fileKey: string) {
    if (!audioUrl) return audioUrl;

    let bytes: Buffer;
    let contentType: string;

    if (audioUrl.startsWith('data:')) {
      const match = audioUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        throw new BadRequestException('无效的 data URI');
      }
      contentType = match[1];
      bytes = Buffer.from(match[2], 'base64');
    } else if (this.isRemoteUrl(audioUrl)) {
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new BadRequestException('音频下载失败');
      }

      contentType = response.headers.get('content-type') ?? '';
      bytes = Buffer.from(await response.arrayBuffer());
    } else {
      return audioUrl;
    }

    if (!contentType.startsWith('audio/')) {
      throw new BadRequestException('音频地址不是有效音频文件');
    }

    if (!bytes.length) {
      throw new BadRequestException('音频文件为空');
    }
    if (bytes.length > MAX_AUDIO_BYTES) {
      throw new BadRequestException('音频文件不能超过 20MB');
    }

    await mkdir(AUDIO_DIR, { recursive: true });
    const extension = this.resolveExtension(contentType, audioUrl);
    const hash = createHash('sha1').update(bytes).digest('hex').slice(0, 10);
    const filename = `${this.safeName(fileKey)}-${Date.now()}-${hash}${extension}`;
    await writeFile(join(AUDIO_DIR, filename), bytes);

    return `${AUDIO_URL_PREFIX}${filename}`;
  }

  private isRemoteUrl(value: string) {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private resolveExtension(contentType: string, sourceUrl: string) {
    if (contentType.includes('mpeg') || contentType.includes('mp3'))
      return '.mp3';
    if (contentType.includes('wav')) return '.wav';
    if (contentType.includes('ogg')) return '.ogg';
    if (contentType.includes('aac')) return '.aac';
    if (contentType.includes('mp4') || contentType.includes('m4a'))
      return '.m4a';

    try {
      const extension = extname(new URL(sourceUrl).pathname).toLowerCase();
      if (['.mp3', '.wav', '.ogg', '.aac', '.m4a'].includes(extension)) {
        return extension;
      }
    } catch {
      return '.mp3';
    }

    return '.mp3';
  }

  private safeName(value: string) {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
}
