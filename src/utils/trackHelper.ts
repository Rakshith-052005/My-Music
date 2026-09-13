import { Track } from '../types/music';

/**
 * Centralized helper to extract a clean, valid YouTube video ID from any format.
 */
export function extractVideoId(rawId: string | undefined | null): string {
  if (!rawId || typeof rawId !== 'string') return '';
  const cleaned = rawId.trim();
  if (cleaned.startsWith('youtube_music:')) {
    return cleaned.replace('youtube_music:', '');
  }
  if (cleaned.includes('v=')) {
    const match = cleaned.match(/[?&]v=([^&]+)/);
    if (match && match[1]) return match[1];
  }
  if (cleaned.includes('youtu.be/')) {
    const parts = cleaned.split('youtu.be/');
    if (parts[1]) return parts[1].split('?')[0];
  }
  return cleaned;
}

/**
 * Centralized helper to resolve providerTrackId strictly as 'youtube_music:VIDEO_ID'.
 * NEVER returns 'youtube_music:undefined'.
 */
export function getProviderTrackId(trackOrId: string | { videoId?: string; providerTrackId?: string; id?: string } | null | undefined): string {
  if (!trackOrId) return '';
  let id = '';
  if (typeof trackOrId === 'string') {
    id = extractVideoId(trackOrId);
  } else {
    id = extractVideoId(trackOrId.videoId || trackOrId.providerTrackId || trackOrId.id);
  }
  if (!id || id === 'undefined' || id === 'null') {
    return '';
  }
  return `youtube_music:${id}`;
}

/**
 * Format duration in seconds to M:SS or H:MM:SS
 */
export function formatDuration(seconds: number | undefined | null): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00';
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  const secsStr = secs < 10 ? `0${secs}` : `${secs}`;

  if (hrs > 0) {
    const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hrs}:${minsStr}:${secsStr}`;
  }
  return `${mins}:${secsStr}`;
}

/**
 * Upgrades YouTube Music / Google User Content / YouTube thumbnails to highest possible studio resolution (1200x1200px or maxresdefault).
 */
export function getHighResArtwork(url?: string | null, videoId?: string | null): string {
  if (url && url.trim() !== '') {
    let upgraded = url.trim();
    if (upgraded.includes('googleusercontent.com')) {
      // Replace low resolution dimensions (=w60-h60, =w120-h120, =w544-h544) with ultra high-res =w1200-h1200
      upgraded = upgraded.replace(/=w\d+-h\d+[^?]*/, '=w1200-h1200-l90-rj');
      upgraded = upgraded.replace(/=s\d+[^?]*/, '=s1200');
      return upgraded;
    }
    if (upgraded.includes('ytimg.com/vi/')) {
      return upgraded.replace(/(hqdefault|mqdefault|default|sddefault)\.jpg/, 'maxresdefault.jpg');
    }
    return upgraded;
  }
  if (videoId) {
    return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  }
  return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&h=1200&fit=crop';
}

/**
 * Cleans YouTube music video/audio artifacts from track titles.
 * Transforms 'HIGHEST IN THE ROOM (Audio)' -> 'HIGHEST IN THE ROOM'
 * Transforms 'SICKO MODE (Official Video)' -> 'SICKO MODE'
 * Strips redundant leading 'Artist - ' prefixes if present.
 */
export function cleanTrackTitle(title: string | undefined | null, artistName?: string): string {
  if (!title) return 'Untitled Track';
  let cleaned = title.trim();

  // If title begins with "Artist - Song", strip the prefix if it matches the artist
  if (artistName && cleaned.toLowerCase().startsWith(artistName.toLowerCase())) {
    const withoutArtist = cleaned.slice(artistName.length).replace(/^[\s\-–—:]+/, '').trim();
    if (withoutArtist.length > 0) {
      cleaned = withoutArtist;
    }
  }

  // Remove common YouTube video / audio noise patterns
  const noisePatterns = [
    /\s*[\(\[]\s*official\s+music\s+video\s*[\)\]]/gi,
    /\s*[\(\[]\s*official\s+video\s*[\)\]]/gi,
    /\s*[\(\[]\s*music\s+video\s*[\)\]]/gi,
    /\s*[\(\[]\s*official\s+audio\s*[\)\]]/gi,
    /\s*[\(\[]\s*audio\s*[\)\]]/gi,
    /\s*[\(\[]\s*official\s+lyric\s+video\s*[\)\]]/gi,
    /\s*[\(\[]\s*official\s+lyrics?\s*[\)\]]/gi,
    /\s*[\(\[]\s*lyric\s+video\s*[\)\]]/gi,
    /\s*[\(\[]\s*lyrics?\s*[\)\]]/gi,
    /\s*[\(\[]\s*official\s+visualizer\s*[\)\]]/gi,
    /\s*[\(\[]\s*visualizer\s*[\)\]]/gi,
    /\s*[\(\[]\s*official\s+hd\s*[\)\]]/gi,
    /\s*[\(\[]\s*hd\s*[\)\]]/gi,
    /\s*[\(\[]\s*4k\s*[\)\]]/gi,
    /\s*[\(\[]\s*hq\s*[\)\]]/gi,
  ];

  for (const pattern of noisePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned.trim() || title.trim();
}

/**
 * Validates that an item is an actual music song/track rather than a
 * non-music video, podcast episode, drama clip, or talk show.
 */
export function isMusicTrack(item: any): boolean {
  if (!item) return false;
  const artist = (item.artist || item.author || item.channelTitle || '').toLowerCase().trim();
  const title = (item.title || '').toLowerCase().trim();

  // Filter out podcast / episode channels
  if (
    artist === 'episode' ||
    artist.includes('podcast') ||
    artist === 'various - topic' ||
    artist === 'news'
  ) {
    return false;
  }

  // Filter out obvious non-music talk/drama titles
  const nonMusicKeywords = [
    'exposes that',
    'middle aged beatdown',
    'relationship over',
    'disturbing details',
    'astroworld details',
    'lawsuit',
    'negligence',
    'full episode',
    'court trial',
    'reaction to',
    'vlog #',
    'podcast ep',
    'interview with',
  ];

  if (nonMusicKeywords.some((keyword) => title.includes(keyword))) {
    return false;
  }

  return true;
}

export function parseDurationToSeconds(duration: any): number {
  if (typeof duration === 'number') return duration;
  if (!duration || typeof duration !== 'string') return 0;
  if (duration.includes(':')) {
    const parts = duration.split(':').map((p) => parseInt(p.trim(), 10) || 0);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return parseInt(duration, 10) || 0;
}

/**
 * Cleans YouTube Music artist names by stripping redundant channel indicators,
 * "Topic", "Official Channel", "VEVO", "- Video", "- Song", etc.
 */
export function cleanArtistName(artist: string | undefined | null, title?: string): string {
  if (!artist) {
    if (title && title.includes(' - ')) {
      const parts = title.split(' - ');
      if (parts[0] && parts[0].trim()) {
        return cleanArtistName(parts[0].trim());
      }
    }
    return 'Unknown Artist';
  }

  let cleaned = artist.trim();

  // If the artist field is literally a placeholder like "Song", "Video", "Official Video", "Audio", "Topic", etc.
  const genericPlaceholders = /^(song|songs|video|videos|music video|official video|official audio|audio|topic|artist|track|unknown|official)$/i;
  if (genericPlaceholders.test(cleaned)) {
    if (title && title.includes(' - ')) {
      const parts = title.split(' - ');
      if (parts[0] && parts[0].trim()) {
        return cleanArtistName(parts[0].trim());
      }
    }
    return 'Unknown Artist';
  }

  // Remove common YouTube artist noise suffixes/prefixes
  cleaned = cleaned.replace(/\s*-\s*topic$/i, '');
  cleaned = cleaned.replace(/\s*•\s*topic$/i, '');
  cleaned = cleaned.replace(/\s*-\s*(official\s*)?(music\s*)?(video|audio|song|track|visualizer)$/i, '');
  cleaned = cleaned.replace(/\s+vevo$/i, '');
  cleaned = cleaned.replace(/\s*[\(\[]\s*official\s*(artist\s*)?(channel|video|audio|song)?\s*[\)\]]/gi, '');
  cleaned = cleaned.replace(/\s*official\s+artist\s+channel/gi, '');
  cleaned = cleaned.replace(/\s*official\s+channel/gi, '');

  // Strip trailing/leading punctuation noise like " - ,", "-", ",", "—"
  cleaned = cleaned.replace(/^[\s\-,–—:]+|[\s\-,–—:]+$/g, '').trim();

  return cleaned || 'Unknown Artist';
}

/**
 * Cleans album names, removing fake albums like "Song", "Video", or duplicated title/artist.
 */
export function cleanAlbumTitle(album: string | undefined | null, trackTitle?: string, artistName?: string): string {
  if (!album) return '';
  let trimmed = album.trim();
  trimmed = trimmed.replace(/^[\s\-,–—:]+|[\s\-,–—:]+$/g, '').trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();

  // If the album is simply "Song", "Video", "Single", "Official Video", "Audio", etc.
  if (/^(song|songs|video|videos|official video|official audio|audio|single|ep|track|,|-|—)$/i.test(trimmed)) {
    return '';
  }

  if (trackTitle && lower === trackTitle.toLowerCase().trim()) {
    return '';
  }
  if (artistName && lower === artistName.toLowerCase().trim()) {
    return '';
  }

  return trimmed;
}

/**
 * Ensures a track object is normalized with correct providerTrackId and fallbacks
 */
export function normalizeTrack(raw: any): Track {
  const videoId = extractVideoId(raw.videoId || raw.id || raw.providerTrackId);
  const providerTrackId = getProviderTrackId(videoId);

  let artworkUrl = raw.artworkUrl || raw.thumbnail || raw.thumbnails?.[0]?.url || raw.artwork || '';
  if (!artworkUrl && videoId) {
    artworkUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }

  const rawTitle = raw.title || 'Untitled Track';
  let rawArtist = raw.artist || raw.author || raw.channelTitle || '';
  let rawAlbum = raw.album || '';

  const isPlaceholderArtist =
    !rawArtist ||
    /^(song|songs|video|videos|music video|official video|official audio|audio|topic|artist|track|unknown|unknown artist|official)$/i.test(
      rawArtist.trim()
    );

  // If the parsed artist was a type marker like "Song" and the album holds the actual artist name (e.g. "Drake")
  if (
    isPlaceholderArtist &&
    rawAlbum &&
    !/^(song|songs|video|videos|official video|official audio|audio|single|ep|track)$/i.test(rawAlbum.trim())
  ) {
    rawArtist = rawAlbum;
    rawAlbum = '';
  }

  let artist = cleanArtistName(rawArtist, rawTitle);
  if (artist === 'Unknown Artist' && rawTitle.includes(' - ')) {
    const parts = rawTitle.split(' - ');
    if (parts[0] && parts[0].trim().length > 1) {
      artist = cleanArtistName(parts[0].trim());
    }
  }

  const cleanTitle = cleanTrackTitle(rawTitle, artist);
  const album = cleanAlbumTitle(rawAlbum, cleanTitle, artist);

  return {
    id: videoId || raw.id || String(Date.now()),
    videoId: videoId,
    providerTrackId: providerTrackId,
    title: cleanTitle,
    artist: artist,
    artistId: raw.artistId || raw.channelId || '',
    album: album,
    albumId: raw.albumId || '',
    artworkUrl: artworkUrl,
    duration: parseDurationToSeconds(raw.duration),
    views: raw.views,
    isPlayable: raw.isPlayable !== false,
    provider: 'youtube_music',
  };
}

/**
 * Canonical key for track title to detect duplicates across audio and video releases.
 * E.g., "Starboy (feat. Daft Punk)" and "Starboy ft. Daft Punk (Official Video)" both map to "starboy".
 */
export function getBaseTrackKey(title: string | undefined | null): string {
  if (!title) return '';
  let s = title.toLowerCase();
  // Strip parentheticals and bracketed text like (Official Video), (feat. ...), [Official Audio]
  s = s.replace(/\(.*?\)/g, ' ').replace(/\[.*?\]/g, ' ');
  // Strip feature markers
  s = s.replace(/\b(ft\.?|feat\.?|featuring)\b.*$/i, ' ');
  // Strip dashes like "- Official Video" or "- Remix"
  s = s.replace(/[-–—].*$/, ' ');
  // Keep only alphanumeric
  s = s.replace(/[^a-z0-9]/g, '');
  return s.trim();
}

/**
 * Separates and deduplicates songs and music videos from YouTube Music artist responses.
 * Resolves the issue where video catalog endpoints repeat the exact same top 5 songs.
 */
export function deduplicateArtistTracks(rawTracks: Track[]): {
  uniqueSongs: Track[];
  musicVideos: Track[];
} {
  const seenKeys = new Map<string, Track>();
  const musicVideos: Track[] = [];
  const uniqueSongs: Track[] = [];

  for (const track of rawTracks) {
    const isVideo =
      track.artworkUrl?.includes('i.ytimg.com') ||
      /official video|music video|official audio|live on|live from/i.test(track.title);

    if (isVideo) {
      musicVideos.push(track);
    }

    const key = getBaseTrackKey(track.title);
    if (!key) {
      uniqueSongs.push(track);
      continue;
    }

    if (!seenKeys.has(key)) {
      seenKeys.set(key, track);
      uniqueSongs.push(track);
    } else {
      // If previous entry used video thumbnail and current entry is high-res studio audio art, upgrade it!
      const existing = seenKeys.get(key)!;
      const existingIsVideo = existing.artworkUrl?.includes('i.ytimg.com');
      const currentIsAudio = track.artworkUrl?.includes('yt3.googleusercontent.com');
      if (existingIsVideo && currentIsAudio) {
        const idx = uniqueSongs.indexOf(existing);
        if (idx !== -1) {
          uniqueSongs[idx] = track;
          seenKeys.set(key, track);
        }
      }
    }
  }

  // Also deduplicate music videos by videoId or canonical key
  const seenVideoIds = new Set<string>();
  const distinctVideos: Track[] = [];
  for (const v of musicVideos) {
    if (v.videoId && !seenVideoIds.has(v.videoId)) {
      seenVideoIds.add(v.videoId);
      distinctVideos.push(v);
    }
  }

  return { uniqueSongs, musicVideos: distinctVideos };
}

