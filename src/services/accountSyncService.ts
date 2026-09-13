import { UserProfile, Track, Playlist } from '../types/music';

const API_BASE = '/api';

export interface SyncedUserData {
  profile: UserProfile | null;
  likes: Track[];
  history: Track[];
  favoriteArtists: string[];
  playlists: Playlist[];
}

export const accountSyncService = {
  async getUserData(email: string): Promise<SyncedUserData | null> {
    if (!email || !email.trim()) return null;
    try {
      const res = await fetch(`${API_BASE}/user/get?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      if (!res.ok) return null;
      const json = await res.json();
      if (json.success && json.data) {
        return {
          profile: json.data.profile || null,
          likes: json.data.likes || [],
          history: json.data.history || [],
          favoriteArtists: json.data.favoriteArtists || [],
          playlists: json.data.playlists || [],
        };
      }
      return null;
    } catch (err) {
      console.warn('Failed to fetch synced user data from server:', err);
      return null;
    }
  },

  async syncUserData(email: string, data: {
    profile?: UserProfile | null;
    likes?: Track[];
    history?: Track[];
    favoriteArtists?: string[];
    playlists?: Playlist[];
  }): Promise<SyncedUserData | null> {
    if (!email || !email.trim()) return null;
    try {
      const res = await fetch(`${API_BASE}/user/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          ...data,
        }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
      return null;
    } catch (err) {
      console.warn('Failed to sync user data to server:', err);
      return null;
    }
  },

  async authenticateUser(email: string, password?: string, name?: string, avatarUrl?: string): Promise<SyncedUserData | null> {
    if (!email || !email.trim()) return null;
    try {
      const res = await fetch(`${API_BASE}/user/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name,
          avatarUrl,
        }),
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (json.success && json.data) {
        return {
          profile: json.data.profile || null,
          likes: json.data.likes || [],
          history: json.data.history || [],
          favoriteArtists: json.data.favoriteArtists || [],
          playlists: json.data.playlists || [],
        };
      }
      return null;
    } catch (err) {
      console.warn('Failed to authenticate user on server:', err);
      return null;
    }
  },
};
