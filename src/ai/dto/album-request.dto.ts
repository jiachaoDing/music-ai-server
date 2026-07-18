import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class AlbumRequestDto {
  @ApiProperty({ example: '深夜便利店' })
  @IsString()
  @IsNotEmpty()
  theme: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(6)
  trackCount?: number;
}
