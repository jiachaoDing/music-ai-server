import { Playlist, PlaylistSong, Song } from '@prisma/client';

type PlaylistWithSongs = Playlist & {
  playlistSongs?: Array<PlaylistSong & { song?: Song | null }>;
};

export function mapPlaylist(playlist: PlaylistWithSongs) {
  const firstSong = playlist.playlistSongs?.[0]?.song;

  return {
    id: playlist.id,
    name: playlist.name,
    type: playlist.type,
    color: playlist.color,
    coverUrl: firstSong?.coverImg ?? firstSong?.cover ?? null,
    songCount: playlist.songCount,
    isSystem: playlist.isSystem,
    createdAt: playlist.createdAt.toISOString(),
  };
}
