import React, { useEffect, useState } from 'react';
import { ChevronLeft, Play, Shuffle, Calendar, Music } from 'lucide-react';
import { Album } from '../types/music';
import { apiService } from '../services/api';
import { SongCard } from '../components/cards/SongCard';
import { usePlayer } from '../context/PlayerContext';
import { eventTracker } from '../services/eventTracker';

interface AlbumPageProps {
  albumId: string;
  albumHint?: Partial<Album>;
  onBack: () => void;
  onOpenArtist?: (artistId: string, artistName: string) => void;
}

export const AlbumPage: React.FC<AlbumPageProps> = ({
  albumId,
  albumHint,
  onBack,
  onOpenArtist,
}) => {
  const [album, setAlbum] = useState<Album | null>(
    albumHint
      ? {
          id: albumId,
          albumId,
          title: albumHint.title || 'Album',
          artist: albumHint.artist || 'Artist',
          artistId: albumHint.artistId || '',
          year: albumHint.year,
          artworkUrl: albumHint.artworkUrl || '',
          trackCount: albumHint.trackCount || 0,
          tracks: albumHint.tracks || [],
          provider: 'youtube_music',
        }
      : null
  );
  const [isLoading, setIsLoading] = useState(!albumHint || !albumHint.tracks || albumHint.tracks.length === 0);
  const [error, setError] = useState<string | null>(null);
  const { playTrack } = usePlayer();

  useEffect(() => {
    loadAlbum();
  }, [albumId]);

  const loadAlbum = async () => {
    if (!album?.tracks || album.tracks.length === 0) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await apiService.getAlbum(albumId, albumHint);
      if (data) {
        setAlbum(data);
        eventTracker.trackOpenAlbum(albumId, data.title);
      } else if (!album) {
        setError('Could not find album information.');
      }
    } catch (err) {
      console.error('Failed to load album:', err);
      if (!album) {
        setError('Could not load album.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAlbum = () => {
    if (album?.tracks && album.tracks.length > 0) {
      playTrack(album.tracks[0], album.tracks);
    }
  };

  const handleShuffleAlbum = () => {
    if (album?.tracks && album.tracks.length > 0) {
      const shuffled = [...album.tracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  return (
    <div id="album-page" className="pb-36 pt-2">
      {/* Top Navigation */}
      <div className="flex items-center px-4 py-2 sm:px-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded-full p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Go back"
        >
          <ChevronLeft className="h-6 w-6" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      {isLoading && !album && (
        <div className="animate-pulse px-4 space-y-6 sm:px-6">
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <div className="h-56 w-56 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
            <div className="space-y-3 flex-1">
              <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-5 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-10 w-40 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
        </div>
      )}

      {error && !album && (
        <div className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <Music className="h-10 w-10 mx-auto opacity-30 mb-3" />
          <p>{error}</p>
        </div>
      )}

      {album && (
        <div className="space-y-8 px-4 sm:px-6">
          {/* Header Card (Apple Music style) */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pt-2">
            <div className="aspect-square w-52 sm:w-60 overflow-hidden rounded-2xl bg-zinc-200 shadow-2xl ring-1 ring-zinc-900/10 dark:ring-white/10 shrink-0">
              <img
                src={album.artworkUrl && album.artworkUrl.trim() !== '' ? album.artworkUrl : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop'}
                alt={album.title || 'Album'}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop';
                }}
              />
            </div>

            <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FA233B]">
                Album
              </span>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                {album.title}
              </h1>
              <button
                onClick={() => {
                  if (album.artistId && onOpenArtist) {
                    onOpenArtist(album.artistId, album.artist);
                  }
                }}
                className="mt-1 text-base font-semibold text-[#FA233B] hover:underline"
              >
                {album.artist}
              </button>

              <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                {album.year && <span>{album.year}</span>}
                {album.year && <span>•</span>}
                <span>{album.tracks?.length || album.trackCount || 0} Songs</span>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex gap-3">
                <button
                  onClick={handlePlayAlbum}
                  disabled={!album.tracks || album.tracks.length === 0}
                  className="flex items-center gap-2 rounded-full bg-[#FA233B] px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[#d91d32] transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                  Play
                </button>
                <button
                  onClick={handleShuffleAlbum}
                  disabled={!album.tracks || album.tracks.length === 0}
                  className="flex items-center gap-2 rounded-full bg-zinc-100 px-6 py-2.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-200 transition-transform active:scale-95 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Shuffle className="h-4 w-4" />
                  Shuffle
                </button>
              </div>
            </div>
          </div>

          {/* Album Track List */}
          <div className="mt-8">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-2">Tracklist</h2>
            {album.tracks && album.tracks.length > 0 ? (
              <div className="divide-y divide-zinc-100 rounded-2xl bg-zinc-50/50 p-2 dark:divide-zinc-800 dark:bg-zinc-900/40">
                {album.tracks.map((track, idx) => (
                  <SongCard
                    key={`album-track-${track.videoId || 'trk'}-${idx}`}
                    track={track}
                    index={idx}
                    queueContext={album.tracks}
                    onArtistClick={onOpenArtist}
                  />
                ))}
              </div>
            ) : isLoading ? (
              <div className="space-y-2 rounded-2xl bg-zinc-50/50 p-3 dark:bg-zinc-900/40 animate-pulse">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={`album-loading-row-${n}`} className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 rounded bg-zinc-200 dark:bg-zinc-800" />
                      <div className="h-10 w-10 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                      <div className="space-y-1.5">
                        <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
                      </div>
                    </div>
                    <div className="h-3 w-10 rounded bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-zinc-400">
                <Music className="h-8 w-8 mx-auto opacity-30 mb-2" />
                Tracklist unavailable for this release
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
