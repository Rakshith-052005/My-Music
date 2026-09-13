import React, { useState } from 'react';
import {
  X,
  Shield,
  LogOut,
  Check,
  Camera,
  Music,
  Heart,
  History,
  Sparkles,
  ExternalLink,
  ChevronRight,
  User,
  Sliders,
  CheckCircle2,
  Lock,
  Mail,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLibrary } from '../../context/LibraryContext';
import { tasteService, PRESET_ARTISTS } from '../../services/tasteService';
import { SpotifyImportModal } from './SpotifyImportModal';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&h=150&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&h=150&fit=crop&crop=faces',
];

/**
 * Converts Google Drive share links to directly viewable image URLs
 */
function normalizeAvatarUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.includes('drive.google.com')) {
    const fileIdMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
    }
  }
  return trimmed;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, isGuest, isSupabaseConfigured, loginWithEmail, signUpWithEmail, signInWithGoogle, logout, updateProfile } = useAuth();
  const { likes = [], history = [], favoriteArtists = [] } = useLibrary();

  const [name, setName] = useState(user.name);
  const [avatarInput, setAvatarInput] = useState(user.avatarUrl || '');
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl || '');
  const [isEditing, setIsEditing] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'profile' | 'preferences'>('profile');
  const [isSpotifyImportOpen, setIsSpotifyImportOpen] = useState(false);

  // Taste preferences
  const [preferences, setPreferences] = useState(tasteService.getPreferences());

  if (!isOpen) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAvatarInput(val);
    setAvatarPreview(normalizeAvatarUrl(val));
  };

  const selectPresetAvatar = (url: string) => {
    setAvatarInput(url);
    setAvatarPreview(url);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAvatar = normalizeAvatarUrl(avatarInput);
    await updateProfile(name, finalAvatar);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    setIsEditing(false);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    try {
      if (authMode === 'signin') {
        const res = await loginWithEmail(email, password);
        if (res.error) setAuthError(res.error);
        else onClose();
      } else {
        const res = await signUpWithEmail(email, password, name);
        if (res.error) setAuthError(res.error);
        else onClose();
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  return (
    <div
      id="profile-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/95 shadow-2xl backdrop-blur-2xl dark:border-zinc-800/80 dark:bg-zinc-900/95 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800/60">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold tracking-tight text-zinc-950 dark:text-white">
              Account & Profile
            </h3>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Close profile"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {selectedTab === 'profile' ? (
            isGuest ? (
              /* CLEAN SIMPLE LOGIN & SIGN UP VIEW FOR GUESTS */
              <div className="space-y-5">
                <div className="flex flex-col items-center text-center pt-2 pb-1">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FA233B]/10 text-[#FA233B] mb-3 shadow-inner">
                    <User className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">
                    {authMode === 'signin' ? 'Sign In to MyMusic' : 'Create Your Account'}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mt-1">
                    Sign in to save your favorite tracks, custom playlists, and personalized music preferences.
                  </p>
                </div>

                {/* Google Auth Button */}
                <button
                  type="button"
                  onClick={async () => {
                    setAuthError('');
                    setIsGoogleLoading(true);
                    try {
                      const res = await signInWithGoogle();
                      if (res.error) setAuthError(res.error);
                      else onClose();
                    } finally {
                      setIsGoogleLoading(false);
                    }
                  }}
                  disabled={isGoogleLoading || isAuthLoading}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-zinc-200/80 bg-white py-2.5 text-xs font-bold text-zinc-800 shadow-xs hover:bg-zinc-50 active:scale-[0.99] transition-all dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-750 disabled:opacity-60"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
                </button>

                <div className="relative flex items-center justify-center my-2">
                  <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                  <span className="absolute bg-white px-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500">
                    or with email
                  </span>
                </div>

                {/* Email / Password Form */}
                <form onSubmit={handleAuthSubmit} className="space-y-3">
                  {authMode === 'signup' && (
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-[#FA233B] focus:ring-1 focus:ring-[#FA233B] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-[#FA233B] focus:ring-1 focus:ring-[#FA233B] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-[#FA233B] focus:ring-1 focus:ring-[#FA233B] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    />
                  </div>

                  {authError && (
                    <p className="text-xs text-red-500 font-medium px-1 pt-1">{authError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthLoading || isGoogleLoading}
                    className="w-full rounded-xl bg-[#FA233B] py-2.5 text-xs font-bold text-white hover:bg-[#d91d32] transition-colors shadow-sm disabled:opacity-50 mt-1"
                  >
                    {isAuthLoading ? 'Connecting...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
                  </button>
                </form>

                <div className="text-center pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {authMode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError('');
                      setAuthMode((m) => (m === 'signin' ? 'signup' : 'signin'));
                    }}
                    className="ml-1.5 text-xs font-bold text-[#FA233B] hover:underline"
                  >
                    {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
                  </button>
                </div>
              </div>
            ) : (
              /* LOGGED IN USER PROFILE VIEW */
              <>
                {/* Profile Banner & Identity */}
                <div className="flex flex-col items-center text-center">
                  <div className="relative group">
                    <div className="relative h-24 w-24 overflow-hidden rounded-full ring-4 ring-zinc-100 shadow-xl dark:ring-zinc-800">
                      {avatarPreview && avatarPreview.trim() !== '' ? (
                        <img
                          src={avatarPreview}
                          alt={user.name || 'User'}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces';
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-zinc-200 to-zinc-300 text-3xl font-extrabold text-zinc-700 dark:from-zinc-800 dark:to-zinc-700 dark:text-zinc-200">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#FA233B] text-white shadow-md hover:scale-105 active:scale-95 transition-transform"
                      title="Change Avatar"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <h3 className="mt-3.5 text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    {user.name}
                  </h3>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {user.email}
                  </p>

                  {/* Status Badges */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                      <UserCheck className="h-3 w-3 text-emerald-500" />
                      Active Member
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FA233B]">
                      Lossless Audio
                    </span>
                  </div>
                </div>

                {/* Listening Statistics Bento Grid */}
                <div className="grid grid-cols-3 gap-3 rounded-2xl bg-zinc-50/80 p-4 border border-zinc-100 dark:bg-zinc-800/40 dark:border-zinc-800">
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 text-[#FA233B] mb-1.5">
                      <Heart className="h-4 w-4 fill-[#FA233B]" />
                    </div>
                    <span className="text-lg font-bold text-zinc-900 dark:text-white">{likes?.length || 0}</span>
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Liked Songs</span>
                  </div>

                  <div className="flex flex-col items-center text-center border-x border-zinc-200/60 dark:border-zinc-700/60">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 mb-1.5">
                      <Music className="h-4 w-4" />
                    </div>
                    <span className="text-lg font-bold text-zinc-900 dark:text-white">{favoriteArtists?.length || 0}</span>
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Artists</span>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 mb-1.5">
                      <History className="h-4 w-4" />
                    </div>
                    <span className="text-lg font-bold text-zinc-900 dark:text-white">{history?.length || 0}</span>
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Streamed</span>
                  </div>
                </div>

                {/* Edit Profile or Sign Out */}
                {isEditing ? (
                  <form onSubmit={handleSaveProfile} className="space-y-4 rounded-2xl border border-zinc-200/80 p-4 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-800/30">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Customize Identity
                    </h4>

                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-900 focus:border-[#FA233B] focus:ring-1 focus:ring-[#FA233B] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                        Custom Avatar URL (Direct Image or Google Drive)
                      </label>
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/... or Google Drive link"
                        value={avatarInput}
                        onChange={handleAvatarChange}
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-900 focus:border-[#FA233B] focus:ring-1 focus:ring-[#FA233B] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                      />
                    </div>

                    {/* Preset Avatars Selection */}
                    <div>
                      <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                        Or Choose a High-Resolution Preset:
                      </span>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {AVATAR_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectPresetAvatar(preset)}
                            className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 transition-all ${
                              avatarPreview === preset
                                ? 'ring-[#FA233B] scale-105'
                                : 'ring-zinc-200 dark:ring-zinc-700 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={preset} alt="Preset" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="submit"
                        className="flex-1 rounded-xl bg-[#FA233B] py-2.5 text-xs font-bold text-white hover:bg-[#d91d32] transition-colors shadow-sm"
                      >
                        Save Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="rounded-xl bg-zinc-200/80 px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex w-full items-center justify-between rounded-2xl bg-zinc-100/90 px-4 py-3 text-xs font-semibold text-zinc-900 hover:bg-zinc-200/80 transition-colors dark:bg-zinc-800/80 dark:text-white dark:hover:bg-zinc-700/80"
                    >
                      <div className="flex items-center gap-2.5">
                        <User className="h-4 w-4 text-[#FA233B]" />
                        <span>Edit Name & Profile Photo</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-400" />
                    </button>

                    <button
                      onClick={() => setIsSpotifyImportOpen(true)}
                      className="flex w-full items-center justify-between rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs font-bold text-emerald-600 hover:bg-emerald-500/20 transition-colors dark:text-emerald-400"
                    >
                      <div className="flex items-center gap-2.5">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.899 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.019zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 C9.6 9.9 15 10.561 18.72 12.841c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.18-.1.2-1.02-.421-.18-.6.42-1.02 1.02-1.2 4.2-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" />
                        </svg>
                        <span>Import Spotify Liked Songs</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-emerald-500" />
                    </button>

                    <button
                      onClick={logout}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 py-3 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </>
            )
          ) : (
            /* Music Taste Preferences Tab */
            <div className="space-y-5">
              <div className="rounded-2xl bg-gradient-to-r from-red-500/10 via-purple-500/10 to-blue-500/10 p-4 border border-zinc-200/60 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-[#FA233B]">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">AI Taste Profile</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                  Your personalized feed and recommendations dynamically adjust based on your favorite artists and genres.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
                  Favorite Artists ({preferences?.favoriteArtists?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {PRESET_ARTISTS.map((artist) => {
                    const isFav = preferences?.favoriteArtists?.includes(artist.name);
                    return (
                      <button
                        key={artist.name}
                        onClick={() => {
                          tasteService.toggleFavoriteArtist(artist.name);
                          setPreferences(tasteService.getPreferences());
                        }}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                          isFav
                            ? 'bg-[#FA233B] text-white shadow-xs'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                        }`}
                      >
                        <img src={artist.artworkUrl} alt={artist.name} className="h-4 w-4 rounded-full object-cover" />
                        <span>{artist.name}</span>
                        {isFav && <Check className="h-3 w-3 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
                  Audio Quality Settings
                </h4>
                <div className="rounded-2xl border border-zinc-200/80 p-3.5 space-y-2 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-white">Streaming Quality</span>
                    <span className="font-bold text-[#FA233B]">Lossless (24-bit/48kHz)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-white">Spatial Audio Engine</span>
                    <span className="text-zinc-500 dark:text-zinc-400">Automatic</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {savedSuccess && (
            <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2 text-xs font-medium text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Profile updated successfully
            </div>
          )}
        </div>
      </div>

      {/* Spotify Import Modal */}
      <SpotifyImportModal
        isOpen={isSpotifyImportOpen}
        onClose={() => setIsSpotifyImportOpen(false)}
      />
    </div>
  );
};
