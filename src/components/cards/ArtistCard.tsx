import React, { useState } from 'react';
import { Artist } from '../../types/music';
import { tasteService } from '../../services/tasteService';
import { Mic2 } from 'lucide-react';

interface ArtistCardProps {
  artist: Artist;
  onClick: (artistId: string, artistName: string) => void;
}

export const ArtistCard: React.FC<ArtistCardProps> = ({ artist, onClick }) => {
  const [imgFailed, setImgFailed] = useState(false);

  // Check direct artwork or verified portrait from tasteService
  const portraitUrl =
    artist.artworkUrl && artist.artworkUrl.trim() !== '' && !artist.artworkUrl.includes('i.ytimg.com/vi/')
      ? artist.artworkUrl
      : tasteService.getArtistArtwork(artist.name) || '';

  // Get initials for fallback
  const initials = artist.name
    ? artist.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('')
    : 'AR';

  return (
    <div
      id={`artist-card-${artist.artistId}`}
      onClick={() => onClick(artist.artistId, artist.name)}
      className="group flex w-32 shrink-0 cursor-pointer flex-col items-center sm:w-40"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 ring-2 ring-zinc-200/80 shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:ring-4 group-hover:ring-[#FA233B]/40 dark:ring-zinc-800">
        {portraitUrl && !imgFailed ? (
          <img
            src={portraitUrl}
            alt={artist.name || 'Artist'}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-white/90">
            <Mic2 className="h-7 w-7 text-white/60 mb-1" />
            <span className="text-xs font-bold tracking-wider">{initials}</span>
          </div>
        )}
      </div>
      <span className="mt-3 line-clamp-1 text-center text-xs font-semibold tracking-tight text-zinc-900 group-hover:text-[#FA233B] dark:text-white sm:text-sm">
        {artist.name}
      </span>
      <span className="text-[11px] font-medium text-zinc-400">Artist</span>
    </div>
  );
};

