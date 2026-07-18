import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { unlink } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { getAdminKey } from '../common/utils/admin-key';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';
import {
  AdminCreateInviteDto,
  AdminCreateTopicDto,
  AdminCreateUserDto,
  AdminUpdateSongDto,
  AdminUpdateSongStatusDto,
  AdminUpdateTopicDto,
  AdminUpdateUserDto,
} from './dto/admin.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_INVITE_COUNT = 50;
const CHALLENGE_COLORS = [
  'linear-gradient(135deg,#8b5cf6,#06b6d4)',
  'linear-gradient(135deg,#f59e0b,#fbbf24)',
  'linear-gradient(135deg,#10b981,#22c55e)',
  'linear-gradient(135deg,#ec4899,#f97316)',
];

type PageQuery = {
  q?: string;
  page?: string;
  pageSize?: string;
};

function parsePage(query: PageQuery) {
  const page = Math.max(Number(query.page) || DEFAULT_PAGE, 1);
  const pageSize = Math.max(Number(query.pageSize) || DEFAULT_PAGE_SIZE, 1);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function normalizeKeyword(q?: string) {
  const value = q?.trim();
  return value ? value : undefined;
}

function randomHexPassword() {
  return Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 16).toString(16).toUpperCase(),
  ).join('');
}

function localFilePath(url: string | null | undefined) {
  if (!url || /^https?:\/\//i.test(url)) return null;
  const relative = url.replace(/^\/+/, '');
  const target = normalize(join(process.cwd(), 'uploads', relative));
  const root = normalize(join(process.cwd(), 'uploads'));
  return target.startsWith(root) ? target : null;
}

async function removeLocalFile(url: string | null | undefined) {
  const target = localFilePath(url);
  if (!target) return;
  await unlink(target).catch(() => null);
}

function mapAdminUserRow(user: {
  id: string;
  name: string;
  avatarUrl: string | null;
  color: string | null;
  points: number;
  streak: number;
  lastCheckin: string | null;
  invitedBy: string | null;
  createdAt: Date;
  pointsLedger: Array<{
    delta: number;
    reason: string;
    balance: number | null;
    createdAt: Date;
  }>;
  _count?: { songs: number };
}, invitedByName?: string | null) {
  return {
    id: user.id,
    nickname: user.name,
    avatarUrl: user.avatarUrl,
    color: user.color,
    echoPoints: user.points,
    streak: user.streak,
    lastCheckin: user.lastCheckin,
    songCount: user._count?.songs ?? 0,
    invitedBy: user.invitedBy,
    invitedByName: invitedByName ?? null,
    createdAt: user.createdAt.toISOString(),
    recentLedger: user.pointsLedger.slice(0, 10).map((ledger) => ({
      delta: ledger.delta,
      reason: ledger.reason,
      balance: ledger.balance,
      createdAt: ledger.createdAt.toISOString(),
    })),
  };
}

function mapAdminSongRow(song: {
  id: string;
  title: string;
  authorId: string | null;
  authorName: string | null;
  mode: string;
  status: string;
  likes: number;
  plays: number;
  coverCount: number;
  duration: number | null;
  audioUrl: string | null;
  coverImg: string | null;
  cover: string | null;
  createdAt: Date;
}) {
  return {
    id: song.id,
    title: song.title,
    authorId: song.authorId,
    authorName: song.authorName ?? '匿名旅人',
    mode: song.mode,
    status: song.status,
    likes: song.likes,
    plays: song.plays,
    coverCount: song.coverCount ?? 0,
    duration: song.duration ?? 0,
    audioUrl: song.audioUrl,
    coverUrl: song.coverImg ?? song.cover,
    createdAt: song.createdAt.toISOString(),
  };
}

function mapAdminCommentRow(comment: {
  id: string;
  songId: string;
  userId: string;
  userName: string | null;
  text: string;
  anon: boolean;
  createdAt: Date;
  song: { title: string | null } | null;
}) {
  return {
    id: comment.id,
    text: comment.text,
    songId: comment.songId,
    songTitle: comment.song?.title ?? '(已删除)',
    userId: comment.userId,
    userName: comment.userName ?? '匿名旅人',
    anon: comment.anon,
    createdAt: comment.createdAt.toISOString(),
  };
}

function mapAdminChallengeRow(challenge: {
  id: string;
  title: string;
  emoji: string | null;
  desc: string | null;
  color: string | null;
  createdBy: string | null;
  active: boolean;
  createdAt: Date;
  _count?: { songs: number };
}) {
  return {
    id: challenge.id,
    title: challenge.title,
    emoji: challenge.emoji ?? '🎵',
    desc: challenge.desc ?? '',
    color: challenge.color ?? CHALLENGE_COLORS[0],
    createdBy: challenge.createdBy ?? '管理员',
    active: challenge.active,
    songCount: challenge._count?.songs ?? 0,
    createdAt: challenge.createdAt.toISOString(),
  };
}

function mapAdminInviteRow(invite: {
  id: string;
  code: string;
  status: string;
  createdBy: string;
  usedBy: string | null;
  createdAt: Date;
  creator?: { name: string } | null;
  user?: { name: string } | null;
}) {
  return {
    id: invite.id,
    code: invite.code,
    status: invite.status,
    createdBy: invite.creator?.name ?? invite.createdBy,
    createdById: invite.createdBy,
    usedBy: invite.usedBy,
    usedByName: invite.user?.name ?? null,
    createdAt: invite.createdAt.toISOString(),
  };
}

@ApiTags('admin')
@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  @Public()
  @ApiOperation({ summary: '管理员登录' })
  login(@Body() body: { key?: string }) {
    if ((body.key || '').trim() !== getAdminKey()) {
      throw new UnauthorizedException('密钥错误');
    }
    return { success: true };
  }

  @Get('stats')
  @ApiOperation({ summary: '后台统计' })
  async stats() {
    const today = new Date().toISOString().slice(0, 10);
    const [users, songs, invites, totalComments] = await Promise.all([
      this.prisma.user.findMany({
        select: { createdAt: true, lastCheckin: true, points: true },
      }),
      this.prisma.song.findMany({ select: { likes: true, plays: true } }),
      this.prisma.inviteCode.findMany({ select: { usedBy: true } }),
      this.prisma.comment.count({ where: { deletedAt: null } }),
    ]);

    return {
      totalUsers: users.length,
      newUsersToday: users.filter(
        (user) => user.createdAt.toISOString().slice(0, 10) === today,
      ).length,
      checkinsToday: users.filter((user) => user.lastCheckin === today).length,
      totalSongs: songs.length,
      totalPlays: songs.reduce((sum, song) => sum + (song.plays || 0), 0),
      totalLikes: songs.reduce((sum, song) => sum + (song.likes || 0), 0),
      totalEchoPoints: users.reduce((sum, user) => sum + (user.points || 0), 0),
      totalInvites: invites.length,
      usedInvites: invites.filter((invite) => !!invite.usedBy).length,
      availableInvites: invites.filter((invite) => !invite.usedBy).length,
      totalComments,
      pointsStats: {
        dailyCheckin: 10,
        songGenerate: -2,
        coverGenerate: -1,
        radioGenerate: -1,
        remixGenerate: -1,
        albumGenerate: -5,
        fortuneGenerate: -1,
      },
    };
  }

  @Get('users')
  @ApiOperation({ summary: '用户列表' })
  async listUsers(@Query() query: PageQuery) {
    const { page, pageSize, skip } = parsePage(query);
    const keyword = normalizeKeyword(query.q);
    const where = keyword
      ? { name: { contains: keyword, mode: 'insensitive' as const } }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          pointsLedger: { orderBy: { createdAt: 'desc' }, take: 10 },
          _count: { select: { songs: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    const inviterIds = users
      .map((user) => user.invitedBy)
      .filter((id): id is string => !!id);
    const inviters = inviterIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: inviterIds } },
          select: { id: true, name: true },
        })
      : [];
    const nameById = new Map(inviters.map((user) => [user.id, user.name]));

    return {
      list: users.map((user) =>
        mapAdminUserRow(user, user.invitedBy ? nameById.get(user.invitedBy) : null),
      ),
      total,
      page,
      pageSize,
    };
  }

  @Post('users')
  @ApiOperation({ summary: '创建用户' })
  createUser(@Body() dto: AdminCreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: '更新用户' })
  updateUser(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Post('users/:id/points')
  @ApiOperation({ summary: '调整用户积分' })
  async adjustPoints(
    @Param('id') id: string,
    @Body() body: { delta: number; reason?: string },
  ) {
    const delta = Number(body.delta || 0);
    const reason = body.reason?.trim();
    if (!delta) {
      throw new BadRequestException('请输入非零数值');
    }
    if (!reason) {
      throw new BadRequestException('参数错误');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('not found');

    const newBalance = user.points + delta;
    if (newBalance < 0) {
      throw new BadRequestException('积分不能为负数');
    }

    const ledger = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { points: newBalance } });
      return tx.pointsLedger.create({
        data: {
          userId: id,
          delta,
          reason,
          balance: newBalance,
        },
      });
    });

    return { userId: id, newBalance, ledgerId: ledger.id };
  }

  @Post('users/:id/password')
  @ApiOperation({ summary: '重置用户密码' })
  async resetPassword(
    @Param('id') id: string,
    @Body() body: { password?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('not found');

    const provided = (body.password || '').trim();
    const password = provided || randomHexPassword();
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });

    return provided
      ? { reset: true }
      : { reset: true, newPassword: password };
  }

  @Delete('users/:id')
  @ApiOperation({ summary: '删除用户' })
  async deleteUser(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('not found');

    await this.prisma.user.delete({ where: { id } });
    return { deleted: true, userId: id };
  }

  @Get('songs')
  @ApiOperation({ summary: '作品列表' })
  async listSongs(@Query() query: PageQuery & { status?: string }) {
    const { page, pageSize, skip } = parsePage(query);
    const keyword = normalizeKeyword(query.q);
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword, mode: 'insensitive' as const } },
              { authorName: { contains: keyword, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [songs, total] = await Promise.all([
      this.prisma.song.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.song.count({ where }),
    ]);

    return {
      list: songs.map(mapAdminSongRow),
      total,
      page,
      pageSize,
    };
  }

  @Delete('songs/:id')
  @ApiOperation({ summary: '删除作品' })
  async deleteSong(@Param('id') id: string, @Body() body?: { reason?: string }) {
    const root = await this.prisma.song.findUnique({ where: { id } });
    if (!root) throw new NotFoundException('作品不存在');

    const songs = await this.prisma.song.findMany({
      where: { OR: [{ id }, { originId: id }] },
    });
    await Promise.all(
      songs.flatMap((song) => [
        removeLocalFile(song.audioUrl),
        removeLocalFile(song.coverImg ?? song.cover),
        removeLocalFile(song.djUrl),
      ]),
    );
    await this.prisma.song.deleteMany({
      where: { id: { in: songs.map((song) => song.id) } },
    });

    return { deleted: true, songId: id, removedCount: songs.length };
  }

  @Patch('songs/:id/status')
  @ApiOperation({ summary: '管理作品状态' })
  async updateSongStatus(
    @Param('id') id: string,
    @Body() dto: AdminUpdateSongStatusDto,
  ) {
    const updated = await this.prisma.song.update({
      where: { id },
      data: {
        status: dto.status,
        published: dto.status === 'published',
      },
    });
    return { songId: updated.id, status: updated.status };
  }

  @Patch('songs/:id')
  @ApiOperation({ summary: '作品管理' })
  updateSong(@Param('id') id: string, @Body() dto: AdminUpdateSongDto) {
    return this.adminService.updateSong(id, dto);
  }

  @Get('invite-codes')
  @ApiOperation({ summary: '邀请码列表' })
  async listInviteCodesLegacy() {
    const result = await this.listInvites();
    return result.list;
  }

  @Get('invites')
  @ApiOperation({ summary: '邀请码列表' })
  async listInvites() {
    const invites = await this.prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { name: true } },
        user: { select: { name: true } },
      },
    });
    return { list: invites.map(mapAdminInviteRow) };
  }

  @Post('invite-codes')
  @ApiOperation({ summary: '生成邀请码' })
  async createInviteCodeLegacy(
    @CurrentUser() admin: User,
    @Body() dto: AdminCreateInviteDto,
  ) {
    const count = dto.count ? Number(dto.count) : 1;
    if (!Number.isInteger(count) || count < 1 || count > MAX_INVITE_COUNT) {
      throw new BadRequestException('生成数量必须在 1~50 之间');
    }

    const codes: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const code =
        dto.code && count === 1
          ? dto.code
          : `ECHO-${randomHexPassword()}`;
      await this.prisma.inviteCode.create({
        data: { code, createdBy: admin.id, status: 'unused' },
      });
      codes.push(code);
    }
    return { codes, count };
  }

  @Post('invites')
  @ApiOperation({ summary: '批量生成邀请码' })
  async createInviteCode(
    @CurrentUser() admin: User,
    @Body() dto: AdminCreateInviteDto,
  ) {
    if (dto.count === undefined || dto.count === null) {
      throw new BadRequestException('生成数量必须在 1~50 之间');
    }
    const count = Number(dto.count);
    if (!Number.isInteger(count) || count < 1 || count > MAX_INVITE_COUNT) {
      throw new BadRequestException('生成数量必须在 1~50 之间');
    }

    const codes: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const code = `ECHO-${randomHexPassword()}`;
      await this.prisma.inviteCode.create({
        data: { code, createdBy: admin.id, status: 'unused' },
      });
      codes.push(code);
    }
    return { codes, count };
  }

  @Delete('invite-codes/:code')
  @ApiOperation({ summary: '删除邀请码' })
  async deleteInviteLegacy(@Param('code') code: string) {
    return this.deleteInvite(code);
  }

  @Delete('invites/:code')
  @ApiOperation({ summary: '作废邀请码' })
  async deleteInvite(@Param('code') code: string) {
    const invite = await this.prisma.inviteCode.findUnique({ where: { code } });
    if (!invite) throw new NotFoundException('not found');
    if (invite.usedBy) {
      throw new BadRequestException('已使用的邀请码不能删除');
    }
    await this.prisma.inviteCode.delete({ where: { code } });
    return { deleted: true, code };
  }

  @Get('comments')
  @ApiOperation({ summary: '评论管理' })
  async listComments(@Query() query: PageQuery) {
    const { page, pageSize, skip } = parsePage(query);
    const keyword = normalizeKeyword(query.q);
    const where = {
      deletedAt: null,
      ...(keyword
        ? {
            OR: [
              { text: { contains: keyword, mode: 'insensitive' as const } },
              { userName: { contains: keyword, mode: 'insensitive' as const } },
              {
                song: {
                  title: { contains: keyword, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
    };

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: { song: { select: { title: true } } },
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      list: comments.map(mapAdminCommentRow),
      total,
      page,
      pageSize,
    };
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: '删除评论' })
  async deleteCommentLegacy(@Param('id') id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('not found');

    const updatedSong = await this.prisma.$transaction(async (tx) => {
      await tx.comment.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      const song = await tx.song.findUnique({
        where: { id: comment.songId },
        select: { commentCount: true },
      });
      if (!song) return null;
      return tx.song.update({
        where: { id: comment.songId },
        data: { commentCount: Math.max(0, song.commentCount - 1) },
        select: { commentCount: true },
      });
    });

    return {
      deleted: true,
      commentId: id,
      songId: comment.songId,
      updatedCommentCount: updatedSong?.commentCount ?? 0,
    };
  }

  @Delete('comments/:songId/:commentId')
  @ApiOperation({ summary: '删除评论' })
  async deleteComment(
    @Param('songId') _songId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.deleteCommentLegacy(commentId);
  }

  @Get('challenges')
  @ApiOperation({ summary: '话题挑战管理' })
  async listTopics() {
    const challenges = await this.prisma.challenge.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { songs: true } } },
    });
    return { list: challenges.map(mapAdminChallengeRow) };
  }

  @Post('challenges')
  @ApiOperation({ summary: '新增话题挑战' })
  async createTopic(@Body() dto: AdminCreateTopicDto) {
    const title = dto.title?.trim();
    if (!title) throw new BadRequestException('话题标题不能为空');

    const challenge = await this.prisma.challenge.create({
      data: {
        title,
        emoji: dto.emoji?.trim() || '🎵',
        desc: dto.desc?.trim() || '',
        color:
          dto.color ||
          CHALLENGE_COLORS[Math.floor(Math.random() * CHALLENGE_COLORS.length)],
        createdBy: '管理员',
        active: true,
      },
      include: { _count: { select: { songs: true } } },
    });
    return { challenge: mapAdminChallengeRow(challenge) };
  }

  @Patch('challenges/:id')
  @ApiOperation({ summary: '更新话题挑战' })
  async updateTopic(@Param('id') id: string, @Body() dto: AdminUpdateTopicDto) {
    const challenge = await this.prisma.challenge.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        emoji: dto.emoji?.trim(),
        desc: dto.desc?.trim(),
        status: dto.status,
        active: dto.active,
      },
      include: { _count: { select: { songs: true } } },
    });
    return { challenge: mapAdminChallengeRow(challenge) };
  }

  @Patch('challenges/:id/toggle')
  @ApiOperation({ summary: '上下架话题' })
  async toggleTopic(
    @Param('id') id: string,
    @Body() body: { active?: boolean },
  ) {
    if (typeof body.active !== 'boolean') {
      throw new BadRequestException('参数错误');
    }
    const active = Boolean(body.active);
    const challenge = await this.prisma.challenge.update({
      where: { id },
      data: { active },
    });
    return { challengeId: challenge.id, active: challenge.active };
  }

  @Delete('challenges/:id')
  @ApiOperation({ summary: '删除话题挑战' })
  async deleteTopic(@Param('id') id: string) {
    const topic = await this.prisma.challenge.findUnique({ where: { id } });
    if (!topic) throw new NotFoundException('话题不存在');
    await this.prisma.challenge.delete({ where: { id } });
    return { deleted: true, challengeId: id };
  }
}
