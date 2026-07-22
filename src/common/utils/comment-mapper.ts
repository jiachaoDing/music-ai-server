import { Comment } from '@prisma/client';

export function mapComment(comment: Comment) {
  return {
    id: comment.id,
    songId: comment.songId,
    userId: comment.anon ? null : comment.userId,
    userName: comment.anon ? '匿名听众' : (comment.userName ?? '用户'),
    text: comment.text,
    anon: comment.anon,
    createdAt: comment.createdAt.toISOString(),
  };
}
