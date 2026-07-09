import { Comment } from '@prisma/client';

export function mapComment(comment: Comment) {
  return {
    id: comment.id,
    songId: comment.songId,
    text: comment.text,
    anon: comment.anon,
    author: comment.anon
      ? null
      : {
          id: comment.userId,
          nickname: comment.userName ?? '用户',
          avatarUrl: null,
        },
    createdAt: comment.createdAt.toISOString(),
  };
}
