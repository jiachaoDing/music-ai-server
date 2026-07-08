import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { REGISTER_BONUS_POINTS } from './constants';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { name: dto.name },
    });
    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    const invite = await this.prisma.inviteCode.findUnique({
      where: { code: dto.inviteCode },
    });
    if (!invite || invite.status !== 'unused') {
      throw new BadRequestException('邀请码无效或已被使用');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: dto.name,
          passwordHash,
          points: REGISTER_BONUS_POINTS,
          invitedBy: invite.createdBy,
        },
      });

      await tx.inviteCode.update({
        where: { id: invite.id },
        data: {
          status: 'used',
          usedBy: created.id,
          usedAt: new Date(),
        },
      });

      await tx.pointsLedger.create({
        data: {
          userId: created.id,
          delta: REGISTER_BONUS_POINTS,
          reason: '注册赠送',
          balance: REGISTER_BONUS_POINTS,
        },
      });

      return created;
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { name: dto.name },
    });
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    return this.buildAuthResponse(user);
  }

  logout() {
    return { message: '已退出登录' };
  }

  me(user: User): UserProfileDto {
    return this.toUserProfile(user);
  }

  private buildAuthResponse(user: User): AuthResponseDto {
    return {
      token: this.signToken(user),
      user: this.toUserProfile(user),
    };
  }

  private signToken(user: User): string {
    return this.jwtService.sign(
      { sub: user.id, name: user.name, role: user.role },
      {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN') ?? '7d',
      },
    );
  }

  private toUserProfile(user: User): UserProfileDto {
    return {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      color: user.color,
      role: user.role,
      points: user.points,
      invitedBy: user.invitedBy,
      lastCheckin: user.lastCheckin,
      streak: user.streak,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
