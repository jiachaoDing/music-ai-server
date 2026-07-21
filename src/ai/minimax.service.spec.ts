import { describe, expect, it, vi } from 'vitest';
import { MiniMaxService } from './minimax.service';

function createService() {
  return new MiniMaxService({
    run: (handler: () => Promise<unknown>) => handler(),
  } as never);
}

describe('MiniMaxService concurrency request wrapper', () => {
  it('retries MiniMax business rate-limit status codes in base_resp', async () => {
    const service = createService();
    vi.spyOn(service as never, 'sleep').mockResolvedValue(undefined);

    const handler = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          base_resp: {
            status_code: 1002,
            status_msg: 'rate limited',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          base_resp: {
            status_code: 0,
            status_msg: 'ok',
          },
          value: 'done',
        },
      });

    const result = await (
      service as unknown as {
        runWithRetry: (
          handler: () => Promise<unknown>,
          options: { retries: number; timeoutMs: number },
        ) => Promise<unknown>;
      }
    ).runWithRetry(handler, { retries: 2, timeoutMs: 1000 });

    expect(handler).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      data: {
        value: 'done',
      },
    });
  });

  it('keeps the provider slot pending after SDK timeout until the request settles', async () => {
    const service = createService();
    let resolveProviderRequest: (value: string) => void = () => undefined;
    const providerRequest = new Promise<string>((resolve) => {
      resolveProviderRequest = resolve;
    });

    const timeoutPromise = (
      service as unknown as {
        withTimeout: <T>(promise: Promise<T>, timeoutMs: number) => Promise<T>;
      }
    ).withTimeout(providerRequest, 10);

    let settled = false;
    timeoutPromise.catch(() => {
      settled = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(settled).toBe(false);

    resolveProviderRequest('late success');

    await expect(timeoutPromise).rejects.toThrow(
      'MiniMax request timeout after 10ms',
    );
    expect(settled).toBe(true);
  });
});
