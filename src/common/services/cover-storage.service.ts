import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const COVER_DIR = join(process.cwd(), 'uploads', 'covers');
const COVER_URL_PREFIX = '/covers/';
const MAX_COVER_BYTES = 12 * 1024 * 1024;

@Injectable()
export class CoverStorageService {
  async persistCover(coverUrl: string | undefined, songId: string) {
    if (!coverUrl) return coverUrl;
    if (!this.isRemoteUrl(coverUrl)) return coverUrl;

    const response = await fetch(coverUrl);
    if (!response.ok) {
      throw new BadRequestException('封面图片下载失败');
    }

    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > MAX_COVER_BYTES) {
      throw new BadRequestException('封面图片不能超过 12MB');
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      throw new BadRequestException('封面地址不是有效图片');
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length) {
      throw new BadRequestException('封面图片为空');
    }
    if (bytes.length > MAX_COVER_BYTES) {
      throw new BadRequestException('封面图片不能超过 12MB');
    }

    await mkdir(COVER_DIR, { recursive: true });
    const extension = this.resolveExtension(contentType, coverUrl);
    const hash = createHash('sha1').update(bytes).digest('hex').slice(0, 10);
    const filename = `${this.safeName(songId)}-${Date.now()}-${hash}${extension}`;
    await writeFile(join(COVER_DIR, filename), bytes);

    return `${COVER_URL_PREFIX}${filename}`;
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
    if (contentType.includes('png')) return '.png';
    if (contentType.includes('webp')) return '.webp';
    if (contentType.includes('gif')) return '.gif';

    try {
      const extension = extname(new URL(sourceUrl).pathname).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) {
        return extension;
      }
    } catch {
      return '.jpg';
    }

    return '.jpg';
  }

  private safeName(value: string) {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
}
