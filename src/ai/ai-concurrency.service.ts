import { Injectable } from '@nestjs/common';

type QueueItem<T> = {
  taskId?: string;
  handler: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

@Injectable()
export class AiConcurrencyService {
  private readonly maxConcurrency = Number(
    process.env.MAX_AI_CONCURRENCY || process.env.MAX_CONCURRENCY || 2,
  );
  private active = 0;
  private readonly queue: QueueItem<unknown>[] = [];

  run<T>(handler: () => Promise<T>, taskId?: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        taskId,
        handler,
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
      .then(item.handler)
      .then(item.resolve, item.reject)
      .finally(() => {
        this.active -= 1;
        this.next();
      });
  }
}
