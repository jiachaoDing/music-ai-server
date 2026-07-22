import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { RemixSongDto } from './remix-song.dto';

describe('RemixSongDto', () => {
  it('keeps and validates the remix fields used by the whitelist pipe', async () => {
    const dto = Object.assign(new RemixSongDto(), {
      title: '夏日回声（翻唱）',
      style: '流行 / 治愈',
      lyrics: '[Verse]\n夏日的风',
      prompt: '保留原曲情绪，改成轻快编曲',
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects a remix without style or prompt', async () => {
    const errors = await validate(Object.assign(new RemixSongDto(), {}));
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['style', 'prompt']),
    );
  });
});
