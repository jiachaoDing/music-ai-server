import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

@ApiTags('qr')
@Controller('api/qr')
export class QrController {
  @Get()
  @ApiOperation({ summary: '生成海报二维码图片' })
  async getQr(
    @Query('text') text: string | undefined,
    @Query('url') url: string | undefined,
    @Res() res: Response,
  ) {
    const target = (text || url || 'https://echo-music.ai').slice(0, 500);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=1&ecc=M&color=0a0813&bgcolor=ffffff&data=${encodeURIComponent(target)}`;
    const response = await fetch(qrUrl);

    if (!response.ok) {
      res.status(500).send('');
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  }
}
