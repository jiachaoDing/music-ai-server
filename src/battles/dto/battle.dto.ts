import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class CreateBattleDto {
  @ApiProperty()
  @IsString()
  topic: string;

  @ApiProperty()
  @IsString()
  aId: string;

  @ApiProperty()
  @IsString()
  bId: string;
}

export class VoteBattleDto {
  @ApiProperty({ enum: ['A', 'B'] })
  @IsIn(['A', 'B'])
  side: 'A' | 'B';
}
