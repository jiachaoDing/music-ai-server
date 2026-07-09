import { ApiProperty } from '@nestjs/swagger';

export class RemixSongDto {
  @ApiProperty({ description: '新风格' })
  style: string;

  @ApiProperty({ description: '用户修改后的歌词', required: false })
  lyrics?: string;

  @ApiProperty({ description: '风格描述' })
  prompt: string;
}