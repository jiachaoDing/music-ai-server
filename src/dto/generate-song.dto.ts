import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateSongDto {
  @ApiProperty({ example: '夏天、校园、轻快流行' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  prompt: string;

  @ApiProperty({ example: 'pop', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  style?: string;
}
