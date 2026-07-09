import { Playlist } from '@prisma/client';

export function mapPlaylist(playlist: Playlist) {
  return {
    id: playlist.id,
    name: playlist.name,
    type: playlist.type,
    color: playlist.color,
    songCount: playlist.songCount,
    isSystem: playlist.isSystem,
    createdAt: playlist.createdAt.toISOString(),
  };
}
