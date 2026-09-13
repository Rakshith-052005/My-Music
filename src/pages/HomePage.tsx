import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Play, Pause, Sparkles, RefreshCw, ChevronLeft, ChevronRight, Flame, SlidersHorizontal, Plus, Star } from 'lucide-react';
import { ActiveTab, HomeShelf, Track, Album, Artist, Playlist } from '../types/music';
import { personalizedEngine } from '../services/personalizedEngine';
import { tasteService, PRESET_ARTISTS } from '../services/tasteService';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { SongCard } from '../components/cards/SongCard';
import { AlbumCard } from '../components/cards/AlbumCard';
import { ArtistCard } from '../components/cards/ArtistCard';
import { PlaylistCard } from '../components/cards/PlaylistCard';
import { TasteTunerModal } from '../components/modals/TasteTunerModal';

interface HomePageProps {
  activeTab: ActiveTab;
  onOpenAlbum: (albumId: string, album?: Album) => void;
  onOpenArtist: (artistId: string, artistName: string) => void;
  onOpenPlaylist: (playlistId: string) => void;
}

// Reusable horizontal shelf with desktop navigation arrows
const ShelfSection: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actionButton?: React.ReactNode;
}> = ({ title, subtitle, children, actionButton }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -460 : 460;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <section className="space-y-3.5">
      <div className="flex items-end justify-between px-4 sm:px-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-2xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actionButton}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200/80 bg-white text-zinc-700 shadow-xs transition-all hover:bg-zinc-100 disabled:opacity-30 disabled:pointer-events-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200/80 bg-white text-zinc-700 shadow-xs transition-all hover:bg-zinc-100 disabled:opacity-30 disabled:pointer-events-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto px-4 pb-2 pt-1 no-scrollbar sm:px-6"
      >
        {children}
      </div>
    </section>
  );
};

export const HomePage: React.FC<HomePageProps> = ({
  activeTab,
  onOpenAlbum,
  onOpenArtist,
  onOpenPlaylist,
}) => {
  const [shelves, setShelves] = useState<HomeShelf[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTasteModalOpen, setIsTasteModalOpen] = useState(false);

  const { likes, history } = useLibrary();
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue } = usePlayer();
  const [preferences, setPreferences] = useState(tasteService.getPreferences());

  const loadPersonalizedHomeData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await personalizedEngine.getPersonalizedHome(likes, history);
      setShelves(data);
      setPreferences(tasteService.getPreferences());
    } catch (err: any) {
      console.error('Failed to load personalized home feed:', err);
      setError('Could not load personalized music feed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [likes, history]);

  useEffect(() => {
    loadPersonalizedHomeData();
  }, [loadPersonalizedHomeData, activeTab]);

  useEffect(() => {
    // Subscribe to taste updates
    const unsubscribe = tasteService.subscribe(() => {
      setPreferences(tasteService.getPreferences());
      loadPersonalizedHomeData();
    });
    return unsubscribe;
  }, [loadPersonalizedHomeData]);

  // Find quick picks shelf
  const quickPicksShelf = shelves.find((s) => s.type === 'quick_picks') || shelves[0];
  const quickPickTracks = (quickPicksShelf?.contents || []).filter(
    (item): item is Track => 'videoId' in item
  );

  // Shelves excluding Quick Picks
  const otherShelves = shelves.filter((s) => s !== quickPicksShelf);

  const firstShelf = otherShelves.length > 0 ? otherShelves[0] : null;
  const remainingShelves = otherShelves.slice(1).filter((s) => s.type !== 'artists');

  return (
    <div id="home-page" className="pb-32 pt-2 sm:pt-4">
      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-10 px-4 sm:px-6">
          <div className="space-y-4">
            <div className="h-6 w-36 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="flex h-16 animate-pulse items-center gap-3 rounded-2xl bg-zinc-100 p-2.5 dark:bg-zinc-900"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="mx-4 my-12 flex flex-col items-center justify-center rounded-3xl border border-zinc-200 bg-zinc-50/50 p-10 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-[#FA233B] dark:bg-red-950/40">
            <RefreshCw className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">{error}</p>
          <button
            onClick={loadPersonalizedHomeData}
            className="mt-5 flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </button>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && !error && (
        <div className="space-y-10">
          {/* TOP PICKS FOR YOU (Spacious 2-column grid) */}
          {quickPickTracks.length > 0 && (
            <section id="quick-picks-section" className="px-4 sm:px-6">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-2xl">
                      {quickPicksShelf?.title || 'Top Picks For You'}
                    </h2>
                    <span className="hidden rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 sm:inline-block">
                      Official Audio
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {quickPicksShelf?.subtitle || 'Curated official songs tailored to your taste'}
                  </p>
                </div>

                <button
                  onClick={() => playTrack(quickPickTracks[0], quickPickTracks)}
                  className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-900 transition-all hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Play All
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {quickPickTracks.slice(0, 8).map((track, idx) => (
                  <SongCard
                    key={`quick-pick-${track.videoId || 'song'}-${idx}`}
                    track={track}
                    index={idx}
                    layout="row"
                    queueContext={quickPickTracks}
                    onArtistClick={onOpenArtist}
                  />
                ))}
              </div>
            </section>
          )}

          {/* SECTION 2: First shelf (e.g. Favorite Songs or Because You Like The Weeknd) */}
          {firstShelf && firstShelf.contents && firstShelf.contents.length > 0 && (
            <ShelfSection
              key="shelf-first-0"
              title={firstShelf.title}
              subtitle={firstShelf.subtitle}
              actionButton={
                firstShelf.type === 'songs' ? (
                  <button
                    onClick={() => {
                      const songContents = firstShelf.contents.filter(
                        (c: any): c is Track => 'videoId' in c
                      );
                      if (songContents.length > 0) {
                        playTrack(songContents[0], songContents);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-900 transition-all hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    Play
                  </button>
                ) : undefined
              }
            >
              {firstShelf.contents.map((item: any, itemIdx: number) => {
                if ('artistId' in item && !('videoId' in item) && !('albumId' in item)) {
                  return (
                    <ArtistCard
                      key={`first-shelf-artist-${item.artistId || 'artist'}-${itemIdx}`}
                      artist={item as Artist}
                      onClick={onOpenArtist}
                    />
                  );
                }
                if ('albumId' in item && !('videoId' in item)) {
                  return (
                    <AlbumCard
                      key={`first-shelf-album-${item.albumId || 'album'}-${itemIdx}`}
                      album={item as Album}
                      onClick={onOpenAlbum}
                    />
                  );
                }
                if ('playlistId' in item) {
                  return (
                    <PlaylistCard
                      key={`first-shelf-playlist-${item.playlistId || 'playlist'}-${itemIdx}`}
                      playlist={item as Playlist}
                      onClick={onOpenPlaylist}
                    />
                  );
                }
                if ('videoId' in item) {
                  return (
                    <SongCard
                      key={`first-shelf-song-${item.videoId || 'song'}-${itemIdx}`}
                      track={item as Track}
                      layout="card"
                      queueContext={firstShelf.contents.filter((c: any) => 'videoId' in c) as Track[]}
                      onArtistClick={onOpenArtist}
                    />
                  );
                }
                return null;
              })}
            </ShelfSection>
          )}

          {/* SECTIONS: REMAINING PERSONALIZED SHELVES */}
          {remainingShelves.map((shelf, shelfIdx) => {
            if (!shelf.contents || shelf.contents.length === 0) return null;

            return (
              <ShelfSection
                key={`shelf-${shelf.title || shelfIdx}-${shelfIdx}`}
                title={shelf.title}
                subtitle={shelf.subtitle}
                actionButton={
                  shelf.type === 'songs' ? (
                    <button
                      onClick={() => {
                        const songContents = shelf.contents.filter(
                          (c: any): c is Track => 'videoId' in c
                        );
                        if (songContents.length > 0) {
                          playTrack(songContents[0], songContents);
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-900 transition-all hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      Play
                    </button>
                  ) : undefined
                }
              >
                {shelf.contents.map((item: any, itemIdx: number) => {
                  // Artist item
                  if ('artistId' in item && !('videoId' in item) && !('albumId' in item)) {
                    return (
                      <ArtistCard
                        key={`shelf-${shelfIdx}-artist-${item.artistId || 'artist'}-${itemIdx}`}
                        artist={item as Artist}
                        onClick={onOpenArtist}
                      />
                    );
                  }
                  // Album item
                  if ('albumId' in item && !('videoId' in item)) {
                    return (
                      <AlbumCard
                        key={`shelf-${shelfIdx}-album-${item.albumId || 'album'}-${itemIdx}`}
                        album={item as Album}
                        onClick={onOpenAlbum}
                      />
                    );
                  }
                  // Playlist item
                  if ('playlistId' in item) {
                    return (
                      <PlaylistCard
                        key={`shelf-${shelfIdx}-playlist-${item.playlistId || 'playlist'}-${itemIdx}`}
                        playlist={item as Playlist}
                        onClick={onOpenPlaylist}
                      />
                    );
                  }
                  // Song item (fallback)
                  if ('videoId' in item) {
                    return (
                      <SongCard
                        key={`shelf-${shelfIdx}-song-${item.videoId || 'song'}-${itemIdx}`}
                        track={item as Track}
                        layout="card"
                        queueContext={shelf.contents.filter((c: any) => 'videoId' in c) as Track[]}
                        onArtistClick={onOpenArtist}
                      />
                    );
                  }
                  return null;
                })}
              </ShelfSection>
            );
          })}
        </div>
      )}

      {/* Taste Tuner Modal */}
      <TasteTunerModal
        isOpen={isTasteModalOpen}
        onClose={() => setIsTasteModalOpen(false)}
        onTasteUpdated={loadPersonalizedHomeData}
      />
    </div>
  );
};
