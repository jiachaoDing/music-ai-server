import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { access, mkdir, readdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import sharp from 'sharp';

const COVER_DIR = join(process.cwd(), 'uploads', 'covers');
const THUMBNAIL_DIR = join(COVER_DIR, 'thumbnails');
const COVER_URL_PREFIX = '/covers/';
const THUMBNAIL_WIDTH = 512;
const THUMBNAIL_QUALITY = 88;
const MAX_COVER_BYTES = 12 * 1024 * 1024;

@Injectable()
export class CoverStorageService implements OnModuleInit {
  private static thumbnailInitialization?: Promise<void>;
  private readonly logger = new Logger(CoverStorageService.name);

  onModuleInit() {
    CoverStorageService.thumbnailInitialization ??=
      this.ensureExistingThumbnails();
    void CoverStorageService.thumbnailInitialization.catch((error) => {
      this.logger.warn(
        `Historical thumbnail generation stopped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

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
    const coverPath = join(COVER_DIR, filename);
    await writeFile(coverPath, bytes);
    await this.createThumbnail(coverPath, filename);

    return `${COVER_URL_PREFIX}${filename}`;
  }

  private async ensureExistingThumbnails() {
    await mkdir(THUMBNAIL_DIR, { recursive: true });

    let filenames: string[];
    try {
      filenames = await readdir(COVER_DIR);
    } catch {
      return;
    }

    const coverFilenames = filenames.filter((filename) =>
      ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(
        extname(filename).toLowerCase(),
      ),
    );

    for (const filename of coverFilenames) {
      const thumbnailPath = this.getThumbnailPath(filename);
      try {
        await access(thumbnailPath);
      } catch {
        try {
          await this.createThumbnail(join(COVER_DIR, filename), filename);
        } catch (error) {
          this.logger.warn(
            `Skipping thumbnail for ${filename}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }
    }
  }

  private async createThumbnail(sourcePath: string, filename: string) {
    await mkdir(THUMBNAIL_DIR, { recursive: true });
    await sharp(sourcePath)
      .rotate()
      .resize({
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_WIDTH,
        fit: 'cover',
        withoutEnlargement: true,
      })
      .webp({ quality: THUMBNAIL_QUALITY, effort: 4 })
      .toFile(this.getThumbnailPath(filename));
  }

  private getThumbnailPath(filename: string) {
    return join(
      THUMBNAIL_DIR,
      `${filename.slice(0, -extname(filename).length)}.webp`,
    );
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
