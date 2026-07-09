import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'Echo Creator', description: '用户昵称' })
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @ApiProperty({ example: 'password123', description: '登录密码' })
  @IsString()
  @MinLength(4)
  password: string;
}
