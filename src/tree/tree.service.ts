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
  createdAt: string;
  children: TreeNode[];
};

@Injectable()
export class TreeService {
  constructor(private readonly prisma: PrismaService) {}

  async getTree(songId: string) {
    const song = await this.prisma.song.findUnique({ where: { id: songId } });
    if (!song) throw new NotFoundException('作品不存在');

    const root = await this.findRootSong(song);
    const remixes = await this.buildChildren(root.id);

    return {
      root: mapSongBrief(root),
      remixes,
      currentId: songId,
    };
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

  private async buildChildren(sourceId: string): Promise<TreeNode[]> {
    const relations = await this.prisma.remixRelation.findMany({
      where: { sourceSongId: sourceId },
      orderBy: { createdAt: 'asc' },
    });

    const children: TreeNode[] = [];
    for (const relation of relations) {
      const remixSong = await this.prisma.song.findUnique({
        where: { id: relation.newSongId },
      });
      if (!remixSong) continue;

      const brief = mapSongBrief(remixSong);
      children.push({
        ...brief,
        children: await this.buildChildren(remixSong.id),
      });
    }
    return children;
  }
}
