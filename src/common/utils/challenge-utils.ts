import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { Challenge, Prisma, PrismaClient } from '@prisma/client';

export const PUBLISHED_CHALLENGE_SONG_WHERE: Prisma.SongWhereInput = {
  published: true,
  status: 'published',
};

export const publishedChallengeSongCountInclude = {
  _count: {
    select: {
      songs: {
        where: PUBLISHED_CHALLENGE_SONG_WHERE,
      },
    },
  },
} as const;

export function mapChallengeListItem(
  challenge: Challenge & { _count: { songs: number } },
) {
  return {
    id: challenge.id,
    title: challenge.title,
    desc: challenge.desc ?? '',
    emoji: challenge.emoji ?? '🎵',
    color: challenge.color ?? '#8b5cf6',
    songCount: challenge._count.songs,
  };
}

export async function assertChallengeJoinable(
  prisma: PrismaClient,
  challengeId?: string,
) {
  if (!challengeId) return null;

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    throw new NotFoundException('话题不存在');
  }

  if (!challenge.active || challenge.status !== 'active') {
    throw new BadRequestException('该话题当前不可参与');
  }

  return challenge;
}
