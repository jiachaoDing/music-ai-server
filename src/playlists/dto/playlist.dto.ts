import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreatePlaylistDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;
}

export class RenamePlaylistDto {
  @ApiProperty()
  @IsString()
  name: string;
}
