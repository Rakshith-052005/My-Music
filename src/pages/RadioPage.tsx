import React, { useState } from 'react';
import { Radio, Play, Sparkles, Waves, Heart, Disc, Music, Flame } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';
import { tasteService, PRESET_GENRES } from '../services/tasteService';
import { personalizedEngine } from '../services/personalizedEngine';
import { apiService } from '../services/api';

export const RadioPage: React.FC = () => {
  const { playTrack } = usePlayer();
  const { likes } = useLibrary();
  const [loadingStation, setLoadingStation] = useState<string | null>(null);
  const preferences = tasteService.getPreferences();

  // Play user's personal station (Apple Music's core algorithm)
  const handlePlayPersonalStation = async () => {
    setLoadingStation('personal_station');
    try {
      const tracks = await personalizedEngine.getPersonalStationTracks(likes);
      if (tracks.length > 0) {
        playTrack(tracks[0], tracks);
      }
    } catch (err) {
      console.error('Failed to start personal station:', err);
    } finally {
      setLoadingStation(null);
    }
  };

  // Play artist station
  const handlePlayArtistStation = async (artistName: string) => {
    setLoadingStation(`artist_${artistName}`);
    try {
      const res = await apiService.search(`${artistName} radio mix playlist`, 'songs');
      if (res.songs.length > 0) {
        playTrack(res.songs[0], res.songs);
      }
    } catch (err) {
      console.error(`Failed to play ${artistName} station:`, err);
    } finally {
      setLoadingStation(null);
    }
  };

  // Play genre station
  const handlePlayGenreStation = async (genreName: string, query: string) => {
    setLoadingStation(`genre_${genreName}`);
    try {
      const res = await apiService.search(`${query} radio hits`, 'songs');
      if (res.songs.length > 0) {
        playTrack(res.songs[0], res.songs);
      }
    } catch (err) {
      console.error(`Failed to play ${genreName} station:`, err);
    } finally {
      setLoadingStation(null);
    }
  };

  return (
    <div id="radio-page" className="px-4 pb-36 pt-4 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
            Radio
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Personalized stations and global broadcasts curated for you
          </p>
        </div>
        <Radio className="h-6 w-6 text-[#FA233B]" />
      </div>

      {/* 1. APPLE MUSIC PERSONAL STATION HERO */}
      <div
        onClick={handlePlayPersonalStation}
        className="group relative cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-[#FA233B] via-rose-600 to-red-800 p-6 text-white shadow-xl shadow-red-500/20 transition-all hover:shadow-2xl hover:scale-[1.01] sm:p-8"
      >
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-red-200">
            <Waves className="h-4 w-4 animate-pulse" />
            <span>Your Personal Station</span>
          </div>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Tune In to Your Sound
          </h2>
          <p className="mt-1 text-sm text-red-100">
            Never-ending music based on your favorite artists ({preferences.favoriteArtists.slice(0, 3).join(', ')}) and {likes.length} liked tracks.
          </p>

          <button className="mt-5 flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-xs font-bold text-red-600 shadow-md transition-transform group-hover:scale-105 active:scale-95 sm:text-sm">
            {loadingStation === 'personal_station' ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
            ) : (
              <Play className="h-4 w-4 fill-current ml-0.5" />
            )}
            Start Your Station
          </button>
        </div>

        {/* Ambient background decoration */}
        <div className="pointer-events-none absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <Waves className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 h-44 w-44 text-white/15 stroke-1" />
      </div>

      {/* 2. ARTIST STATIONS (strictly according to user's favorite artists) */}
      <div className="mt-10 space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-2xl">
            Artist Stations
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Endless mixes seeded by the artists you listen to most
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {preferences.favoriteArtists.map((artist, idx) => {
            const isLoadingThis = loadingStation === `artist_${artist}`;
            return (
              <div
                key={`artist-station-${artist}-${idx}`}
                onClick={() => handlePlayArtistStation(artist)}
                className="group relative flex cursor-pointer items-center justify-between overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-xs transition-all hover:border-[#FA233B]/40 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-[#FA233B] dark:bg-red-500/15">
                    <Disc className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate text-sm font-bold text-zinc-950 dark:text-white group-hover:text-[#FA233B]">
                      {artist} Station
                    </span>
                    <span className="truncate text-xs text-zinc-400">
                      Music by {artist} & similar artists
                    </span>
                  </div>
                </div>

                <button
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 transition-transform group-hover:scale-105 active:scale-95 dark:bg-zinc-800 dark:text-white"
                  aria-label={`Play ${artist} Station`}
                >
                  {isLoadingThis ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent dark:border-white" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. GENRE STATIONS (matching user's preferred genres) */}
      <div className="mt-10 space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-2xl">
            Genre Stations
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Nonstop streams in your favorite sounds
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PRESET_GENRES.map((genre, idx) => {
            const isLoadingThis = loadingStation === `genre_${genre.name}`;
            return (
              <div
                key={`genre-station-${genre.name}-${idx}`}
                onClick={() => handlePlayGenreStation(genre.name, genre.searchQuery)}
                className={`group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br ${genre.gradient} p-4 text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.02] aspect-4/3`}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs">
                    Station
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-md transition-transform group-hover:scale-110">
                    {isLoadingThis ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Play className="h-3.5 w-3.5 fill-white text-white ml-0.5" />
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold tracking-tight">{genre.name}</h3>
                  <p className="text-[11px] text-white/80">Nonstop mix</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
