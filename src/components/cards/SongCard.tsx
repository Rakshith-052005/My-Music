import React from 'react';
import { Play, Pause, Heart, MoreVertical, Plus } from 'lucide-react';
import { Track } from '../../types/music';
import { usePlayer } from '../../context/PlayerContext';
import { useLibrary } from '../../context/LibraryContext';
import { formatDuration, cleanArtistName, cleanAlbumTitle } from '../../utils/trackHelper';

interface SongCardProps {
  track: Track;
  index?: number;
  layout?: 'row' | 'card';
  queueContext?: Track[];
  onArtistClick?: (artistId: string, artistName: string) => void;
}

export const SongCard: React.FC<SongCardProps> = ({
  track,
  index,
  layout = 'row',
  queueContext,
  onArtistClick,
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay, addToQueue } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();

  const isCurrent = currentTrack?.videoId === track.videoId;
  const isPlayingThis = isCurrent && isPlaying;
  const liked = isLiked(track);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track, queueContext);
    }
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike(track);
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(track);
  };

  const artworkSrc = (track.artworkUrl && track.artworkUrl.trim() !== '')
    ? track.artworkUrl
    : (track.videoId ? `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop');

  const artistName = cleanArtistName(track.artist, track.title);
  const albumName = cleanAlbumTitle(track.album, track.title, artistName);

  if (layout === 'card') {
    return (
      <div
        id={`song-card-${track.videoId}`}
        onClick={handlePlayClick}
        className="group relative flex w-40 shrink-0 cursor-pointer flex-col sm:w-48"
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-100 shadow-sm transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-md dark:bg-zinc-800">
          <img
            src={artworkSrc}
            alt={track.title || 'Track'}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop';
            }}
          />
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-200 ${
              isPlayingThis ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <button
              onClick={handlePlayClick}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FA233B] text-white shadow-lg transition-transform duration-150 hover:scale-110 active:scale-95"
              aria-label={isPlayingThis ? 'Pause' : 'Play'}
            >
              {isPlayingThis ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
            </button>
          </div>

          {/* Playing indicator badge */}
          {isPlayingThis && (
            <div className="absolute bottom-2 left-2 flex items-center gap-0.5 rounded-full bg-black/60 px-2 py-0.5 backdrop-blur-md">
              <span className="h-2 w-0.5 rounded-full bg-white animate-wave-1" />
              <span className="h-3 w-0.5 rounded-full bg-white animate-wave-2" />
              <span className="h-2 w-0.5 rounded-full bg-white animate-wave-3" />
            </div>
          )}
        </div>
        <div className="mt-2.5 flex flex-col">
          <span className={`truncate text-sm font-semibold tracking-tight ${isCurrent ? 'text-[#FA233B]' : 'text-zinc-900 dark:text-white'}`}>
            {track.title}
          </span>
          <span
            onClick={(e) => {
              if (track.artistId && onArtistClick) {
                e.stopPropagation();
                onArtistClick(track.artistId, artistName);
              }
            }}
            className="truncate text-xs text-zinc-500 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            {artistName}
          </span>
        </div>
      </div>
    );
  }

  // Row layout (Standard Apple Music list item)
  return (
    <div
      id={`song-row-${track.videoId}`}
      onClick={handlePlayClick}
      className={`group flex items-center justify-between rounded-xl p-2 transition-all cursor-pointer ${
        isCurrent
          ? 'bg-red-500/10 dark:bg-red-500/15'
          : 'hover:bg-zinc-100/90 dark:hover:bg-zinc-800/60'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {index !== undefined && (
          <div className="w-5 text-center shrink-0">
            {isCurrent && isPlaying ? (
              <div className="flex items-end justify-center gap-0.5 h-3.5">
                <span className="w-0.5 rounded-full bg-[#FA233B] animate-wave-1" />
                <span className="w-0.5 rounded-full bg-[#FA233B] animate-wave-2" />
                <span className="w-0.5 rounded-full bg-[#FA233B] animate-wave-3" />
              </div>
            ) : (
              <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                {index + 1}
              </span>
            )}
          </div>
        )}

        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-200 shadow-xs dark:bg-zinc-800">
          <img
            src={artworkSrc}
            alt={track.title || 'Track'}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop';
            }}
          />
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
              isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {isPlayingThis ? (
              <Pause className="h-4 w-4 fill-white text-white" />
            ) : (
              <Play className="h-4 w-4 fill-white text-white ml-0.5" />
            )}
          </div>
        </div>

        <div className="flex flex-col min-w-0 flex-1 pr-2">
          <span
            className={`truncate text-sm font-medium tracking-tight ${
              isCurrent ? 'font-semibold text-[#FA233B]' : 'text-zinc-900 dark:text-white'
            }`}
          >
            {track.title}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span
              onClick={(e) => {
                if (track.artistId && onArtistClick) {
                  e.stopPropagation();
                  onArtistClick(track.artistId, artistName);
                }
              }}
              className="truncate hover:text-zinc-900 hover:underline dark:hover:text-zinc-200"
            >
              {artistName}
            </span>
            {albumName && (
              <>
                <span className="text-zinc-400">•</span>
                <span className="truncate max-w-[140px] text-zinc-400">{albumName}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="hidden text-xs tabular-nums text-zinc-400 sm:inline-block">
          {formatDuration(track.duration)}
        </span>

        {/* Add to Queue */}
        <button
          onClick={handleAddToQueue}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-zinc-700 transition-opacity dark:hover:text-zinc-200"
          title="Add to queue"
          aria-label="Add track to queue"
        >
          <Plus className="h-4 w-4" />
        </button>

        {/* Like Button */}
        <button
          onClick={handleLikeClick}
          className={`p-1.5 transition-colors ${
            liked
              ? 'text-[#FA233B]'
              : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
          }`}
          title={liked ? 'Unlike' : 'Like'}
          aria-label={liked ? 'Unlike track' : 'Like track'}
        >
          <Heart className={`h-4 w-4 ${liked ? 'fill-[#FA233B]' : ''}`} />
        </button>
      </div>
    </div>
  );
};
