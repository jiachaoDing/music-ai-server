import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'echo_user', description: '用户昵称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'password123', description: '登录密码' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'ECHO-2026', description: '注册邀请码' })
  @IsString()
  @IsNotEmpty()
  inviteCode: string;
}
