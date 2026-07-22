import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RemixSongDto {
  @ApiPropertyOptional({ description: '翻唱作品标题' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiProperty({ description: '新风格' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  style: string;

  @ApiPropertyOptional({ description: '用户修改后的歌词' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  lyrics?: string;

  @ApiProperty({ description: '二创说明' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  prompt: string;
}
