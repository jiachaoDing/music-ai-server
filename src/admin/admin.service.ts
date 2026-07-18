import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { mapUser } from '../common/utils/user-mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  listUsers() {
    return this.prisma.user
      .findMany({
        orderBy: { createdAt: 'desc' },
      })
      .then((users) => users.map(mapUser));
  }

  async createUser(data: { name: string; password: string; role?: string }) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        passwordHash,
        role: data.role ?? 'user',
      },
    });
    return mapUser(user);
  }

  updateUser(id: string, data: { role?: string; points?: number }) {
    return this.prisma.user.update({ where: { id }, data });
  }

  listSongs(status?: string) {
    return this.prisma.song.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  updateSongStatus(id: string, status: string, reason?: string) {
    return this.prisma.song.update({
      where: { id },
      data: {
        status,
        published: status === 'published',
      },
    });
  }

  updateSong(id: string, data: { status?: string; published?: boolean }) {
    return this.prisma.song.update({ where: { id }, data });
  }

  listInviteCodes() {
    return this.prisma.inviteCode.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createInviteCode(admin: User, code: string) {
    return this.prisma.inviteCode.create({
      data: { code, createdBy: admin.id, status: 'unused' },
    });
  }

  async createInviteCodes(admin: User, count: number) {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = `ECHO${Date.now().toString(36).toUpperCase()}${i}`;
      await this.prisma.inviteCode.create({
        data: { code, createdBy: admin.id, status: 'unused' },
      });
      codes.push(code);
    }
    return { codes };
  }

  listComments() {
    return this.prisma.comment.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async deleteComment(id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('评论不存在');
    return this.prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  listTopics() {
    return this.prisma.challenge.findMany({ orderBy: { createdAt: 'desc' } });
  }

  createTopic(data: {
    title: string;
    desc?: string;
    emoji?: string;
    color?: string;
  }) {
    return this.prisma.challenge.create({ data: { ...data, active: true } });
  }

  updateTopic(
    id: string,
    data: { title?: string; desc?: string; status?: string; active?: boolean },
  ) {
    return this.prisma.challenge.update({ where: { id }, data });
  }

  async deleteSong(id: string, reason?: string) {
    const song = await this.prisma.song.findUnique({ where: { id } });
    if (!song) throw new NotFoundException('作品不存在');
    await this.prisma.song.delete({ where: { id } });
    return { deleted: true, songId: id, reason };
  }

  async deleteTopic(id: string) {
    const topic = await this.prisma.challenge.findUnique({ where: { id } });
    if (!topic) throw new NotFoundException('话题不存在');
    await this.prisma.challenge.delete({ where: { id } });
    return { deleted: true, topicId: id };
  }

  async deductPoints(userId: string, delta: number, reason: string) {
    if (delta >= 0) throw new BadRequestException('扣减积分应为负数');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    const balance = user.points + delta;
    if (balance < 0) throw new BadRequestException('积分不足');

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { points: balance },
      });
      await tx.pointsLedger.create({
        data: { userId, delta, reason, balance },
      });
      return { points: balance };
    });
  }
}
