import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search as SearchIcon, X, History, TrendingUp, RefreshCw, Play, Pause } from 'lucide-react';
import { Track, Album, Artist, Playlist, GenreCategory } from '../types/music';
import { apiService } from '../services/api';
import { usePlayer } from '../context/PlayerContext';
import { tasteService } from '../services/tasteService';
import { SongCard } from '../components/cards/SongCard';
import { AlbumCard } from '../components/cards/AlbumCard';
import { ArtistCard } from '../components/cards/ArtistCard';
import { PlaylistCard } from '../components/cards/PlaylistCard';

const RECENT_SEARCHES_KEY = 'mymusic_recent_searches';
const POPULAR_SEARCHES = ['The Weeknd', 'Taylor Swift', 'Coldplay', 'Dua Lipa', 'Drake', 'Billie Eilish', 'Starboy', 'Believer'];

interface SearchPageProps {
  onOpenAlbum: (albumId: string, album?: Album) => void;
  onOpenArtist: (artistId: string, artistName: string) => void;
  onOpenPlaylist: (playlistId: string) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  onOpenAlbum,
  onOpenArtist,
  onOpenPlaylist,
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'songs' | 'artists' | 'albums' | 'playlists'>('all');
  const [genres, setGenres] = useState<GenreCategory[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [results, setResults] = useState<{
    songs: Track[];
    artists: Artist[];
    albums: Album[];
    playlists: Playlist[];
  }>({
    songs: [],
    artists: [],
    albums: [],
    playlists: [],
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<any>(null);

  // Load genres and recent searches on mount
  useEffect(() => {
    apiService.getGenres().then(setGenres).catch(() => {});
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved).slice(0, 8));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    try {
      const updated = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore
    }
  };

  const executeSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults({ songs: [], artists: [], albums: [], playlists: [] });
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const searchData = await apiService.search(trimmed, 'all');
      setResults(searchData);
      saveRecentSearch(trimmed);
    } catch (err: any) {
      console.error('Search failed:', err);
      setSearchError('Could not load search results. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced live typing search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setResults({ songs: [], artists: [], albums: [], playlists: [] });
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(query);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query, executeSearch]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    executeSearch(query);
  };

  const handleSelectQuery = (term: string) => {
    setQuery(term);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    executeSearch(term);
  };

  const handleClear = () => {
    setQuery('');
    setResults({ songs: [], artists: [], albums: [], playlists: [] });
    setIsSearching(false);
    setSearchError(null);
    setActiveFilter('all');
  };

  const totalResultsCount =
    results.songs.length + results.artists.length + results.albums.length + results.playlists.length;
  const hasAnyResults = totalResultsCount > 0;

  const hasVisibleResults =
    (activeFilter === 'all' && hasAnyResults) ||
    (activeFilter === 'songs' && results.songs.length > 0) ||
    (activeFilter === 'artists' && results.artists.length > 0) ||
    (activeFilter === 'albums' && results.albums.length > 0) ||
    (activeFilter === 'playlists' && results.playlists.length > 0);

  const cleanQ = query.toLowerCase().trim();
  const topArtist = results.artists[0];
  const topSong = results.songs[0];
  const isArtistQuery = Boolean(
    topArtist &&
      cleanQ.length >= 3 &&
      (cleanQ === topArtist.name.toLowerCase() ||
        topArtist.name.toLowerCase().startsWith(cleanQ) ||
        cleanQ.includes(topArtist.name.toLowerCase()))
  );

  return (
    <div id="search-page" className="px-4 pb-36 pt-4 sm:px-6">
      {/* Search Input Bar (Apple Music style) */}
      <form onSubmit={handleFormSubmit} className="relative mx-auto max-w-2xl">
        <SearchIcon className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
        <input
          id="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Artists, Songs, Lyrics, and More"
          className="w-full rounded-2xl border border-zinc-200 bg-zinc-100/90 py-3 pl-11 pr-10 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-white dark:focus:border-zinc-700 dark:focus:bg-zinc-900 sm:text-base transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Filter Tabs (when query or results are active) */}
      {query.trim() && (
        <div className="mx-auto mt-4 flex max-w-2xl items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(
            [
              { id: 'all', label: 'All', count: totalResultsCount },
              { id: 'songs', label: 'Songs', count: results.songs.length },
              { id: 'artists', label: 'Artists', count: results.artists.length },
              { id: 'albums', label: 'Albums', count: results.albums.length },
              { id: 'playlists', label: 'Playlists', count: results.playlists.length },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                activeFilter === filter.id
                  ? 'bg-zinc-900 text-white shadow-xs dark:bg-white dark:text-zinc-950'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              <span>{filter.label}</span>
              {filter.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    activeFilter === filter.id
                      ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-950'
                      : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {filter.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Loading Skeleton */}
      {isSearching && (
        <div className="mx-auto mt-6 max-w-3xl space-y-4">
          <div className="flex items-center justify-center gap-2 text-zinc-400 py-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
            <span className="text-xs font-medium">Searching music catalog...</span>
          </div>

          <div className="space-y-2">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={`search-skeleton-${n}`}
                className="flex items-center gap-3.5 rounded-xl bg-zinc-100/60 p-2.5 dark:bg-zinc-900/40 animate-pulse"
              >
                <div className="h-12 w-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded-md bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-3 w-1/4 rounded-md bg-zinc-200 dark:bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {!isSearching && searchError && (
        <div className="mx-auto mt-10 max-w-md rounded-2xl bg-zinc-100 p-6 text-center dark:bg-zinc-900/60">
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">{searchError}</p>
          <button
            type="button"
            onClick={() => executeSearch(query)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#FA233B] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#E01E35] transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Empty / Initial State: Recent Searches + Popular Suggestions + Browse Categories */}
      {!query.trim() && !isSearching && (
        <div className="mx-auto mt-6 max-w-3xl space-y-8">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  <History className="h-3.5 w-3.5" />
                  <span>Recent Searches</span>
                </div>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-xs font-semibold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button
                    key={`recent-${term}`}
                    type="button"
                    onClick={() => handleSelectQuery(term)}
                    className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all active:scale-95"
                  >
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Popular Suggestions */}
          <section>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Trending & Popular</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={`popular-${term}`}
                  type="button"
                  onClick={() => handleSelectQuery(term)}
                  className="rounded-full border border-zinc-200 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 transition-all active:scale-95"
                >
                  {term}
                </button>
              ))}
            </div>
          </section>

          {/* Browse Categories */}
          <section>
            <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white sm:text-xl mb-4">
              Browse Categories
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {genres.map((genre, idx) => (
                <div
                  key={genre.title || idx}
                  onClick={() => handleSelectQuery(genre.title)}
                  className="group relative flex h-28 cursor-pointer overflow-hidden rounded-2xl p-3.5 shadow-xs transition-transform hover:scale-[1.02] active:scale-98"
                  style={{ backgroundColor: genre.color || '#1A1A1D' }}
                >
                  <span className="relative z-10 text-base font-bold text-white drop-shadow-xs">
                    {genre.title}
                  </span>
                  {genre.artworkUrl && genre.artworkUrl.trim() !== '' && (
                    <img
                      src={genre.artworkUrl}
                      alt={genre.title || 'Genre'}
                      className="absolute -bottom-2 -right-2 h-20 w-20 rotate-12 rounded-lg object-cover shadow-lg opacity-85 transition-transform group-hover:rotate-6 group-hover:scale-110"
                      loading="lazy"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Search Results Display */}
      {!isSearching && query.trim() && (
        <div className="mx-auto mt-6 max-w-3xl space-y-8">
          {/* Apple Music Style Top Result */}
          {activeFilter === 'all' && (topSong || (isArtistQuery && topArtist)) && (
            <section>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-3">Top Result</h3>
              {isArtistQuery && topArtist ? (
                <div
                  onClick={() => onOpenArtist(topArtist.artistId, topArtist.name)}
                  className="group flex cursor-pointer items-center justify-between rounded-2xl bg-zinc-100/90 p-4 sm:p-5 transition-all hover:bg-zinc-200/70 dark:bg-zinc-900/60 dark:hover:bg-zinc-850 shadow-xs"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative aspect-square h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-zinc-200 dark:ring-zinc-700 shadow-sm">
                      <img
                        src={topArtist.artworkUrl || tasteService.getArtistArtwork(topArtist.name) || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop'}
                        alt={topArtist.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-lg font-bold text-zinc-900 group-hover:text-[#FA233B] dark:text-white transition-colors truncate">
                        {topArtist.name}
                      </h4>
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Artist
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-xs font-bold text-white transition-all hover:scale-105 dark:bg-white dark:text-zinc-950"
                  >
                    View Artist
                  </button>
                </div>
              ) : topSong ? (
                <div
                  onClick={() => playTrack(topSong)}
                  className="group flex cursor-pointer items-center justify-between rounded-2xl bg-zinc-100/90 p-4 sm:p-5 transition-all hover:bg-zinc-200/70 dark:bg-zinc-900/60 dark:hover:bg-zinc-850 shadow-xs"
                >
                  <div className="flex items-center gap-4 min-w-0 pr-3">
                    <div className="relative aspect-square h-20 w-20 shrink-0 overflow-hidden rounded-xl shadow-sm">
                      <img
                        src={topSong.artworkUrl || `https://i.ytimg.com/vi/${topSong.videoId}/hqdefault.jpg`}
                        alt={topSong.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-base font-bold text-zinc-900 group-hover:text-[#FA233B] dark:text-white transition-colors truncate sm:text-lg">
                        {topSong.title}
                      </h4>
                      <p className="mt-0.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 truncate">
                        {topSong.artist}
                      </p>
                      <span className="mt-1 inline-block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        Song
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentTrack?.videoId === topSong.videoId) {
                        togglePlay();
                      } else {
                        playTrack(topSong);
                      }
                    }}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FA233B] text-white shadow-md transition-transform hover:scale-105 active:scale-95"
                    aria-label="Play top result"
                  >
                    {currentTrack?.videoId === topSong.videoId && isPlaying ? (
                      <Pause className="h-5 w-5 fill-current" />
                    ) : (
                      <Play className="h-5 w-5 fill-current translate-x-0.5" />
                    )}
                  </button>
                </div>
              ) : null}
            </section>
          )}

          {/* Songs List */}
          {(activeFilter === 'all' || activeFilter === 'songs') && results.songs.length > 0 && (
            <section>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-2">Songs</h3>
              <div className="divide-y divide-zinc-100 rounded-2xl bg-zinc-50/50 p-2 dark:divide-zinc-800/80 dark:bg-zinc-900/40 shadow-xs">
                {results.songs.map((song, idx) => (
                  <SongCard
                    key={`search-song-${song.videoId || 'song'}-${idx}`}
                    track={song}
                    onArtistClick={onOpenArtist}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Albums Shelf */}
          {(activeFilter === 'all' || activeFilter === 'albums') && results.albums.length > 0 && (
            <section>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-3">Albums</h3>
              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {results.albums.map((album, idx) => (
                  <AlbumCard key={`search-album-${album.albumId || 'alb'}-${idx}`} album={album} onClick={onOpenAlbum} />
                ))}
              </div>
            </section>
          )}

          {/* Playlists Shelf */}
          {(activeFilter === 'all' || activeFilter === 'playlists') && results.playlists.length > 0 && (
            <section>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-3">Playlists</h3>
              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {results.playlists.map((playlist, idx) => (
                  <PlaylistCard
                    key={`search-playlist-${playlist.playlistId || 'pl'}-${idx}`}
                    playlist={playlist}
                    onClick={onOpenPlaylist}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Artists / Artist Page Section - positioned at the end of search engine results */}
          {(activeFilter === 'all' || activeFilter === 'artists') && results.artists.length > 0 && (
            <section className="pt-2 border-t border-zinc-100 dark:border-zinc-850">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Artists</h3>
                <span className="text-xs font-semibold text-[#FA233B]">Artist Page</span>
              </div>

              {/* Dedicated Featured Artist Page Banner for top matching artist */}
              {results.artists[0] && (
                <div
                  id={`artist-page-banner-${results.artists[0].artistId}`}
                  onClick={() => onOpenArtist(results.artists[0].artistId, results.artists[0].name)}
                  className="group mb-4 flex cursor-pointer items-center justify-between rounded-2xl bg-zinc-100/90 p-4 transition-all hover:bg-zinc-200/70 dark:bg-zinc-900/60 dark:hover:bg-zinc-850 shadow-xs border border-zinc-200/60 dark:border-zinc-800/80"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative aspect-square h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-zinc-200 dark:ring-zinc-700 shadow-sm">
                      <img
                        src={
                          results.artists[0].artworkUrl ||
                          tasteService.getArtistArtwork(results.artists[0].name) ||
                          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop'
                        }
                        alt={results.artists[0].name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-zinc-900 group-hover:text-[#FA233B] dark:text-white transition-colors truncate">
                          {results.artists[0].name}
                        </h4>
                        <span className="rounded-md bg-zinc-200/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          Artist
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        Open artist page • Top songs, albums & singles
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 ml-3 rounded-full bg-zinc-900 px-4 py-2 text-xs font-bold text-white transition-all group-hover:scale-105 dark:bg-white dark:text-zinc-950 shadow-xs"
                  >
                    View Artist Page
                  </button>
                </div>
              )}

              {/* Artist Carousel */}
              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {results.artists.map((artist, idx) => (
                  <ArtistCard key={`search-artist-${artist.artistId || 'art'}-${idx}`} artist={artist} onClick={onOpenArtist} />
                ))}
              </div>
            </section>
          )}

          {/* Filter-Specific Empty State (e.g. In "Albums" tab but only songs found) */}
          {!hasVisibleResults && hasAnyResults && (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
                No {activeFilter} found for "{query}"
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Found {results.songs.length} songs and {results.artists.length} artists
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white dark:bg-white dark:text-zinc-950"
                >
                  View All Results
                </button>
                {results.songs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('songs')}
                    className="rounded-full bg-zinc-200 px-4 py-1.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    View Songs ({results.songs.length})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Completely No Results */}
          {!hasAnyResults && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
              <SearchIcon className="h-10 w-10 opacity-30 mb-3" />
              <p className="text-base font-semibold text-zinc-600 dark:text-zinc-300">
                No results found for "{query}"
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Check spelling or try popular artist or track names
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-sm">
                {POPULAR_SEARCHES.slice(0, 4).map((term) => (
                  <button
                    key={`noresult-suggestion-${term}`}
                    type="button"
                    onClick={() => handleSelectQuery(term)}
                    className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
