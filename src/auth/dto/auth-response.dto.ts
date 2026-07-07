import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ nullable: true })
  color: string | null;

  @ApiProperty({ enum: ['user', 'admin'] })
  role: string;

  @ApiProperty()
  points: number;

  @ApiProperty({ nullable: true })
  invitedBy: string | null;

  @ApiProperty({ nullable: true })
  lastCheckin: string | null;

  @ApiProperty()
  streak: number;

  @ApiProperty()
  createdAt: string;
}

export class AuthResponseDto {
  @ApiProperty()
  token: string;

  @ApiProperty({ type: UserProfileDto })
  user: UserProfileDto;
}
