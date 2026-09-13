import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ListeningEvent, Track, UserProfile } from '../types/music';
import { getProviderTrackId } from '../utils/trackHelper';

const getSupabaseUrl = (): string => {
  let url = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || '').trim();
  if (!url || url.includes('your-supabase-project-id')) return '';
  // Normalize URL by removing trailing /rest/v1 or /rest/v1/ and trailing slashes
  return url.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
};

const getSupabaseAnonKey = (): string => {
  let key = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!key || key === 'your-supabase-anon-key') return '';
  return key;
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Local storage keys for guest/offline fallback
const STORAGE_USER_PROFILE_KEY = 'mymusic_user_profile';
const STORAGE_GUEST_PROFILE_KEY = 'mymusic_guest_profile';
const STORAGE_LIKES_KEY = 'mymusic_likes';
const STORAGE_HISTORY_KEY = 'mymusic_listening_history';
const STORAGE_SAVED_ALBUMS_KEY = 'mymusic_saved_albums';

export const supabaseService = {
  /**
   * Get the current session or stored user/guest profile
   */
  async getCurrentProfile(): Promise<UserProfile> {
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const user = session.user;
          // Try to fetch profile from users/profiles table
          let profileName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'MyMusic Listener';
          let profileAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
          let favArtists: string[] = user.user_metadata?.favorite_artists || [];

          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();

            if (profile) {
              if (profile.name) profileName = profile.name;
              if (profile.avatar_url) profileAvatar = profile.avatar_url;
              if (Array.isArray(profile.favorite_artists)) favArtists = profile.favorite_artists;
            }
          } catch {
            // ignore table error if profiles table has slightly different columns
          }

          const userProfile: UserProfile = {
            id: user.id,
            email: user.email,
            name: profileName,
            avatarUrl: profileAvatar,
            isGuest: false,
            createdAt: user.created_at,
          };

          // Save local user cache
          this.setLocalUserProfile(userProfile);
          return userProfile;
        }
      } catch (err) {
        console.warn('Supabase auth session check failed:', err);
      }
    }

    // Check if user has an active logged-in local profile
    try {
      const storedUser = localStorage.getItem(STORAGE_USER_PROFILE_KEY);
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed && !parsed.isGuest) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to parse stored user profile:', err);
    }

    // Guest fallback
    let guestProfile: UserProfile;
    try {
      const stored = localStorage.getItem(STORAGE_GUEST_PROFILE_KEY);
      if (stored) {
        guestProfile = JSON.parse(stored);
      } else {
        guestProfile = {
          id: 'guest_' + Math.random().toString(36).substring(2, 9),
          name: 'Guest Listener',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
          isGuest: true,
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_GUEST_PROFILE_KEY, JSON.stringify(guestProfile));
      }
    } catch {
      guestProfile = {
        id: 'guest_listener',
        name: 'Guest Listener',
        avatarUrl: '',
        isGuest: true,
        createdAt: new Date().toISOString(),
      };
    }
    return guestProfile;
  },

  /**
   * Save local authenticated user profile
   */
  setLocalUserProfile(profile: UserProfile | null): void {
    try {
      if (profile) {
        localStorage.setItem(STORAGE_USER_PROFILE_KEY, JSON.stringify(profile));
      } else {
        localStorage.removeItem(STORAGE_USER_PROFILE_KEY);
      }
    } catch (err) {
      console.warn('Failed to save local user profile:', err);
    }
  },

  /**
   * Update user profile in Supabase & metadata
   */
  async updateProfile(userId: string, updates: { name?: string; avatarUrl?: string }): Promise<UserProfile> {
    if (supabase && !userId.startsWith('guest_')) {
      try {
        // Update user metadata in auth for instant cross-device sync
        await supabase.auth.updateUser({
          data: {
            full_name: updates.name,
            avatar_url: updates.avatarUrl,
          },
        });

        // Upsert to profiles table
        await supabase
          .from('profiles')
          .upsert({
            id: userId,
            name: updates.name,
            avatar_url: updates.avatarUrl,
            updated_at: new Date().toISOString(),
          });
      } catch (err) {
        console.warn('Failed to update supabase profile:', err);
      }
    }

    // Update local profile
    try {
      const current = await this.getCurrentProfile();
      const updated: UserProfile = { ...current, ...updates };
      this.setLocalUserProfile(updated);
      return updated;
    } catch {
      return {
        id: userId,
        name: updates.name || 'Listener',
        avatarUrl: updates.avatarUrl || '',
        isGuest: userId.startsWith('guest_'),
        createdAt: new Date().toISOString(),
      };
    }
  },

  /**
   * Sync favorite artists to Supabase and user metadata
   */
  async syncFavoriteArtists(userId: string, favoriteArtists: string[]): Promise<void> {
    if (supabase && !userId.startsWith('guest_')) {
      try {
        // Update user_metadata in auth so it's instantly available on any device
        await supabase.auth.updateUser({
          data: { favorite_artists: favoriteArtists },
        });

        // Also upsert to profiles table
        await supabase
          .from('profiles')
          .upsert({
            id: userId,
            favorite_artists: favoriteArtists,
            updated_at: new Date().toISOString(),
          });
      } catch (err) {
        console.warn('Failed to sync favorite artists to Supabase:', err);
      }
    }

    try {
      localStorage.setItem(`mymusic_favorite_artists_${userId}`, JSON.stringify(favoriteArtists));
    } catch {
      // ignore local write errors
    }
  },

  /**
   * Fetch favorite artists for a user from Supabase
   */
  async getFavoriteArtists(userId: string): Promise<string[]> {
    if (supabase && !userId.startsWith('guest_')) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && Array.isArray(user.user_metadata?.favorite_artists)) {
          return user.user_metadata.favorite_artists;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('favorite_artists')
          .eq('id', userId)
          .single();

        if (profile && Array.isArray(profile.favorite_artists)) {
          return profile.favorite_artists;
        }
      } catch (err) {
        console.warn('Supabase favorite artists fetch failed:', err);
      }
    }

    try {
      const stored = localStorage.getItem(`mymusic_favorite_artists_${userId}`);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  },

  /**
   * Fetch liked tracks from Supabase
   */
  async getLikes(userId: string): Promise<Track[]> {
    if (supabase && !userId.startsWith('guest_')) {
      try {
        const { data, error } = await supabase
          .from('likes')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const likesList: Track[] = data.map((item: any) => ({
            id: item.video_id,
            videoId: item.video_id,
            providerTrackId: item.provider_track_id || getProviderTrackId(item.video_id),
            title: item.title,
            artist: item.artist,
            artistId: item.artist_id,
            album: item.album,
            albumId: item.album_id,
            artworkUrl: item.artwork_url,
            duration: item.duration || 0,
            provider: 'youtube_music' as const,
          }));

          // Cache per userId
          try {
            localStorage.setItem(`${STORAGE_LIKES_KEY}_${userId}`, JSON.stringify(likesList));
          } catch {
            // ignore
          }
          return likesList;
        }
      } catch (err) {
        console.warn('Supabase likes fetch failed:', err);
      }
    }

    // LocalStorage fallback scoped by user ID
    try {
      const userKey = `${STORAGE_LIKES_KEY}_${userId}`;
      const stored = localStorage.getItem(userKey) || localStorage.getItem(STORAGE_LIKES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  /**
   * Toggle like state for a track in Supabase
   */
  async toggleLike(userId: string, track: Track): Promise<boolean> {
    const providerTrackId = getProviderTrackId(track);
    if (!providerTrackId) return false;

    // Check if already liked
    const currentLikes = await this.getLikes(userId);
    const existingIndex = currentLikes.findIndex(
      (t) => getProviderTrackId(t) === providerTrackId
    );
    const isLikedNow = existingIndex === -1; // If not found, we are liking it

    if (supabase && !userId.startsWith('guest_')) {
      try {
        if (isLikedNow) {
          await supabase.from('likes').insert({
            user_id: userId,
            video_id: track.videoId,
            provider_track_id: providerTrackId,
            title: track.title,
            artist: track.artist,
            artist_id: track.artistId || '',
            album: track.album || '',
            album_id: track.albumId || '',
            artwork_url: track.artworkUrl,
            duration: track.duration,
            created_at: new Date().toISOString(),
          });
        } else {
          await supabase
            .from('likes')
            .delete()
            .eq('user_id', userId)
            .eq('provider_track_id', providerTrackId);
        }
      } catch (err) {
        console.warn('Supabase toggleLike failed, continuing with local storage:', err);
      }
    }

    // Synchronize per-user local storage
    try {
      let updated: Track[];
      if (isLikedNow) {
        updated = [track, ...currentLikes];
      } else {
        updated = currentLikes.filter((t) => getProviderTrackId(t) !== providerTrackId);
      }
      localStorage.setItem(`${STORAGE_LIKES_KEY}_${userId}`, JSON.stringify(updated));
    } catch (err) {
      console.error('LocalStorage likes write error:', err);
    }

    return isLikedNow;
  },

  /**
   * Record listening event in Supabase
   */
  async recordEvent(event: ListeningEvent): Promise<void> {
    if (supabase && event.userId && !event.userId.startsWith('guest_')) {
      try {
        await supabase.from('listening_events').insert({
          user_id: event.userId,
          event_type: event.eventType,
          video_id: event.videoId,
          provider_track_id: event.providerTrackId,
          title: event.title,
          artist: event.artist,
          artist_id: event.artistId,
          album_id: event.albumId,
          progress_seconds: event.progressSeconds,
          duration_seconds: event.durationSeconds,
          created_at: event.timestamp,
        });
      } catch (err) {
        console.warn('Supabase event record failed:', err);
      }
    }

    // Keep history in per-user local storage
    try {
      if (event.eventType === 'play_started') {
        const userKey = `${STORAGE_HISTORY_KEY}_${event.userId}`;
        const stored = localStorage.getItem(userKey);
        const history: Track[] = stored ? JSON.parse(stored) : [];
        const filtered = history.filter((t) => t.videoId !== event.videoId);
        const newEntry: Track = {
          id: event.videoId,
          videoId: event.videoId,
          providerTrackId: event.providerTrackId,
          title: event.title || 'Track',
          artist: event.artist || 'Artist',
          artistId: event.artistId,
          albumId: event.albumId,
          artworkUrl: `https://i.ytimg.com/vi/${event.videoId}/hqdefault.jpg`,
          duration: event.durationSeconds || 0,
          provider: 'youtube_music',
        };
        const updated = [newEntry, ...filtered].slice(0, 50);
        localStorage.setItem(userKey, JSON.stringify(updated));
      }
    } catch {
      // ignore local write errors
    }
  },

  /**
   * Get listening history from Supabase
   */
  async getHistory(userId: string): Promise<Track[]> {
    if (supabase && !userId.startsWith('guest_')) {
      try {
        const { data, error } = await supabase
          .from('listening_events')
          .select('*')
          .eq('user_id', userId)
          .eq('event_type', 'play_started')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data && data.length > 0) {
          const seen = new Set<string>();
          const tracks: Track[] = [];
          for (const item of data) {
            const key = item.provider_track_id || item.video_id;
            if (key && !seen.has(key)) {
              seen.add(key);
              tracks.push({
                id: item.video_id,
                videoId: item.video_id,
                providerTrackId: item.provider_track_id || getProviderTrackId(item.video_id),
                title: item.title || 'Track',
                artist: item.artist || 'Artist',
                artistId: item.artist_id,
                albumId: item.album_id,
                artworkUrl: `https://i.ytimg.com/vi/${item.video_id}/hqdefault.jpg`,
                duration: item.duration_seconds || 0,
                provider: 'youtube_music' as const,
              });
            }
          }

          try {
            localStorage.setItem(`${STORAGE_HISTORY_KEY}_${userId}`, JSON.stringify(tracks));
          } catch {
            // ignore
          }
          return tracks;
        }
      } catch (err) {
        console.warn('Supabase history fetch failed:', err);
      }
    }

    try {
      const userKey = `${STORAGE_HISTORY_KEY}_${userId}`;
      const stored = localStorage.getItem(userKey) || localStorage.getItem(STORAGE_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },
};
