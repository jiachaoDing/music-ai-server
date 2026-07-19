import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class MusicRequestDto {
  @ApiProperty({ example: '夜路微光' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title: string;

  @ApiProperty({ example: '流行 / 治愈' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  style: string;

  @ApiProperty({ example: '[Verse]\n歌词内容' })
  @IsString()
  @MaxLength(3000)
  lyrics: string;

  @ApiPropertyOptional({ example: 'song' })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isInstrumental?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  originId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  forWho?: string;

  @ApiPropertyOptional({
    description: '参与的话题挑战 ID',
  })
  @IsOptional()
  @IsString()
  challengeId?: string;
}
