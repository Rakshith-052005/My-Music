import { Playlist, Track } from '../types/music';

const STORAGE_PLAYLISTS_KEY = 'mymusic_user_playlists';

export const playlistService = {
  getPlaylists(): Playlist[] {
    try {
      const stored = localStorage.getItem(STORAGE_PLAYLISTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  getPlaylist(id: string): Playlist | null {
    const playlists = this.getPlaylists();
    return playlists.find((p) => p.id === id || p.playlistId === id) || null;
  },

  savePlaylist(playlist: Playlist): { playlist: Playlist; isNew: boolean } {
    const playlists = this.getPlaylists();
    const cleanTitle = playlist.title.trim().toLowerCase();

    const existingIndex = playlists.findIndex(
      (p) => p.id === playlist.id || p.title.trim().toLowerCase() === cleanTitle
    );

    if (existingIndex >= 0) {
      // Merge tracks preserving order and avoiding duplicate tracks inside playlist
      const existing = playlists[existingIndex];
      const mergedTracks = [...(existing.tracks || [])];
      const seenVideoIds = new Set(mergedTracks.map((t) => t.videoId));

      for (const t of playlist.tracks || []) {
        if (!seenVideoIds.has(t.videoId)) {
          seenVideoIds.add(t.videoId);
          mergedTracks.push(t);
        }
      }

      const updatedPlaylist: Playlist = {
        ...existing,
        tracks: mergedTracks,
        trackCount: mergedTracks.length,
        artworkUrl: existing.artworkUrl || playlist.artworkUrl || (mergedTracks[0]?.artworkUrl ?? ''),
      };

      playlists[existingIndex] = updatedPlaylist;
      this.persist(playlists);
      return { playlist: updatedPlaylist, isNew: false };
    } else {
      playlists.push(playlist);
      this.persist(playlists);
      return { playlist, isNew: true };
    }
  },

  persist(playlists: Playlist[]): void {
    try {
      localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(playlists));
    } catch (err) {
      console.warn('Failed to persist user playlists:', err);
    }
  },
};
