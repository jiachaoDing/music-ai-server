import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RemixSongDto {
  @ApiPropertyOptional({ description: '翻唱作品标题' })
  title?: string;

  @ApiProperty({ description: '新风格' })
  style: string;

  @ApiPropertyOptional({ description: '用户修改后的歌词' })
  lyrics?: string;

  @ApiProperty({ description: '二创说明' })
  prompt: string;
}
