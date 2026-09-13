import { LyricLine, LyricsResponse, Track } from '../types/music';
import { API_BASE } from './api';

// Client-side in-memory cache for fetched lyrics
const clientLyricsCache = new Map<string, LyricsResponse>();

export const lyricsService = {
  /**
   * Fetches lyrics directly from YouTube Music's internal/InnerTube endpoint
   * (resolves lyrics browse ID via /next, then retrieves synced timestamps via /browse)
   */
  async getLyricsForTrack(track: Track): Promise<LyricsResponse> {
    const rawId = track.videoId || track.id || '';
    const cleanVideoId = rawId.replace(/^youtube_music:/, '').trim();
    const cacheKey = `${cleanVideoId}:${track.title}:${track.artist}`.toLowerCase();

    if (clientLyricsCache.has(cacheKey)) {
      return clientLyricsCache.get(cacheKey)!;
    }

    try {
      const queryParams = new URLSearchParams();
      if (cleanVideoId) {
        queryParams.set('videoId', cleanVideoId);
      }
      if (track.title) {
        queryParams.set('title', track.title);
      }
      if (track.artist) {
        queryParams.set('artist', track.artist);
      }

      const res = await fetch(`${API_BASE}/api/music/lyrics?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error(`Lyrics API responded with status ${res.status}`);
      }

      const data: LyricsResponse = await res.json();
      if (data && data.success) {
        clientLyricsCache.set(cacheKey, data);
        return data;
      }

      const fallback: LyricsResponse = {
        success: true,
        hasLyrics: false,
        hasTimestamps: false,
        message: data?.message || 'Lyrics not available for this song',
        lyrics: [],
      };
      clientLyricsCache.set(cacheKey, fallback);
      return fallback;
    } catch (err: any) {
      console.warn('Failed to fetch YouTube Music lyrics:', err.message);
      return {
        success: false,
        hasLyrics: false,
        hasTimestamps: false,
        message: 'Could not load lyrics for this track',
        lyrics: [],
      };
    }
  },
};
