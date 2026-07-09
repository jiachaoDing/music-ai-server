import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('qr')
@Controller('api/qr')
export class QrController {
  @Get()
  @ApiOperation({ summary: '生成海报二维码数据' })
  getQr(@Query('text') text?: string, @Query('url') url?: string) {
    const target = text || url || 'https://echo-music.ai';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(target)}`;
    return { qrUrl };
  }
}
