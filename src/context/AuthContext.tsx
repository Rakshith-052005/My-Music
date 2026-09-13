import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types/music';
import { supabase, supabaseService, isSupabaseConfigured } from '../services/supabase';
import { accountSyncService } from '../services/accountSyncService';
import { eventTracker } from '../services/eventTracker';

interface AuthContextType {
  user: UserProfile;
  loading: boolean;
  isGuest: boolean;
  isSupabaseConfigured: boolean;
  loginWithEmail: (email: string, password?: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, password?: string, name?: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (name: string, avatarUrl?: string) => Promise<void>;
}

const defaultProfile: UserProfile = {
  id: 'guest_listener',
  name: 'Guest Listener',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
  isGuest: true,
  createdAt: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType>({
  user: defaultProfile,
  loading: true,
  isGuest: true,
  isSupabaseConfigured: false,
  loginWithEmail: async () => ({}),
  signUpWithEmail: async () => ({}),
  signInWithGoogle: async () => ({}),
  logout: async () => {},
  updateProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      try {
        let profile = await supabaseService.getCurrentProfile();
        // If profile has an email, sync latest cross-device profile from server
        if (profile.email) {
          const synced = await accountSyncService.getUserData(profile.email);
          if (synced?.profile) {
            profile = { ...profile, ...synced.profile, isGuest: false };
            supabaseService.setLocalUserProfile(profile);
          }
        }
        setUser(profile);
        eventTracker.setUserId(profile.id);
      } catch (err) {
        console.error('Failed to initialize auth profile:', err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const profile = await supabaseService.getCurrentProfile();
          setUser(profile);
          eventTracker.setUserId(profile.id);
        } else if (event === 'SIGNED_OUT') {
          const guest = await supabaseService.getCurrentProfile();
          setUser(guest);
          eventTracker.setUserId(guest.id);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const loginWithEmail = async (email: string, password?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { error: 'Please enter a valid email address' };
    }

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password || 'defaultPass123!',
        });
        if (!error && data.user) {
          const profile = await supabaseService.getCurrentProfile();
          setUser(profile);
          eventTracker.setUserId(profile.id);
          return {};
        }
      } catch {
        // Fallback to server sync
      }
    }

    // Server-side cross-device authentication & sync fallback
    const synced = await accountSyncService.authenticateUser(cleanEmail, password, cleanEmail.split('@')[0]);
    if (synced?.profile) {
      const newProfile: UserProfile = {
        ...synced.profile,
        email: cleanEmail,
        isGuest: false,
      };
      supabaseService.setLocalUserProfile(newProfile);
      setUser(newProfile);
      eventTracker.setUserId(newProfile.id);
      return {};
    }

    // Direct local user profile creation
    const newProfile: UserProfile = {
      id: 'usr_' + Math.random().toString(36).substring(2, 10),
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      avatarUrl: '',
      isGuest: false,
      createdAt: new Date().toISOString(),
    };
    supabaseService.setLocalUserProfile(newProfile);
    setUser(newProfile);
    accountSyncService.syncUserData(cleanEmail, { profile: newProfile });
    return {};
  };

  const signUpWithEmail = async (email: string, password?: string, name?: string) => {
    return loginWithEmail(email, password);
  };

  const signInWithGoogle = async () => {
    if (!supabase) {
      return { error: 'Supabase Auth is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' };
    }
    try {
      const redirectUrl = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || 'Google sign-in failed' };
    }
  };

  const logout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Sign out error:', err);
      }
    }
    supabaseService.setLocalUserProfile(null);
    const guest = await supabaseService.getCurrentProfile();
    setUser(guest);
    eventTracker.setUserId(guest.id);
  };

  const updateProfile = async (name: string, avatarUrl?: string) => {
    const updated = await supabaseService.updateProfile(user.id, { name, avatarUrl });
    const finalProfile: UserProfile = {
      ...updated,
      email: user.email || updated.email,
    };
    setUser(finalProfile);

    if (finalProfile.email) {
      accountSyncService.syncUserData(finalProfile.email, { profile: finalProfile });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGuest: user.isGuest,
        isSupabaseConfigured,
        loginWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
