import { Track, Album, Artist, Playlist, HomeShelf, GenreCategory, ActiveTab, ListeningEvent, SongAudioBlueprint } from '../types/music';
import { normalizeTrack, getProviderTrackId, isMusicTrack, cleanTrackTitle, deduplicateArtistTracks } from '../utils/trackHelper';
import { tasteService, PRESET_ARTISTS } from './tasteService';
import { playlistService } from './playlistService';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const RENDER_FALLBACK = 'https://mymusic-api-siuh.onrender.com/api';

async function fetchWithFallback(endpoint: string, options?: RequestInit): Promise<any> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // 1. Try local Express backend first
  try {
    const res = await fetch(`${API_BASE}${cleanEndpoint}`, options);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.success !== false || Array.isArray(data.data) || Array.isArray(data))) {
        return data;
      }
    }
  } catch (err) {
    console.warn(`Local API endpoint ${cleanEndpoint} failed, attempting render fallback...`, err);
  }

  // 2. If local API fails or returns unsuccessful, try direct Render backend fallback
  try {
    const fallbackUrl = `${RENDER_FALLBACK}${cleanEndpoint}`;
    const fallbackRes = await fetch(fallbackUrl, options);
    if (fallbackRes.ok) {
      const data = await fallbackRes.json();
      return data;
    }
  } catch (fallbackErr) {
    console.warn(`Render fallback failed for ${cleanEndpoint}:`, fallbackErr);
  }

  return { success: true, data: [] };
}

export const apiService = {
  /**
   * Fetch home shelves with real YouTube Music content
   */
  async getHome(tab: ActiveTab = 'all'): Promise<HomeShelf[]> {
    try {
      if (tab === 'podcasts') {
        const podcastData = await this.getPodcasts();
        return [
          {
            title: 'Top Podcasts & Audio Shows',
            subtitle: 'Curated episodes and series',
            type: 'podcasts',
            contents: podcastData,
          },
        ];
      }

      const res = await fetchWithFallback('/music/home');
      if (res && res.success && Array.isArray(res.data)) {
        return res.data.map((shelf: any) => ({
          title: shelf.title || 'Recommended',
          subtitle: shelf.subtitle,
          type: shelf.type || 'shelf',
          contents: (shelf.contents || []).map((item: any) => {
            if (item.videoId || item.duration !== undefined) {
              return normalizeTrack(item);
            }
            return item;
          }),
        }));
      }
    } catch (err) {
      console.error('Error fetching home data:', err);
    }
    return [];
  },

  /**
   * Search YouTube Music for songs, artists, albums, playlists, or podcasts
   */
  async search(query: string, type: string = 'all'): Promise<{
    songs: Track[];
    artists: Artist[];
    albums: Album[];
    playlists: Playlist[];
  }> {
    if (!query.trim()) {
      return { songs: [], artists: [], albums: [], playlists: [] };
    }

    try {
      const endpoint = `/music/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`;
      const res = await fetchWithFallback(endpoint);

      if (res && res.success && Array.isArray(res.data)) {
        const songs: Track[] = [];
        const artists: Artist[] = [];
        const albums: Album[] = [];
        const playlists: Playlist[] = [];

        const seenSongIds = new Set<string>();
        const seenArtistNames = new Set<string>();
        const seenAlbumIds = new Set<string>();
        const seenPlaylistIds = new Set<string>();

        const cleanQuery = query.toLowerCase().trim();

        // 1. Check if query directly matches any known artist name
        const matchedPresetArt = tasteService.getArtistArtwork(cleanQuery);
        const presetArtist = PRESET_ARTISTS.find(
          (p) =>
            p.name.toLowerCase() === cleanQuery ||
            cleanQuery.includes(p.name.toLowerCase()) ||
            p.name.toLowerCase().includes(cleanQuery)
        );

        if (presetArtist || matchedPresetArt) {
          const artistName = presetArtist?.name || query.trim();
          const artUrl = matchedPresetArt || presetArtist?.artworkUrl || '';
          seenArtistNames.add(artistName.toLowerCase());
          artists.push({
            id: presetArtist?.artistId || `artist_${artistName.toLowerCase().replace(/\s+/g, '_')}`,
            artistId: presetArtist?.artistId || `artist_${artistName.toLowerCase().replace(/\s+/g, '_')}`,
            name: artistName,
            artworkUrl: artUrl,
            provider: 'youtube_music',
          });
        }

        res.data.forEach((item: any) => {
          // Normalize song if it has videoId
          if (item.videoId) {
            const vId = String(item.videoId).trim();
            if (vId && !seenSongIds.has(vId) && isMusicTrack(item)) {
              seenSongIds.add(vId);
              const normalized = normalizeTrack(item);
              songs.push(normalized);

              // Extract primary artist from track for artist page navigation
              const rawArtist = (item.artist || item.author || '').trim();
              const primaryArtist = rawArtist.split(',')[0].split('&')[0].split('feat.')[0].trim();

              const isJunkArtist =
                !primaryArtist ||
                primaryArtist.length <= 1 ||
                primaryArtist.toLowerCase() === 'various artists' ||
                primaryArtist.toLowerCase() === 'various' ||
                primaryArtist.toLowerCase() === 'episode' ||
                primaryArtist.toLowerCase().includes('podcast') ||
                primaryArtist.toLowerCase().includes('- topic');

              if (!isJunkArtist && !seenArtistNames.has(primaryArtist.toLowerCase()) && artists.length < 8) {
                seenArtistNames.add(primaryArtist.toLowerCase());
                // Match with verified preset portraits (NEVER song album art or video thumbnails)
                const matchedPreset = PRESET_ARTISTS.find(
                  (p) =>
                    p.name.toLowerCase() === primaryArtist.toLowerCase() ||
                    p.name.toLowerCase().includes(primaryArtist.toLowerCase()) ||
                    primaryArtist.toLowerCase().includes(p.name.toLowerCase())
                );
                const realPortrait = matchedPreset?.artworkUrl || tasteService.getArtistArtwork(primaryArtist) || '';
                const aId = matchedPreset?.artistId || item.artistId || `artist_${primaryArtist.toLowerCase().replace(/\s+/g, '_')}`;

                artists.push({
                  id: aId,
                  artistId: aId,
                  name: matchedPreset?.name || primaryArtist,
                  artworkUrl: realPortrait,
                  provider: 'youtube_music',
                });
              }

              // Only extract album if album title directly matches search query
              if (
                item.albumId &&
                item.album &&
                item.album.trim().length > 2 &&
                !seenAlbumIds.has(item.albumId) &&
                (cleanQuery.includes(item.album.toLowerCase()) ||
                  item.album.toLowerCase().includes(cleanQuery))
              ) {
                seenAlbumIds.add(item.albumId);
                albums.push({
                  id: item.albumId,
                  albumId: item.albumId,
                  title: item.album,
                  artist: primaryArtist,
                  artistId: item.artistId || '',
                  artworkUrl: normalized.artworkUrl,
                  provider: 'youtube_music',
                });
              }
            }
            return;
          }

          // Handle standalone artist items from API
          if (item.type === 'artist' || (item.artistId && !item.albumId && !item.videoId)) {
            const aId = item.artistId || item.id;
            const aName = (item.name || item.title || '').trim();
            if (aName && !seenArtistNames.has(aName.toLowerCase())) {
              seenArtistNames.add(aName.toLowerCase());
              // Use verified portrait or API artwork if it does not look like a video thumbnail
              let art = tasteService.getArtistArtwork(aName) || '';
              if (!art && item.artworkUrl && !item.artworkUrl.includes('i.ytimg.com/vi/')) {
                art = item.artworkUrl;
              }
              artists.push({
                id: aId,
                artistId: aId,
                name: aName,
                artworkUrl: art,
                provider: 'youtube_music',
              });
            }
            return;
          }

          // Handle standalone album items
          if (
            (item.type === 'album' || (item.albumId && (item.albumId.startsWith('MPREb') || item.albumId.startsWith('OLAK5h')))) &&
            !item.videoId
          ) {
            const aId = item.albumId || item.id;
            if (!seenAlbumIds.has(aId)) {
              seenAlbumIds.add(aId);
              albums.push({
                id: aId,
                albumId: aId,
                title: item.title || 'Album',
                artist: item.artist || item.author || '',
                artistId: item.artistId,
                year: item.year,
                artworkUrl: item.artworkUrl || item.thumbnail || '',
                trackCount: item.trackCount,
                provider: 'youtube_music',
              });
            }
            return;
          }

          // Handle standalone playlist items
          if (
            (item.type === 'playlist' || (item.playlistId && (item.playlistId.startsWith('VL') || item.playlistId.startsWith('PL') || item.playlistId.startsWith('RD')))) &&
            !item.videoId
          ) {
            const pId = item.playlistId || item.id;
            if (!seenPlaylistIds.has(pId)) {
              seenPlaylistIds.add(pId);
              playlists.push({
                id: pId,
                playlistId: pId,
                title: item.title || 'Playlist',
                author: item.author || item.artist || '',
                artworkUrl: item.artworkUrl || item.thumbnail || '',
                trackCount: item.trackCount,
                isMix: item.playlistId?.startsWith('RD'),
                provider: 'youtube_music',
              });
            }
            return;
          }

          // Fallback: validate track
          if (isMusicTrack(item)) {
            const track = normalizeTrack(item);
            if (track.videoId && !seenSongIds.has(track.videoId)) {
              seenSongIds.add(track.videoId);
              songs.push(track);
            }
          }
        });

        // Fast, non-blocking artist discography enrichment (capped at 1.2s timeout)
        const targetArtistId = artists[0]?.artistId;
        if (targetArtistId && targetArtistId.startsWith('UC')) {
          try {
            const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200));
            const artistDetails = await Promise.race([this.getArtist(targetArtistId), timeoutPromise]);
            if (artistDetails) {
              if (!artists[0].artworkUrl && artistDetails.artworkUrl) {
                artists[0].artworkUrl = artistDetails.artworkUrl;
              }
              if (artistDetails.albums && artistDetails.albums.length > 0) {
                const existingTitles = new Set(albums.map((a) => a.title.toLowerCase()));
                const extraAlbums = artistDetails.albums.filter((a) => !existingTitles.has(a.title.toLowerCase()));
                albums.unshift(...extraAlbums);
              }
            }
          } catch {
            // Ignore enrichment timeout
          }
        }

        return { songs, artists, albums, playlists };
      }
    } catch (err) {
      console.error('Error during search:', err);
    }

    return { songs: [], artists: [], albums: [], playlists: [] };
  },

  /**
   * Fetch artist profile with popular songs, distinct actual albums (MPREb / OLAK5h), and singles
   */
  async getArtist(artistId: string, artistName?: string): Promise<Artist | null> {
    try {
      const endpoint = artistName
        ? `/music/artists/${encodeURIComponent(artistId)}?name=${encodeURIComponent(artistName)}`
        : `/music/artists/${encodeURIComponent(artistId)}`;
      const res = await fetchWithFallback(endpoint);
      if (res && res.success && res.data) {
        const data = res.data;
        const name = data.name || 'Artist';
        let artworkUrl = data.artworkUrl || tasteService.getArtistArtwork(name) || '';

        if (artworkUrl) {
          tasteService.setArtistArtwork(name, artworkUrl);
        }

        const rawTracks = (data.songs || []).filter(isMusicTrack).map(normalizeTrack);
        const { uniqueSongs, musicVideos } = deduplicateArtistTracks(rawTracks);

        return {
          id: data.artistId || artistId,
          artistId: data.artistId || artistId,
          name: name,
          description: data.description,
          artworkUrl: artworkUrl,
          subscribers: data.subscribers,
          songs: uniqueSongs,
          videos: musicVideos,
          // Ensure Albums shelf only contains actual studio albums
          albums: (data.albums || [])
            .filter(
              (alb: any) =>
                !alb.albumId?.startsWith('VL') &&
                !alb.albumId?.startsWith('PL') &&
                !alb.albumId?.startsWith('RD') &&
                alb.albumId?.startsWith('MPREb')
            )
            .map((alb: any) => ({
              id: alb.albumId || alb.id,
              albumId: alb.albumId || alb.id,
              title: alb.title || 'Album',
              artist: data.name || alb.artist,
              artistId: artistId,
              year: alb.year,
              artworkUrl: alb.artworkUrl || '',
              trackCount: alb.trackCount,
              provider: 'youtube_music',
            })),
          singles: (data.singles || []).map((single: any) => ({
            id: single.albumId || single.id,
            albumId: single.albumId || single.id,
            title: single.title || 'Single',
            artist: data.name || single.artist,
            artistId: artistId,
            year: single.year,
            artworkUrl: single.artworkUrl || '',
            trackCount: single.trackCount || 1,
            provider: 'youtube_music',
          })),
          provider: 'youtube_music',
        };
      }
    } catch (err) {
      console.error(`Error fetching artist ${artistId}:`, err);
    }
    return null;
  },

  /**
   * Fetch album details and tracks
   */
  async getAlbum(albumId: string, albumHint?: Partial<Album>): Promise<Album | null> {
    try {
      let data: any = null;
      try {
        const queryParams = new URLSearchParams();
        if (albumHint?.title) queryParams.append('title', albumHint.title);
        if (albumHint?.artist) queryParams.append('artist', albumHint.artist);
        const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

        const res = await fetchWithFallback(`/music/albums/${albumId}${qs}`);
        if (res && res.success && res.data) {
          data = res.data;
        }
      } catch (e) {
        console.warn('Direct album fetch failed, trying search fallback:', e);
      }

      const title = data?.title || albumHint?.title || '';
      const artist = data?.artist || albumHint?.artist || '';
      const artworkUrl = data?.artworkUrl || albumHint?.artworkUrl || '';
      const year = data?.year || albumHint?.year;

      let tracks: Track[] = (data?.tracks || []).filter(isMusicTrack).map(normalizeTrack);

      // If tracks are empty, search for the album tracks
      if (tracks.length === 0 && (title || albumId)) {
        const searchTerms = `${title || albumId} ${artist}`.trim();
        const searchRes = await this.search(`${searchTerms} album songs`);
        if (searchRes.songs.length > 0) {
          tracks = searchRes.songs.slice(0, 20);
        }
      }

      return {
        id: data?.albumId || albumId,
        albumId: data?.albumId || albumId,
        title: title || 'Album',
        artist: artist || 'Artist',
        artistId: data?.artistId || albumHint?.artistId || '',
        year: year,
        artworkUrl: artworkUrl,
        trackCount: tracks.length || data?.trackCount || 1,
        tracks: tracks,
        provider: 'youtube_music',
      };
    } catch (err) {
      console.error(`Error fetching album ${albumId}:`, err);
    }
    return null;
  },

  /**
   * Fetch playlist details and tracks
   */
  async getPlaylist(playlistId: string): Promise<Playlist | null> {
    // 1. Check custom user/imported playlists first
    const customPl = playlistService.getPlaylist(playlistId);
    if (customPl) {
      return customPl;
    }

    try {
      const res = await fetchWithFallback(`/music/playlists/${playlistId}`);
      if (res && res.success && res.data) {
        const data = res.data;
        let tracks: Track[] = (data.tracks || []).map(normalizeTrack);

        if (tracks.length === 0 && data.title) {
          const searchRes = await this.search(`${data.title}`);
          if (searchRes.songs.length > 0) {
            tracks = searchRes.songs.slice(0, 15);
          }
        }

        return {
          id: data.playlistId || playlistId,
          playlistId: data.playlistId || playlistId,
          title: data.title || 'Playlist',
          description: data.description,
          author: data.author || 'Curator',
          artworkUrl: data.artworkUrl || '',
          trackCount: data.trackCount || tracks.length,
          tracks: tracks,
          isMix: playlistId.startsWith('RD'),
          provider: 'youtube_music',
        };
      }
    } catch (err) {
      console.error(`Error fetching playlist ${playlistId}:`, err);
    }
    return null;
  },

  /**
   * Fetch real podcast content from YouTube Music
   */
  async getPodcasts(): Promise<Playlist[]> {
    try {
      // First try /music/podcasts endpoint
      try {
        const res = await fetchWithFallback('/music/podcasts');
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          return res.data.map((p: any) => ({
            id: p.playlistId || p.id,
            playlistId: p.playlistId || p.id,
            title: p.title || 'Podcast',
            description: p.description || 'Podcast Series',
            author: p.author || 'Host',
            artworkUrl: p.artworkUrl || '',
            trackCount: p.trackCount,
            provider: 'youtube_music',
          }));
        }
      } catch {
        // Fallback to searching podcasts
      }

      // Real search for podcasts on YouTube Music
      const searchRes = await this.search('podcast shows episodes', 'playlists');
      if (searchRes.playlists.length > 0) {
        return searchRes.playlists;
      }
    } catch (err) {
      console.error('Error fetching podcasts:', err);
    }
    return [];
  },

  /**
   * Fetch music genres/categories for search browse
   */
  async getGenres(): Promise<GenreCategory[]> {
    try {
      const res = await fetchWithFallback('/music/genres');
      if (res && res.success && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (err) {
      console.warn('Error fetching genres, using standard categories:', err);
    }
    return [
      { title: 'Chill', color: '#1A1A1D', artworkUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&q=80' },
      { title: 'Pop', color: '#B8265C', artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80' },
      { title: 'Hip-Hop', color: '#F25F22', artworkUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&q=80' },
      { title: 'R&B', color: '#88304E', artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80' },
      { title: 'Workout', color: '#005082', artworkUrl: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=500&q=80' },
      { title: 'Focus & Study', color: '#2B580C', artworkUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&q=80' },
      { title: 'Rock', color: '#7E0CF5', artworkUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&q=80' },
      { title: 'Dance & EDM', color: '#00A8CC', artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80' },
    ];
  },

  /**
   * Fetch official algorithmic radio / Up Next track queue for a song
   */
  async getRadioTracks(videoId: string): Promise<Track[]> {
    if (!videoId) return [];
    try {
      const res = await fetchWithFallback(`/music/radio?videoId=${encodeURIComponent(videoId)}`);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.filter(isMusicTrack).map(normalizeTrack);
      }
    } catch (err) {
      console.warn(`Error fetching radio for ${videoId}:`, err);
    }
    return [];
  },

  /**
   * Smart Queue recommendation fetcher
   */
  async getSmartQueueRecommendations(currentTrack: Track, recentVideoIds: string[] = []): Promise<Track[]> {
    try {
      // 1. Try recommendations endpoint with videoId
      const query = currentTrack.artist || currentTrack.title;
      const searchRes = await this.search(query, 'songs');

      // Filter out recent tracks and enforce artist diversity (maximum 2 consecutive tracks from the same artist)
      const recommendations: Track[] = [];
      const seenIds = new Set(recentVideoIds);
      seenIds.add(currentTrack.videoId);

      let lastArtist = currentTrack.artist;
      let consecutiveArtistCount = 1;

      for (const track of searchRes.songs) {
        if (!seenIds.has(track.videoId)) {
          if (track.artist === lastArtist) {
            if (consecutiveArtistCount >= 2) {
              continue; // Skip to maintain artist diversity
            }
            consecutiveArtistCount++;
          } else {
            lastArtist = track.artist;
            consecutiveArtistCount = 1;
          }

          seenIds.add(track.videoId);
          recommendations.push(track);
          if (recommendations.length >= 6) break;
        }
      }

      return recommendations;
    } catch (err) {
      console.error('Error fetching smart queue recommendations:', err);
      return [];
    }
  },

  /**
   * Post listening event to backend / Supabase
   */
  async sendListeningEvent(event: ListeningEvent, token?: string): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await fetch(`${API_BASE}/music/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify(event),
      });
      return true;
    } catch {
      // Non-blocking telemetry
      return false;
    }
  },

  /**
   * Generate or retrieve the AI Audio Blueprint and Cultural Taxonomy for a track
   */
  async getTrackBlueprint(
    title: string,
    artist: string,
    genre: string = 'Pop',
    year: string = ''
  ): Promise<SongAudioBlueprint | null> {
    try {
      const res = await fetch(`${API_BASE}/music/blueprint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, artist, genre, year }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.data) {
          return data.data;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch track blueprint:', err);
    }
    return null;
  },
};
