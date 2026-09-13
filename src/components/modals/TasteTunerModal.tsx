import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Search, Plus, Sparkles, Music, Star, Radio, Loader2 } from 'lucide-react';
import { tasteService, PRESET_GENRES, PRESET_ARTISTS } from '../../services/tasteService';
import { TastePreferences, Artist } from '../../types/music';
import { apiService } from '../../services/api';

interface TasteTunerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTasteUpdated?: () => void;
}

export const TasteTunerModal: React.FC<TasteTunerModalProps> = ({
  isOpen,
  onClose,
  onTasteUpdated,
}) => {
  const [preferences, setPreferences] = useState<TastePreferences>(tasteService.getPreferences());
  const [customArtistInput, setCustomArtistInput] = useState('');
  const [liveSearchedArtists, setLiveSearchedArtists] = useState<Artist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedGenreTab, setSelectedGenreTab] = useState<string>('All');
  const searchTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setPreferences(tasteService.getPreferences());
    }
  }, [isOpen]);

  // Live artist search debounced
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!customArtistInput.trim()) {
      setLiveSearchedArtists([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await apiService.search(customArtistInput.trim(), 'artists');
        setLiveSearchedArtists(res.artists.slice(0, 6));
      } catch (err) {
        console.warn('Artist live search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [customArtistInput]);

  if (!isOpen) return null;

  const handleToggleGenre = (genre: string) => {
    tasteService.toggleFavoriteGenre(genre);
    setPreferences(tasteService.getPreferences());
    onTasteUpdated?.();
  };

  const handleToggleArtist = (artist: string, artworkUrl?: string) => {
    tasteService.toggleFavoriteArtist(artist, artworkUrl);
    setPreferences(tasteService.getPreferences());
    onTasteUpdated?.();
  };

  const handleAddCustomArtist = (e: React.FormEvent) => {
    e.preventDefault();
    if (customArtistInput.trim()) {
      handleToggleArtist(customArtistInput.trim());
      setCustomArtistInput('');
    }
  };

  const filteredPresetArtists =
    selectedGenreTab === 'All'
      ? PRESET_ARTISTS
      : PRESET_ARTISTS.filter((a) =>
          a.genre.toLowerCase().includes(selectedGenreTab.toLowerCase())
        );

  return (
    <div
      id="taste-tuner-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="taste-tuner-modal"
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-900">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-500/10 text-[#FA233B]">
              <Sparkles className="h-5 w-5 fill-current" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-950 dark:text-white">
                Tune Your Music Taste
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Choose the genres & artists you love to personalize everything
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Favorite Genres */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                1. Select Your Favorite Genres ({preferences.favoriteGenres.length})
              </span>
              <span className="text-[11px] text-zinc-400">Tap to toggle</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {PRESET_GENRES.map((genre) => {
                const isSelected = preferences.favoriteGenres.includes(genre.name);
                return (
                  <button
                    key={genre.name}
                    onClick={() => handleToggleGenre(genre.name)}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#FA233B] text-white shadow-md shadow-red-500/20 scale-105'
                        : 'border border-zinc-200/80 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    <span>{genre.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Favorite Artists */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                2. Favorite Artists ({preferences.favoriteArtists.length})
              </span>
              <span className="text-[11px] text-zinc-400">Tap to follow</span>
            </div>

            {/* Custom Artist Search / Add */}
            <form onSubmit={handleAddCustomArtist} className="mb-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={customArtistInput}
                  onChange={(e) => setCustomArtistInput(e.target.value)}
                  placeholder="Type any artist (e.g. Adele, Travis Scott)..."
                  className="w-full rounded-full border border-zinc-200/80 bg-zinc-50 py-2 pl-9 pr-4 text-xs font-medium outline-none focus:border-[#FA233B] focus:ring-2 focus:ring-red-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={!customArtistInput.trim()}
                className="flex items-center gap-1 rounded-full bg-zinc-900 px-4 py-2 text-xs font-bold text-white transition-all disabled:opacity-40 dark:bg-white dark:text-zinc-950"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </form>

            {/* Grid of Preset Artists */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {PRESET_ARTISTS.map((artist) => {
                const isFav = tasteService.isFavoriteArtist(artist.name);
                return (
                  <button
                    key={artist.name}
                    onClick={() => handleToggleArtist(artist.name)}
                    className={`flex items-center gap-2.5 rounded-2xl border p-2 text-left transition-all ${
                      isFav
                        ? 'border-[#FA233B]/50 bg-red-500/10 dark:bg-red-500/15'
                        : 'border-zinc-200/80 bg-zinc-50/50 hover:bg-zinc-100 dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-zinc-200 dark:ring-zinc-700">
                      <img
                        src={
                          artist.artworkUrl && artist.artworkUrl.trim() !== ''
                            ? artist.artworkUrl
                            : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop'
                        }
                        alt={artist.name || 'Artist'}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop';
                        }}
                      />
                      {isFav && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#FA233B]/70">
                          <Check className="h-4 w-4 stroke-[3] text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-xs font-bold ${
                          isFav ? 'text-[#FA233B]' : 'text-zinc-900 dark:text-white'
                        }`}
                      >
                        {artist.name}
                      </p>
                      <p className="truncate text-[10px] text-zinc-400">{artist.genre}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Additional followed artists */}
            {preferences.favoriteArtists.filter(
              (a) => !PRESET_ARTISTS.some((p) => p.name.toLowerCase() === a.toLowerCase())
            ).length > 0 && (
              <div className="mt-3">
                <span className="text-[11px] font-semibold text-zinc-500">Other followed:</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {preferences.favoriteArtists
                    .filter(
                      (a) => !PRESET_ARTISTS.some((p) => p.name.toLowerCase() === a.toLowerCase())
                    )
                    .map((artist) => (
                      <span
                        key={artist}
                        className="flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-[#FA233B]"
                      >
                        <Star className="h-3 w-3 fill-current" />
                        {artist}
                        <button
                          onClick={() => handleToggleArtist(artist)}
                          className="ml-1 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/80 px-6 py-4 dark:border-zinc-900 dark:bg-zinc-950/80">
          <span className="text-xs text-zinc-500">
            {preferences.favoriteGenres.length} genres, {preferences.favoriteArtists.length} artists
          </span>
          <button
            onClick={onClose}
            className="rounded-full bg-[#FA233B] px-6 py-2 text-xs font-bold text-white shadow-lg shadow-red-500/25 transition-transform hover:bg-[#D91B32] active:scale-95"
          >
            Done & Apply Tastes
          </button>
        </div>
      </div>
    </div>
  );
};
