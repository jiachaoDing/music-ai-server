import { Injectable, NotFoundException } from '@nestjs/common';
import { Song } from '@prisma/client';
import { mapSongBrief } from '../common/utils/song-mapper';
import { PrismaService } from '../prisma/prisma.service';

export type TreeNode = {
  id: string;
  title: string;
  coverUrl: string | null;
  author: { id: string; nickname: string; avatarUrl: null } | null;
  mode: string;
  originId: string | null;
  likeCount: number;
  playCount: number;
  createdAt: string;
  children: TreeNode[];
};

@Injectable()
export class TreeService {
  constructor(private readonly prisma: PrismaService) {}

  async getTree(songId: string, userId?: string) {
    const song = await this.prisma.song.findUnique({ where: { id: songId } });
    if (!song) throw new NotFoundException('作品不存在');
    if (!this.canView(song, userId)) throw new NotFoundException('作品不存在');

    const candidateRoot = await this.findRootSong(song);
    const root = this.canView(candidateRoot, userId) ? candidateRoot : song;
    const visibleSongs = await this.prisma.song.findMany({
      where: userId
        ? { OR: [{ published: true }, { authorId: userId }] }
        : { published: true },
      orderBy: { createdAt: 'asc' },
    });
    const childrenByOrigin = new Map<string, Song[]>();
    for (const visibleSong of visibleSongs) {
      if (!visibleSong.originId) continue;
      const children = childrenByOrigin.get(visibleSong.originId) ?? [];
      children.push(visibleSong);
      childrenByOrigin.set(visibleSong.originId, children);
    }
    const remixes = this.buildChildren(root.id, childrenByOrigin, new Set([root.id]));

    return {
      root: mapSongBrief(root),
      remixes,
      currentId: songId,
    };
  }

  private canView(song: Song, userId?: string) {
    return song.published || (!!userId && song.authorId === userId);
  }

  private async findRootSong(song: Song): Promise<Song> {
    let current = song;
    while (current.originId) {
      const parent = await this.prisma.song.findUnique({
        where: { id: current.originId },
      });
      if (!parent) break;
      current = parent;
    }
    return current;
  }

  private buildChildren(
    sourceId: string,
    childrenByOrigin: Map<string, Song[]>,
    ancestors: Set<string>,
  ): TreeNode[] {
    return (childrenByOrigin.get(sourceId) ?? []).flatMap((remixSong) => {
      if (ancestors.has(remixSong.id)) return [];
      const nextAncestors = new Set(ancestors).add(remixSong.id);
      return [{
        ...mapSongBrief(remixSong),
        children: this.buildChildren(remixSong.id, childrenByOrigin, nextAncestors),
      }];
    });
  }
}
