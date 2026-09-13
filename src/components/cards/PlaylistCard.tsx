import React from 'react';
import { Play } from 'lucide-react';
import { Playlist } from '../../types/music';

interface PlaylistCardProps {
  playlist: Playlist;
  onClick: (playlistId: string) => void;
  onPlay?: (playlist: Playlist) => void;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist, onClick, onPlay }) => {
  return (
    <div
      id={`playlist-card-${playlist.playlistId}`}
      onClick={() => onClick(playlist.playlistId)}
      className="group relative flex w-40 shrink-0 cursor-pointer flex-col sm:w-48"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-100 shadow-sm transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-md dark:bg-zinc-800">
        <img
          src={playlist.artworkUrl && playlist.artworkUrl.trim() !== '' ? playlist.artworkUrl : 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop'}
          alt={playlist.title || 'Playlist'}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop';
          }}
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        {onPlay && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay(playlist);
            }}
            className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#FA233B] text-white shadow-xl opacity-0 translate-y-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-110 active:scale-95"
            aria-label={`Play playlist ${playlist.title}`}
          >
            <Play className="h-4.5 w-4.5 fill-white ml-0.5" />
          </button>
        )}
      </div>

      <div className="mt-2.5 flex flex-col">
        <span className="truncate text-sm font-semibold tracking-tight text-zinc-900 group-hover:text-[#FA233B] dark:text-white">
          {playlist.title}
        </span>
        <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {playlist.author || 'Curated Playlist'}
        </span>
      </div>
    </div>
  );
};
