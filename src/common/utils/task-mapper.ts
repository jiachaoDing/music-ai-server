import { AiTask, Song } from '@prisma/client';
import { mapSong } from './song-mapper';

export function mapTask(task: AiTask, song?: Song | null) {
  const parsedError = task.error
    ? (() => {
        try {
          return JSON.parse(task.error) as { code: number; message: string };
        } catch {
          return { code: 600, message: task.error };
        }
      })()
    : null;

  const result = task.result as Record<string, unknown> | null;

  return {
    taskId: task.id,
    type: task.type,
    status: task.status,
    stage: task.stage,
    progress: task.progress,
    queueAhead: task.queueAhead ?? 0,
    result:
      task.status === 'done'
        ? (result ??
          (song
            ? {
                song: mapSong(song),
              }
            : null))
        : result,
    error: task.status === 'error' ? parsedError : null,
  };
}
