import { Injectable } from '@nestjs/common';

type QueueItem<T> = {
  taskId?: string;
  handler: () => Promise<T>;
  onStart?: () => Promise<void> | void;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

type RunOptions = {
  taskId?: string;
  onStart?: () => Promise<void> | void;
};

@Injectable()
export class AiConcurrencyService {
  private readonly maxConcurrency = Number(
    process.env.MAX_AI_CONCURRENCY || process.env.MAX_CONCURRENCY || 2,
  );
  private active = 0;
  private readonly queue: QueueItem<unknown>[] = [];

  run<T>(handler: () => Promise<T>, options?: string | RunOptions): Promise<T> {
    const runOptions =
      typeof options === 'string' ? { taskId: options } : (options ?? {});

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        taskId: runOptions.taskId,
        handler,
        onStart: runOptions.onStart,
        resolve: resolve as QueueItem<unknown>['resolve'],
        reject,
      });
      this.next();
    });
  }

  getActiveCount() {
    return this.active;
  }

  getPendingCount() {
    return this.queue.length;
  }

  getMaxConcurrency() {
    return this.maxConcurrency;
  }

  getQueueAhead(taskId: string) {
    const index = this.queue.findIndex((item) => item.taskId === taskId);
    return index === -1 ? null : this.active + index;
  }

  private next() {
    if (this.active >= this.maxConcurrency || this.queue.length === 0) return;

    const item = this.queue.shift();
    if (!item) return;

    this.active += 1;
    Promise.resolve()
      .then(() => item.onStart?.())
      .then(item.handler)
      .then(item.resolve, item.reject)
      .finally(() => {
        this.active -= 1;
        this.next();
      });
  }
}
