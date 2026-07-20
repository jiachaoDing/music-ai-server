import { Injectable, NotFoundException } from '@nestjs/common';
import sharp from 'sharp';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PosterService {
  constructor(private readonly prisma: PrismaService) {}

  async generateSongPoster(songId: string): Promise<Buffer> {
    const song = await this.prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      throw new NotFoundException('作品不存在');
    }

    const canvas = sharp({
      create: {
        width: 500,
        height: 500,
        channels: 4,
        background: { r: 26, g: 26, b: 26, alpha: 1 },
      },
    });

    let composed = canvas;

    if (song.coverImg) {
      let coverBuffer: Buffer;
      try {
        if (song.coverImg.startsWith('http')) {
          const response = await fetch(song.coverImg);
          coverBuffer = Buffer.from(await response.arrayBuffer());
        } else {
          coverBuffer = await sharp(`uploads${song.coverImg}`).toBuffer();
        }
        const coverResized = await sharp(coverBuffer)
          .resize(460, 460, { fit: 'cover' })
          .toBuffer();
        composed = composed.composite([
          {
            input: coverResized,
            top: 20,
            left: 20,
          },
        ]);
      } catch {}
    }

    const overlayText = await this.createTextOverlay({
      title: song.title,
      authorName: song.authorName || '创作者',
      style: song.style,
      likes: song.likes,
      plays: song.plays,
    });
    composed = composed.composite([
      {
        input: overlayText,
        top: 0,
        left: 0,
      },
    ]);

    return composed.toFormat('png').toBuffer();
  }

  private async createTextOverlay(song: {
    title: string;
    authorName: string;
    style: string;
    likes: number;
    plays: number;
  }): Promise<Buffer> {
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
        <defs>
          <linearGradient id="fade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="rgba(0,0,0,0)" />
            <stop offset="70%" stop-color="rgba(0,0,0,0)" />
            <stop offset="100%" stop-color="rgba(0,0,0,0.8)" />
          </linearGradient>
          <filter id="textShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.8)" />
          </filter>
        </defs>
        
        <rect x="0" y="350" width="500" height="150" fill="url(#fade)" />
        
        <text x="50%" y="430" font-family="Microsoft YaHei, sans-serif" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle" filter="url(#textShadow)">
          ${this.escapeXml(song.title)}
        </text>
        
        <text x="50%" y="460" font-family="Microsoft YaHei, sans-serif" font-size="14" fill="#aaaaaa" text-anchor="middle" filter="url(#textShadow)">
          ${this.escapeXml(song.authorName)} · ${this.escapeXml(song.style)}
        </text>
        
        <text x="50%" y="485" font-family="Microsoft YaHei, sans-serif" font-size="12" fill="#888888" text-anchor="middle">
          ❤️ ${song.likes} 播放 ${song.plays}
        </text>
        
        <rect x="20" y="20" width="60" height="60" fill="rgba(255,255,255,0.1)" rx="8" />
        <text x="50" y="60" font-family="sans-serif" font-size="32" fill="#ffffff" text-anchor="middle">E</text>
      </svg>
    `.trim();

    return sharp(Buffer.from(svgContent))
      .resize(500, 500)
      .toBuffer();
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}