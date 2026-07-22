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
import { LIKED_PLAYLIST_COLOR, LIKED_PLAYLIST_NAME } from '../common/constants';
import { generateInviteCodes } from '../common/utils/invite-code';
import { mapUser } from '../common/utils/user-mapper';
import { PrismaService } from '../prisma/prisma.service';
import {
  INVITED_BONUS_POINTS,
  INVITER_BONUS_POINTS,
  REGISTER_BONUS_POINTS,
} from './constants';
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
      where: { name: dto.nickname },
    });
    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    const invite = await this.prisma.inviteCode.findUnique({
      where: { code: dto.inviteCode },
      include: { creator: { select: { id: true, role: true } } },
    });
    if (!invite || invite.status !== 'unused') {
      throw new BadRequestException('邀请码无效或已被使用');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const inviterId = invite.creator.role === 'admin' ? null : invite.createdBy;
    const initialPoints =
      REGISTER_BONUS_POINTS + (inviterId ? INVITED_BONUS_POINTS : 0);
    const newInviteCodes = generateInviteCodes();

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: dto.nickname,
          passwordHash,
          points: initialPoints,
          invitedBy: inviterId,
        },
      });

      const claimedInvite = await tx.inviteCode.updateMany({
        where: { id: invite.id, status: 'unused', usedBy: null },
        data: {
          status: 'used',
          usedBy: created.id,
          usedAt: new Date(),
        },
      });
      if (claimedInvite.count !== 1) {
        throw new BadRequestException('邀请码已被使用');
      }

      await tx.inviteCode.createMany({
        data: newInviteCodes.map((code) => ({
          code,
          createdBy: created.id,
          status: 'unused',
        })),
      });

      await tx.pointsLedger.create({
        data: {
          userId: created.id,
          delta: REGISTER_BONUS_POINTS,
          reason: '注册赠送',
          balance: REGISTER_BONUS_POINTS,
        },
      });

      if (inviterId) {
        await tx.pointsLedger.create({
          data: {
            userId: created.id,
            delta: INVITED_BONUS_POINTS,
            reason: '受邀加入奖励',
            balance: initialPoints,
          },
        });

        const inviter = await tx.user.update({
          where: { id: inviterId },
          data: { points: { increment: INVITER_BONUS_POINTS } },
          select: { points: true },
        });
        await tx.pointsLedger.create({
          data: {
            userId: inviterId,
            delta: INVITER_BONUS_POINTS,
            reason: '成功邀请好友',
            balance: inviter.points,
          },
        });
      }

      await tx.playlist.create({
        data: {
          userId: created.id,
          name: LIKED_PLAYLIST_NAME,
          type: 'liked',
          isSystem: true,
          color: LIKED_PLAYLIST_COLOR,
        },
      });

      return created;
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { name: dto.nickname },
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
    return null;
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
    const mapped = mapUser(user);
    return {
      ...mapped,
      invitedBy: user.invitedBy,
      lastCheckin: user.lastCheckin,
      streak: user.streak,
    };
  }

  async validateInviteCode(code: string) {
    const invite = await this.prisma.inviteCode.findUnique({
      where: { code },
    });

    if (!invite) {
      return { valid: false, used: false, reason: '邀请码不存在' };
    }

    if (invite.status === 'used') {
      return { valid: false, used: true, reason: '该邀请码已被使用' };
    }

    return { valid: true, used: false };
  }
}
