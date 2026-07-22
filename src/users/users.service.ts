import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { mapPlaylist } from '../common/utils/playlist-mapper';
import { generateInviteCodes } from '../common/utils/invite-code';
import { mapUser } from '../common/utils/user-mapper';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(user: User) {
    let [inviteCodes, playlists, invitedCount] = await Promise.all([
      this.prisma.inviteCode.findMany({
        where: { createdBy: user.id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.playlist.findMany({
        where: { userId: user.id },
        orderBy: [{ isSystem: 'desc' }, { createdAt: 'desc' }],
        include: {
          playlistSongs: {
            orderBy: { createdAt: 'asc' },
            take: 1,
            include: { song: true },
          },
        },
      }),
      this.prisma.user.count({ where: { invitedBy: user.id } }),
    ]);

    // Accounts created before user invitations were enabled receive their initial set here.
    if (inviteCodes.length === 0) {
      await this.prisma.inviteCode.createMany({
        data: generateInviteCodes().map((code) => ({
          code,
          createdBy: user.id,
          status: 'unused',
        })),
      });
      inviteCodes = await this.prisma.inviteCode.findMany({
        where: { createdBy: user.id },
        orderBy: { createdAt: 'desc' },
      });
    }

    return {
      user: mapUser(user),
      echoPoints: user.points,
      invitedCount,
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
