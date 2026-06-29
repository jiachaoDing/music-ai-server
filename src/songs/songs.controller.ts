import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MusicRequestDto } from '../ai/dto/music-request.dto';
import { SongsService } from './songs.service';

@ApiTags('songs')
@Controller('api/songs')
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Post('generate')
  @ApiOperation({ summary: '生成音乐并保存到数据库' })
  generateAndSave(@Body() dto: MusicRequestDto) {
    return this.songsService.generateAndSave(dto);
  }
}
