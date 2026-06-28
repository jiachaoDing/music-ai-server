import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class MusicRequestDto {
  @ApiProperty({ example: '毕业那天的风' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title: string;

  @ApiProperty({ example: '流行, 温暖, 治愈' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  style: string;

  @ApiProperty({ example: '第一段歌词...\n副歌歌词...' })
  @IsString()
  @MinLength(2)
  @MaxLength(3000)
  lyrics: string;
}
