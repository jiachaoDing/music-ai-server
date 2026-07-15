import { Song } from '@prisma/client';
import { FORYOU_UNLOCK_LIKES } from '../constants';

export type SongMapOptions = {
  collectCount?: number;
};

export function mapSong(song: Song, options?: SongMapOptions) {
  const locked =
    song.mode === 'foryou' &&
    !song.unlocked &&
    song.likes < FORYOU_UNLOCK_LIKES;

  const base = {
    id: song.id,
    title: song.title,
    description: song.description,
    mode: song.mode,
    style: song.style,
    tags: (song.tags as string[] | null) ?? [],
    lyrics: song.lyrics,
    audioUrl: locked ? null : song.audioUrl,
    coverUrl: song.coverImg ?? song.cover,
    duration: song.duration,
    status: song.status,
    published: song.published,
    isInstrumental: song.isInstrumental,
    originId: song.originId,
    aiReview: song.review,
    author: song.authorId
      ? {
          id: song.authorId,
          nickname: song.authorName ?? '创作者',
          avatarUrl: null,
        }
      : null,
    likeCount: song.likes,
    collectCount: options?.collectCount ?? 0,
    commentCount: song.commentCount,
    playCount: song.plays,
    remixCount: song.coverCount,
    createdAt: song.createdAt.toISOString(),
    publishedAt: song.publishedAt?.toISOString() ?? null,
  };

  if (song.mode === 'foryou') {
    return {
      ...base,
      forWho: song.forWho,
      locked,
      previewAudioUrl: locked ? song.audioUrl : null,
      unlockCondition: {
        type: 'likes' as const,
        required: FORYOU_UNLOCK_LIKES,
        current: song.likes,
      },
    };
  }

  return base;
}

export function mapSongBrief(song: Song) {
  return {
    id: song.id,
    title: song.title,
    coverUrl: song.coverImg ?? song.cover,
    author: song.authorId
      ? {
          id: song.authorId,
          nickname: song.authorName ?? '创作者',
          avatarUrl: null,
        }
      : null,
    mode: song.mode,
    createdAt: song.createdAt.toISOString(),
  };
}
