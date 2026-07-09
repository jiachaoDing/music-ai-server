import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateSongDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lyrics?: string;

  @ApiPropertyOptional()
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverUrl?: string;
}
