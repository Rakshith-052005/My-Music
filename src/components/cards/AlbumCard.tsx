import React from 'react';
import { Play } from 'lucide-react';
import { Album } from '../../types/music';

interface AlbumCardProps {
  album: Album;
  onClick: (albumId: string, album?: Album) => void;
  onPlay?: (album: Album) => void;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({ album, onClick, onPlay }) => {
  return (
    <div
      id={`album-card-${album.albumId}`}
      onClick={() => onClick(album.albumId, album)}
      className="group relative flex w-40 shrink-0 cursor-pointer flex-col sm:w-48"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-100 shadow-sm transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-md dark:bg-zinc-800">
        <img
          src={album.artworkUrl && album.artworkUrl.trim() !== '' ? album.artworkUrl : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop'}
          alt={album.title || 'Album'}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop';
          }}
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        {onPlay && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay(album);
            }}
            className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#FA233B] text-white shadow-xl opacity-0 translate-y-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-110 active:scale-95"
            aria-label={`Play album ${album.title}`}
          >
            <Play className="h-4.5 w-4.5 fill-white ml-0.5" />
          </button>
        )}
      </div>

      <div className="mt-2.5 flex flex-col">
        <span className="truncate text-sm font-semibold tracking-tight text-zinc-900 group-hover:text-[#FA233B] dark:text-white">
          {album.title}
        </span>
        <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {album.artist} {album.year ? `• ${album.year}` : ''}
        </span>
      </div>
    </div>
  );
};
