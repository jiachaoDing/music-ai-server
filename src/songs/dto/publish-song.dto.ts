import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class PublishSongDto {
  @ApiPropertyOptional({ description: 'true=公开发布, false=转私密' })
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @ApiPropertyOptional({ description: '发布前版权确认' })
  @IsOptional()
  @IsBoolean()
  copyrightConfirmed?: boolean;
}
