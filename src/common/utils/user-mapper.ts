import { User } from '@prisma/client';

export function mapUser(user: User) {
  return {
    id: user.id,
    nickname: user.name,
    avatarUrl: user.avatarUrl,
    color: user.color,
    role: user.role,
    echoPoints: user.points,
    streak: user.streak,
    lastCheckin: user.lastCheckin,
    createdAt: user.createdAt.toISOString(),
  };
}
