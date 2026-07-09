import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { mapPlaylist } from '../common/utils/playlist-mapper';
import { mapUser } from '../common/utils/user-mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(user: User) {
    const [inviteCodes, playlists] = await Promise.all([
      this.prisma.inviteCode.findMany({
        where: { createdBy: user.id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.playlist.findMany({
        where: { userId: user.id },
        orderBy: [{ isSystem: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    return {
      user: mapUser(user),
      echoPoints: user.points,
      inviteCodes: inviteCodes.map((c) => ({
        id: c.id,
        code: c.code,
        status: c.status,
        usedBy: c.usedBy,
        usedAt: c.usedAt?.toISOString() ?? null,
      })),
      playlists: playlists.map(mapPlaylist),
    };
  }

  async getPointsLedger(user: User, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.pointsLedger.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.pointsLedger.count({ where: { userId: user.id } }),
    ]);

    return {
      list: list.map((l) => ({
        id: l.id,
        delta: l.delta,
        reason: l.reason,
        balance: l.balance,
        createdAt: l.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }
}
