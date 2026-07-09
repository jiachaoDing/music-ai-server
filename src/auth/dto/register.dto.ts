import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Echo Creator', description: '用户昵称' })
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @ApiProperty({ example: 'password123', description: '登录密码' })
  @IsString()
  @MinLength(4)
  password: string;

  @ApiProperty({ example: 'ECHO-2026', description: '注册邀请码' })
  @IsString()
  @IsNotEmpty()
  inviteCode: string;
}
