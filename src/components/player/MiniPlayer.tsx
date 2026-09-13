import React from 'react';
import { Play, Pause, SkipForward, Heart } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { useLibrary } from '../../context/LibraryContext';
import { getHighResArtwork, cleanArtistName } from '../../utils/trackHelper';

export const MiniPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    playNext,
    currentTime,
    duration,
    setIsFullPlayerOpen,
  } = usePlayer();

  const { isLiked, toggleLike } = useLibrary();

  if (!currentTrack) return null;

  const liked = isLiked(currentTrack);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      id="mini-player-container"
      className="fixed bottom-[60px] left-0 right-0 z-30 px-3 sm:px-4"
    >
      <div
        onClick={() => setIsFullPlayerOpen(true)}
        className="group relative mx-auto flex max-w-lg cursor-pointer items-center justify-between overflow-hidden rounded-2xl border border-zinc-200/90 bg-white/95 p-2 shadow-lg backdrop-blur-xl transition-all hover:bg-white dark:border-zinc-800/90 dark:bg-zinc-900/95 dark:hover:bg-zinc-900"
      >
        {/* Subtle Progress Bar on Top */}
        <div className="absolute left-0 top-0 h-[2px] w-full bg-zinc-200/60 dark:bg-zinc-800">
          <div
            className="h-full bg-[#FA233B] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Artwork and Track Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-zinc-200 shadow-sm dark:bg-zinc-800">
            <img
              src={getHighResArtwork(currentTrack.artworkUrl, currentTrack.videoId)}
              alt={currentTrack.title || 'Track'}
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover"
              onError={(e) => {
                if (currentTrack.videoId && (e.target as HTMLImageElement).src !== `https://i.ytimg.com/vi/${currentTrack.videoId}/hqdefault.jpg`) {
                  (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${currentTrack.videoId}/hqdefault.jpg`;
                } else {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop';
                }
              }}
            />
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <span className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
              {currentTrack.title}
            </span>
            <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {cleanArtistName(currentTrack.artist, currentTrack.title)}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Like */}
          <button
            onClick={() => toggleLike(currentTrack)}
            className={`p-2 transition-colors ${
              liked ? 'text-[#FA233B]' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <Heart className={`h-5 w-5 ${liked ? 'fill-[#FA233B]' : ''}`} />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-900 transition-transform active:scale-90 dark:text-white"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 fill-current" />
            ) : (
              <Play className="h-6 w-6 fill-current ml-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={playNext}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 transition-transform hover:text-zinc-950 active:scale-90 dark:text-zinc-300 dark:hover:text-white"
            aria-label="Next track"
          >
            <SkipForward className="h-5 w-5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
