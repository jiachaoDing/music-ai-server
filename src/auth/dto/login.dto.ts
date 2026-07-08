import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'echo_user', description: '用户昵称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'password123', description: '登录密码' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
