import { describe, expect, it, vi } from 'vitest';
import { TreeService } from './tree.service';

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    async $disconnect() {
      return undefined;
    }
  },
}));

function song(
  id: string,
  originId: string | null,
  options: { published?: boolean; authorId?: string } = {},
) {
  return {
    id,
    originId,
    title: id,
    coverImg: null,
    cover: null,
    authorId: options.authorId ?? 'user-1',
    authorName: '创作者',
    mode: originId ? 'remix' : 'song',
    likes: 0,
    plays: 0,
    published: options.published ?? true,
    createdAt: new Date('2026-07-22T00:00:00.000Z'),
  };
}

describe('TreeService', () => {
  it('builds every remix generation from song originId without relation rows', async () => {
    const root = song('root', null);
    const child = song('child', 'root');
    const grandchild = song('grandchild', 'child');
    const byId = new Map([root, child, grandchild].map((item) => [item.id, item]));
    const prisma = {
      song: {
        findUnique: vi.fn(({ where }) => Promise.resolve(byId.get(where.id) ?? null)),
        findMany: vi.fn(() => Promise.resolve([root, child, grandchild])),
      },
    };

    const result = await new TreeService(prisma as never).getTree('grandchild');

    expect(result.root.id).toBe('root');
    expect(result.currentId).toBe('grandchild');
    expect(result.remixes[0].id).toBe('child');
    expect(result.remixes[0].children[0].id).toBe('grandchild');
  });

  it('does not expose another user private remix in a public tree', async () => {
    const root = song('root', null);
    const publicChild = song('public-child', 'root');
    const privateChild = song('private-child', 'root', {
      published: false,
      authorId: 'user-2',
    });
    const prisma = {
      song: {
        findUnique: vi.fn(({ where }) =>
          Promise.resolve([root, publicChild, privateChild].find((item) => item.id === where.id) ?? null),
        ),
        findMany: vi.fn(() => Promise.resolve([root, publicChild])),
      },
    };

    const result = await new TreeService(prisma as never).getTree('root');
    expect(result.remixes.map((item) => item.id)).toEqual(['public-child']);
  });
});
