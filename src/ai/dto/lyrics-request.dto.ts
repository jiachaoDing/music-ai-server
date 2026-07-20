import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class LyricsRequestDto {
  @ApiPropertyOptional({ example: 'song' })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiProperty({ example: '深夜加班后走在回家路上的释然', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  @ValidateIf((o) => o.mode !== 'photo' || !o.image)
  prompt?: string;

  @ApiPropertyOptional({ example: ['流行', '治愈'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  styles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  forWho?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  image?: string;
}