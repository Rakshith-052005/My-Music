import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Track } from '../types/music';
import { supabaseService } from '../services/supabase';
import { accountSyncService } from '../services/accountSyncService';
import { useAuth } from './AuthContext';
import { getProviderTrackId } from '../utils/trackHelper';
import { eventTracker } from '../services/eventTracker';
import { tasteService } from '../services/tasteService';
import { playlistService } from '../services/playlistService';

interface LibraryContextType {
  likes: Track[];
  history: Track[];
  favoriteArtists: string[];
  isLiked: (trackOrId: string | { videoId?: string; providerTrackId?: string; id?: string }) => boolean;
  toggleLike: (track: Track) => Promise<boolean>;
  isFollowingArtist: (artistName: string) => boolean;
  toggleFollowArtist: (artistName: string, artworkUrl?: string) => boolean;
  refreshLibrary: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType>({
  likes: [],
  history: [],
  favoriteArtists: [],
  isLiked: () => false,
  toggleLike: async () => false,
  isFollowingArtist: () => false,
  toggleFollowArtist: () => false,
  refreshLibrary: async () => {},
});

// Local storage cache keys for instant offline access
const CACHE_LIKES_KEY = 'mymusic_likes';
const CACHE_HISTORY_KEY = 'mymusic_listening_history';

function loadCachedData<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function saveCachedData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Failed to save offline cache for ${key}:`, err);
  }
}

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState<Track[]>(() => loadCachedData<Track[]>(CACHE_LIKES_KEY, []));
  const [history, setHistory] = useState<Track[]>(() => loadCachedData<Track[]>(CACHE_HISTORY_KEY, []));
  const [favoriteArtists, setFavoriteArtists] = useState<string[]>(
    tasteService.getPreferences().favoriteArtists
  );

  const refreshLibrary = useCallback(async () => {
    if (!user) return;

    // Universal cross-device account sync via email
    if (user.email) {
      const synced = await accountSyncService.getUserData(user.email);
      if (synced) {
        if (Array.isArray(synced.likes)) {
          setLikes(synced.likes);
          saveCachedData(CACHE_LIKES_KEY, synced.likes);
        }
        if (Array.isArray(synced.history)) {
          setHistory(synced.history);
          saveCachedData(CACHE_HISTORY_KEY, synced.history);
        }
        if (Array.isArray(synced.favoriteArtists)) {
          tasteService.setFavoriteArtists(synced.favoriteArtists);
          setFavoriteArtists(synced.favoriteArtists);
        }
        if (Array.isArray(synced.playlists) && synced.playlists.length > 0) {
          playlistService.persist(synced.playlists);
        }
        return;
      }
    }

    if (user.id) {
      try {
        const [fetchedLikes, fetchedHistory, fetchedFavs] = await Promise.all([
          supabaseService.getLikes(user.id),
          supabaseService.getHistory(user.id),
          supabaseService.getFavoriteArtists(user.id),
        ]);
        setLikes(fetchedLikes);
        setHistory(fetchedHistory);
        if (fetchedFavs && fetchedFavs.length > 0) {
          tasteService.setFavoriteArtists(fetchedFavs);
        }
        saveCachedData(`${CACHE_LIKES_KEY}_${user.id}`, fetchedLikes);
        saveCachedData(`${CACHE_HISTORY_KEY}_${user.id}`, fetchedHistory);
        setFavoriteArtists(tasteService.getPreferences().favoriteArtists);
      } catch (err) {
        console.warn('Network offline or error loading library from server, serving cached local data:', err);
        setLikes(loadCachedData<Track[]>(`${CACHE_LIKES_KEY}_${user.id}`, []));
        setHistory(loadCachedData<Track[]>(`${CACHE_HISTORY_KEY}_${user.id}`, []));
      }
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  useEffect(() => {
    const unsubscribe = tasteService.subscribe(() => {
      setFavoriteArtists(tasteService.getPreferences().favoriteArtists);
    });
    return unsubscribe;
  }, []);

  const isFollowingArtist = useCallback((artistName: string) => {
    return tasteService.isFavoriteArtist(artistName);
  }, []);

  const toggleFollowArtist = useCallback((artistName: string, artworkUrl?: string) => {
    const res = tasteService.toggleFavoriteArtist(artistName, artworkUrl);
    const updatedFavs = tasteService.getPreferences().favoriteArtists;
    setFavoriteArtists(updatedFavs);
    if (user?.id) {
      supabaseService.syncFavoriteArtists(user.id, updatedFavs);
    }
    if (user?.email) {
      accountSyncService.syncUserData(user.email, { favoriteArtists: updatedFavs });
    }
    return res;
  }, [user?.id, user?.email]);

  const isLiked = useCallback(
    (trackOrId: string | { videoId?: string; providerTrackId?: string; id?: string }) => {
      const targetProviderId = getProviderTrackId(trackOrId);
      if (!targetProviderId) return false;
      return likes.some((t) => getProviderTrackId(t) === targetProviderId);
    },
    [likes]
  );

  const toggleLike = useCallback(
    async (track: Track): Promise<boolean> => {
      const providerId = getProviderTrackId(track);
      if (!providerId) {
        console.warn('Cannot like track with invalid provider track ID:', track);
        return false;
      }

      const currentlyLiked = isLiked(track);
      let newLikes: Track[] = [];

      if (currentlyLiked) {
        newLikes = likes.filter((t) => getProviderTrackId(t) !== providerId);
        setLikes(newLikes);
      } else {
        newLikes = [track, ...likes];
        setLikes(newLikes);
        tasteService.registerUserAction(track, 'like');
        const updatedFavs = tasteService.getPreferences().favoriteArtists;
        setFavoriteArtists(updatedFavs);
        if (user?.id) {
          supabaseService.syncFavoriteArtists(user.id, updatedFavs);
        }
      }

      saveCachedData(CACHE_LIKES_KEY, newLikes);

      if (user?.email) {
        accountSyncService.syncUserData(user.email, {
          likes: newLikes,
          favoriteArtists: tasteService.getPreferences().favoriteArtists,
        });
      }

      try {
        const result = await supabaseService.toggleLike(user.id, track);
        eventTracker.trackLike(track, result);
        return result;
      } catch (err) {
        console.error('Failed to toggle like:', err);
        return !currentlyLiked;
      }
    },
    [isLiked, likes, user?.id, user?.email]
  );

  return (
    <LibraryContext.Provider
      value={{
        likes,
        history,
        favoriteArtists,
        isLiked,
        toggleLike,
        isFollowingArtist,
        toggleFollowArtist,
        refreshLibrary,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => useContext(LibraryContext);
