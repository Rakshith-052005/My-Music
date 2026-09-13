import JSZip from 'jszip';
import { Track } from '../types/music';
import { cleanTrackTitle, cleanArtistName, getBaseTrackKey } from '../utils/trackHelper';

export interface NormalizedSpotifyTrack {
  source: 'spotify';
  spotifyUri?: string;
  spotifyTrackId?: string;
  title: string;
  artists: string[];
  artist: string;
  album?: string;
  liked: boolean;
  addedDate?: string;
}

export interface NormalizedSpotifyPlaylist {
  name: string;
  description?: string;
  tracks: NormalizedSpotifyTrack[];
}

export interface NormalizedSpotifyHistoryItem {
  title: string;
  artist: string;
  album?: string;
  playedAt?: string;
  msPlayed?: number;
  spotifyUri?: string;
  spotifyTrackId?: string;
}

export interface NormalizedSpotifySearchItem {
  query: string;
  timestamp?: string;
}

export interface SpotifyDetectionResult {
  sourceFileName: string;
  savedSongs: NormalizedSpotifyTrack[];
  playlists: NormalizedSpotifyPlaylist[];
  listeningHistory: NormalizedSpotifyHistoryItem[];
  searchHistory: NormalizedSpotifySearchItem[];
  detectedCategories: {
    savedSongs: boolean;
    playlists: boolean;
    listeningHistory: boolean;
    searchHistory: boolean;
  };
}

/**
 * Parses Spotify track URI to extract Spotify Track ID
 * E.g., "spotify:track:3AJwUDP91913f9M2y1L31m" -> "3AJwUDP91913f9M2y1L31m"
 */
export function extractSpotifyTrackId(uri?: string): string | undefined {
  if (!uri || typeof uri !== 'string') return undefined;
  if (uri.includes('spotify:track:')) {
    return uri.split('spotify:track:')[1]?.split('?')[0];
  }
  if (uri.includes('open.spotify.com/track/')) {
    return uri.split('open.spotify.com/track/')[1]?.split('?')[0];
  }
  return undefined;
}

/**
 * Helper to clean and normalize a string for fuzzy matching.
 * Strips punctuation, feature tags, remaster tags, and normalizes spaces.
 */
export function normalizeForMatch(str?: string): string {
  if (!str) return '';
  let s = str.toLowerCase().trim();

  // Remove common remaster / edition suffixes
  s = s.replace(/\s*[\(\[]\s*(remastered|remaster|deluxe|version|edition|anniversary|live|radio edit|original)\s*.*[\)\]]/gi, '');
  s = s.replace(/\s*-\s*(remastered|remaster|deluxe|version|edition|anniversary|live|radio edit)\s*.*/gi, '');

  // Normalize featuring tags
  s = s.replace(/\b(ft\.?|feat\.?|featuring)\b.*$/i, '');

  // Replace punctuation and special characters with spaces
  s = s.replace(/[^a-z0-9]/gi, ' ');

  // Collapse multiple spaces
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Extract artist names array from various raw Spotify JSON representations
 */
function extractArtistNames(rawItem: any): { artists: string[]; primaryArtist: string } {
  let artists: string[] = [];

  if (typeof rawItem.artist === 'string' && rawItem.artist.trim()) {
    artists = rawItem.artist.split(',').map((a: string) => a.trim());
  } else if (typeof rawItem.artistName === 'string' && rawItem.artistName.trim()) {
    artists = rawItem.artistName.split(',').map((a: string) => a.trim());
  } else if (typeof rawItem.master_metadata_album_artist_name === 'string' && rawItem.master_metadata_album_artist_name.trim()) {
    artists = [rawItem.master_metadata_album_artist_name.trim()];
  } else if (Array.isArray(rawItem.artists)) {
    artists = rawItem.artists.map((a: any) => (typeof a === 'string' ? a : a.name || '')).filter(Boolean);
  } else if (rawItem.track && typeof rawItem.track.artistName === 'string') {
    artists = rawItem.track.artistName.split(',').map((a: string) => a.trim());
  }

  const cleanedArtists = artists.map((a) => cleanArtistName(a)).filter((a) => a && a !== 'Unknown Artist');
  const primaryArtist = cleanedArtists[0] || cleanArtistName(typeof rawItem.artist === 'string' ? rawItem.artist : 'Unknown Artist');

  return {
    artists: cleanedArtists.length > 0 ? cleanedArtists : [primaryArtist],
    primaryArtist,
  };
}

/**
 * Normalizes an individual raw object from Spotify JSON into a NormalizedSpotifyTrack
 */
export function normalizeRawSpotifyItem(rawItem: any): NormalizedSpotifyTrack | null {
  if (!rawItem || typeof rawItem !== 'object') return null;

  // Handles nested item structures, e.g., playlist items or library wrappers
  const target = rawItem.track && typeof rawItem.track === 'object' ? rawItem.track : rawItem;

  const rawTitle =
    target.track ||
    target.trackName ||
    target.name ||
    target.title ||
    target.master_metadata_track_name ||
    '';

  if (!rawTitle || typeof rawTitle !== 'string' || !rawTitle.trim()) {
    return null;
  }

  const { artists, primaryArtist } = extractArtistNames(target);
  const cleanTitle = cleanTrackTitle(rawTitle, primaryArtist);

  const album =
    target.album ||
    target.albumName ||
    target.master_metadata_album_album_name ||
    '';

  const uri =
    target.uri ||
    target.trackUri ||
    target.spotify_track_uri ||
    '';

  const spotifyTrackId = extractSpotifyTrackId(uri);

  return {
    source: 'spotify',
    spotifyUri: uri || undefined,
    spotifyTrackId: spotifyTrackId,
    title: cleanTitle,
    artists: artists,
    artist: primaryArtist,
    album: typeof album === 'string' ? album.trim() : undefined,
    liked: true,
    addedDate: target.addedAt || target.added_at || target.ts || undefined,
  };
}

/**
 * Parses playlist objects from Spotify JSON data
 */
export function extractPlaylistsFromJsonObject(jsonData: any): NormalizedSpotifyPlaylist[] {
  const playlists: NormalizedSpotifyPlaylist[] = [];

  const rawPlaylistsArray: any[] = [];
  if (Array.isArray(jsonData)) {
    // Array of playlist objects
    if (jsonData.some((item) => item && (item.name || item.title) && (Array.isArray(item.items) || Array.isArray(item.tracks)))) {
      rawPlaylistsArray.push(...jsonData);
    }
  } else if (jsonData && typeof jsonData === 'object') {
    if (Array.isArray(jsonData.playlists)) {
      rawPlaylistsArray.push(...jsonData.playlists);
    }
  }

  for (const pl of rawPlaylistsArray) {
    const plName = pl.name || pl.title || pl.playlistName;
    if (!plName || typeof plName !== 'string') continue;

    // Skip generic "Liked Songs" or "Your Library" playlists in playlists category to avoid duplicating saved songs category
    const plNameLower = plName.toLowerCase().trim();
    if (plNameLower === 'liked songs' || plNameLower === 'your library' || plNameLower === 'saved tracks') {
      continue;
    }

    const items = Array.isArray(pl.items) ? pl.items : Array.isArray(pl.tracks) ? pl.tracks : [];
    const playlistTracks: NormalizedSpotifyTrack[] = [];

    for (const rawItem of items) {
      const normalized = normalizeRawSpotifyItem(rawItem);
      if (normalized && normalized.title && normalized.artist) {
        playlistTracks.push(normalized);
      }
    }

    if (playlistTracks.length > 0) {
      playlists.push({
        name: plName.trim(),
        description: pl.description || undefined,
        tracks: playlistTracks,
      });
    }
  }

  return playlists;
}

/**
 * Parses listening history entries from Spotify JSON data (StreamingHistory / Endsong)
 */
export function extractListeningHistoryFromJsonObject(jsonData: any): NormalizedSpotifyHistoryItem[] {
  const history: NormalizedSpotifyHistoryItem[] = [];

  let itemsArray: any[] = [];
  if (Array.isArray(jsonData)) {
    itemsArray = jsonData;
  } else if (jsonData && typeof jsonData === 'object') {
    if (Array.isArray(jsonData.history)) itemsArray = jsonData.history;
    else if (Array.isArray(jsonData.streamingHistory)) itemsArray = jsonData.streamingHistory;
    else if (Array.isArray(jsonData.items)) itemsArray = jsonData.items;
  }

  for (const raw of itemsArray) {
    if (!raw || typeof raw !== 'object') continue;

    const trackTitle =
      raw.trackName ||
      raw.master_metadata_track_name ||
      raw.track ||
      raw.title ||
      '';

    const artistName =
      raw.artistName ||
      raw.master_metadata_album_artist_name ||
      raw.artist ||
      '';

    if (!trackTitle || !artistName || typeof trackTitle !== 'string' || typeof artistName !== 'string') {
      continue;
    }

    const albumName = raw.master_metadata_album_album_name || raw.albumName || raw.album || undefined;
    const playedAt = raw.endTime || raw.ts || raw.timestamp || raw.playedAt || undefined;
    const msPlayed = raw.msPlayed || raw.ms_played || undefined;
    const uri = raw.spotify_track_uri || raw.uri || undefined;

    history.push({
      title: cleanTrackTitle(trackTitle, artistName),
      artist: cleanArtistName(artistName),
      album: albumName,
      playedAt: typeof playedAt === 'string' ? playedAt : undefined,
      msPlayed: typeof msPlayed === 'number' ? msPlayed : undefined,
      spotifyUri: typeof uri === 'string' ? uri : undefined,
      spotifyTrackId: extractSpotifyTrackId(uri),
    });
  }

  return history;
}

/**
 * Parses search history items from Spotify JSON data (SearchQueries / SearchHistory)
 */
export function extractSearchHistoryFromJsonObject(jsonData: any): NormalizedSpotifySearchItem[] {
  const searches: NormalizedSpotifySearchItem[] = [];

  let itemsArray: any[] = [];
  if (Array.isArray(jsonData)) {
    itemsArray = jsonData;
  } else if (jsonData && typeof jsonData === 'object') {
    if (Array.isArray(jsonData.searches)) itemsArray = jsonData.searches;
    else if (Array.isArray(jsonData.queries)) itemsArray = jsonData.queries;
    else if (Array.isArray(jsonData.items)) itemsArray = jsonData.items;
  }

  for (const raw of itemsArray) {
    let q = '';
    let ts: string | undefined = undefined;

    if (typeof raw === 'string') {
      q = raw;
    } else if (raw && typeof raw === 'object') {
      q = raw.searchQuery || raw.query || raw.term || raw.queryText || '';
      ts = raw.searchTime || raw.date || raw.ts || raw.timestamp || undefined;
    }

    if (q && typeof q === 'string' && q.trim().length > 0) {
      searches.push({
        query: q.trim(),
        timestamp: typeof ts === 'string' ? ts : undefined,
      });
    }
  }

  return searches;
}

/**
 * Searches a parsed JSON structure (array or object) to find array of Spotify saved track records
 */
export function extractTracksFromJsonObject(jsonData: any): NormalizedSpotifyTrack[] {
  const results: NormalizedSpotifyTrack[] = [];
  const seenKeys = new Set<string>();

  const addTrack = (raw: any) => {
    const normalized = normalizeRawSpotifyItem(raw);
    if (normalized && normalized.title && normalized.artist) {
      const key = normalized.spotifyUri || `${normalized.title.toLowerCase()}::${normalized.artist.toLowerCase()}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        results.push(normalized);
      }
    }
  };

  if (Array.isArray(jsonData)) {
    // Only parse array as saved tracks if it doesn't look like streaming history or search history
    const firstItem = jsonData[0];
    const isStreamingHist = firstItem && (firstItem.msPlayed !== undefined || firstItem.ms_played !== undefined || firstItem.endTime !== undefined);
    const isSearchHist = firstItem && (firstItem.searchQuery !== undefined || typeof firstItem === 'string');

    if (!isStreamingHist && !isSearchHist) {
      for (const item of jsonData) {
        addTrack(item);
      }
    }
  } else if (jsonData && typeof jsonData === 'object') {
    if (Array.isArray(jsonData.tracks)) {
      jsonData.tracks.forEach(addTrack);
    } else if (Array.isArray(jsonData.items)) {
      jsonData.items.forEach(addTrack);
    } else if (Array.isArray(jsonData.library)) {
      jsonData.library.forEach(addTrack);
    } else if (Array.isArray(jsonData.savedTracks)) {
      jsonData.savedTracks.forEach(addTrack);
    } else {
      // Shallow inspection
      for (const key of Object.keys(jsonData)) {
        const val = jsonData[key];
        if (Array.isArray(val) && val.length > 0) {
          const first = val[0];
          if (first && (first.track || first.trackName || first.master_metadata_track_name || first.artist)) {
            val.forEach(addTrack);
          }
        }
      }
    }
  }

  return results;
}

/**
 * Inspects and parses uploaded Spotify file (either .zip or .json)
 * Returns a comprehensive SpotifyDetectionResult detecting all categories.
 */
export async function inspectSpotifyExportFile(file: File): Promise<SpotifyDetectionResult> {
  const fileName = file.name;
  const isZip = fileName.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';

  const allSavedSongs: NormalizedSpotifyTrack[] = [];
  const allPlaylists: NormalizedSpotifyPlaylist[] = [];
  const allListeningHistory: NormalizedSpotifyHistoryItem[] = [];
  const allSearchHistory: NormalizedSpotifySearchItem[] = [];

  const seenSongKeys = new Set<string>();
  const seenPlaylistNames = new Set<string>();

  const registerTrack = (track: NormalizedSpotifyTrack) => {
    const key = track.spotifyUri || `${track.title.toLowerCase().trim()}::${track.artist.toLowerCase().trim()}`;
    if (!seenSongKeys.has(key)) {
      seenSongKeys.add(key);
      allSavedSongs.push(track);
    }
  };

  const registerPlaylist = (pl: NormalizedSpotifyPlaylist) => {
    const normName = pl.name.toLowerCase().trim();
    if (!seenPlaylistNames.has(normName) && pl.tracks.length > 0) {
      seenPlaylistNames.add(normName);
      allPlaylists.push(pl);
    }
  };

  if (isZip) {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    const jsonFiles: { relativePath: string; fileName: string }[] = [];
    zipContent.forEach((relativePath, zipEntry) => {
      if (relativePath.endsWith('.json') && !relativePath.startsWith('__MACOSX') && !zipEntry.dir) {
        jsonFiles.push({
          relativePath,
          fileName: relativePath.split('/').pop() || relativePath,
        });
      }
    });

    if (jsonFiles.length === 0) {
      throw new Error('No JSON data files found inside the uploaded ZIP archive.');
    }

    for (const fileObj of jsonFiles) {
      try {
        const fileData = await zipContent.file(fileObj.relativePath)?.async('text');
        if (fileData) {
          const parsed = JSON.parse(fileData);
          const fLower = fileObj.fileName.toLowerCase();

          // 1. Saved Songs detection
          if (fLower.includes('library') || fLower.includes('saved') || fLower.includes('tracks')) {
            const tracks = extractTracksFromJsonObject(parsed);
            tracks.forEach(registerTrack);
          }

          // 2. Playlists detection
          if (fLower.includes('playlist') || Array.isArray(parsed.playlists) || (Array.isArray(parsed) && parsed[0]?.items)) {
            const playlists = extractPlaylistsFromJsonObject(parsed);
            playlists.forEach(registerPlaylist);
          }

          // 3. Listening History detection
          if (
            fLower.includes('streaminghistory') ||
            fLower.includes('endsong') ||
            fLower.includes('audiobook') ||
            fLower.includes('history')
          ) {
            const historyItems = extractListeningHistoryFromJsonObject(parsed);
            allListeningHistory.push(...historyItems);
          }

          // 4. Search History detection
          if (fLower.includes('search')) {
            const searchItems = extractSearchHistoryFromJsonObject(parsed);
            allSearchHistory.push(...searchItems);
          }

          // Fallback parsing for unexpected file names
          if (
            !fLower.includes('library') &&
            !fLower.includes('playlist') &&
            !fLower.includes('streaminghistory') &&
            !fLower.includes('endsong') &&
            !fLower.includes('search')
          ) {
            const tracks = extractTracksFromJsonObject(parsed);
            tracks.forEach(registerTrack);

            const playlists = extractPlaylistsFromJsonObject(parsed);
            playlists.forEach(registerPlaylist);
          }
        }
      } catch (e) {
        console.warn(`Could not parse JSON file ${fileObj.relativePath} inside ZIP:`, e);
      }
    }
  } else {
    // Single JSON file parsing
    const textData = await file.text();
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(textData);
    } catch {
      throw new Error('The uploaded file is not a valid JSON document.');
    }

    const fLower = fileName.toLowerCase();

    // Check all extractors on the single JSON file
    const tracks = extractTracksFromJsonObject(parsedJson);
    tracks.forEach(registerTrack);

    const playlists = extractPlaylistsFromJsonObject(parsedJson);
    playlists.forEach(registerPlaylist);

    if (fLower.includes('streaminghistory') || fLower.includes('endsong') || fLower.includes('history')) {
      const historyItems = extractListeningHistoryFromJsonObject(parsedJson);
      allListeningHistory.push(...historyItems);
    }

    if (fLower.includes('search')) {
      const searchItems = extractSearchHistoryFromJsonObject(parsedJson);
      allSearchHistory.push(...searchItems);
    }
  }

  const hasSaved = allSavedSongs.length > 0;
  const hasPlaylists = allPlaylists.length > 0;
  const hasHistory = allListeningHistory.length > 0;
  const hasSearch = allSearchHistory.length > 0;

  if (!hasSaved && !hasPlaylists && !hasHistory && !hasSearch) {
    throw new Error(
      'No recognizable Spotify music data (Saved Songs, Playlists, Listening History, or Search History) was found in this file. Please ensure you uploaded an official Spotify account data download.'
    );
  }

  return {
    sourceFileName: fileName,
    savedSongs: allSavedSongs,
    playlists: allPlaylists,
    listeningHistory: allListeningHistory,
    searchHistory: allSearchHistory,
    detectedCategories: {
      savedSongs: hasSaved,
      playlists: hasPlaylists,
      listeningHistory: hasHistory,
      searchHistory: hasSearch,
    },
  };
}

/**
 * Multiple strategy track matching between Spotify Track and candidate MyMusic Track
 */
export function matchSpotifySongWithCandidate(
  spotifyTrack: NormalizedSpotifyTrack,
  candidateTrack: Track
): boolean {
  // Strategy A: Spotify ID / URI match if providerTrackId stores spotify ID or videoId matches
  if (spotifyTrack.spotifyTrackId && candidateTrack.id) {
    if (candidateTrack.id.includes(spotifyTrack.spotifyTrackId)) {
      return true;
    }
  }

  const spotifyTitleNorm = normalizeForMatch(spotifyTrack.title);
  const candidateTitleNorm = normalizeForMatch(candidateTrack.title);

  if (!spotifyTitleNorm || !candidateTitleNorm) return false;

  const spotifyArtistNorm = normalizeForMatch(spotifyTrack.artist);
  const candidateArtistNorm = normalizeForMatch(candidateTrack.artist);

  // Strategy B: Exact normalized title + exact normalized artist
  if (spotifyTitleNorm === candidateTitleNorm && spotifyArtistNorm === candidateArtistNorm) {
    return true;
  }

  // Strategy C: Exact title and candidate artist includes main Spotify artist (or vice versa)
  if (spotifyTitleNorm === candidateTitleNorm) {
    if (
      candidateArtistNorm.includes(spotifyArtistNorm) ||
      spotifyArtistNorm.includes(candidateArtistNorm) ||
      spotifyTrack.artists.some((a) => candidateArtistNorm.includes(normalizeForMatch(a)))
    ) {
      return true;
    }
  }

  // Strategy D: Base track key fuzzy match (removes parentheticals, feat, punctuation)
  const baseSpotifyKey = getBaseTrackKey(spotifyTrack.title);
  const baseCandidateKey = getBaseTrackKey(candidateTrack.title);

  if (baseSpotifyKey && baseCandidateKey && baseSpotifyKey === baseCandidateKey) {
    if (
      spotifyArtistNorm.includes(candidateArtistNorm) ||
      candidateArtistNorm.includes(spotifyArtistNorm) ||
      spotifyTrack.artists.some((a) => candidateArtistNorm.includes(normalizeForMatch(a)))
    ) {
      return true;
    }
  }

  // Strategy E: Title containment with strict artist match
  if (
    (candidateTitleNorm.includes(spotifyTitleNorm) || spotifyTitleNorm.includes(candidateTitleNorm)) &&
    Math.abs(candidateTitleNorm.length - spotifyTitleNorm.length) < 15
  ) {
    if (spotifyArtistNorm === candidateArtistNorm) {
      return true;
    }
  }

  return false;
}
