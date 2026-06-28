import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CoverRequestDto {
  @ApiProperty({ example: '毕业那天的风', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @ApiProperty({ example: '流行, 温暖, 治愈', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  style?: string;

  @ApiProperty({
    example: 'Album cover art, warm pop music, no text, high quality',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  prompt?: string;
}
