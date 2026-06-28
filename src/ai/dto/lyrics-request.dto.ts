import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LyricsRequestDto {
  @ApiProperty({ example: '校园毕业季，温暖流行' })
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  prompt: string;
}
