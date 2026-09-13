export interface Track {
  id: string;
  videoId: string;
  providerTrackId: string; // formatted strictly as youtube_music:VIDEO_ID
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  artworkUrl: string;
  duration: number; // in seconds
  views?: number;
  isPlayable?: boolean;
  provider: 'youtube_music';
}

export interface Album {
  id: string;
  albumId: string;
  title: string;
  artist: string;
  artistId?: string;
  year?: string | number;
  artworkUrl: string;
  trackCount?: number;
  tracks?: Track[];
  provider: 'youtube_music';
}

export interface Artist {
  id: string;
  artistId: string;
  name: string;
  description?: string;
  artworkUrl: string;
  songs?: Track[];
  videos?: Track[];
  albums?: Album[];
  singles?: Album[];
  subscribers?: string;
  provider: 'youtube_music';
}

export interface Playlist {
  id: string;
  playlistId: string;
  title: string;
  description?: string;
  author?: string;
  artworkUrl: string;
  trackCount?: number;
  tracks?: Track[];
  isMix?: boolean;
  provider: 'youtube_music';
}

export interface HomeShelf {
  title: string;
  subtitle?: string;
  type: 'quick_picks' | 'songs' | 'albums' | 'artists' | 'playlists' | 'podcasts' | 'shelf';
  contents: (Track | Album | Artist | Playlist)[];
}

export interface GenreCategory {
  title: string;
  params?: string;
  color?: string;
  artworkUrl?: string;
}

export type ActiveTab = 'all' | 'music' | 'podcasts';
export type NavigationTab = 'home' | 'search' | 'radio' | 'library';

export type ListeningEventType =
  | 'play_started'
  | 'play_25_percent'
  | 'play_50_percent'
  | 'play_75_percent'
  | 'play_completed'
  | 'skipped'
  | 'replayed'
  | 'liked'
  | 'unliked'
  | 'opened_artist'
  | 'opened_album'
  | 'added_to_queue';

export interface ListeningEvent {
  id?: string;
  userId?: string;
  eventType: ListeningEventType;
  videoId: string;
  providerTrackId: string;
  title?: string;
  artist?: string;
  artistId?: string;
  albumId?: string;
  progressSeconds?: number;
  durationSeconds?: number;
  timestamp: string;
}

export interface LyricLine {
  time: number;
  text: string;
  endTime?: number;
}

export interface LyricsResponse {
  success: boolean;
  hasLyrics: boolean;
  hasTimestamps?: boolean;
  source?: string;
  browseId?: string;
  message?: string;
  lyrics: LyricLine[];
}

export interface SongAudioBlueprint {
  energy: number;
  danceability: number;
  acousticness: number;
  valence: number;
  mood_tags: string[];
  micro_genres: string[];
}

export interface TastePreferences {
  favoriteArtists: string[];
  favoriteGenres: string[];
  autoplayEnabled: boolean;
  audioQuality: 'Lossless' | 'Hi-Res Lossless' | 'Dolby Atmos';
}

export interface UserProfile {
  id: string;
  email?: string;
  name: string;
  avatarUrl?: string;
  isGuest: boolean;
  createdAt: string;
  favoriteArtists?: string[];
  favoriteGenres?: string[];
}
