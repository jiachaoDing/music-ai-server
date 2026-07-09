import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MusicRequestDto } from '../ai/dto/music-request.dto';
import { SongsService } from './songs.service';

@ApiTags('songs')
@Controller('api/songs')
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '生成音乐并保存到数据库' })
  generateAndSave(@Body() dto: MusicRequestDto, @CurrentUser() user: User) {
    return this.songsService.generateAndSave(dto, user);
  }
}
