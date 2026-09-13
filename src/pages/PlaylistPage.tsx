import React, { useEffect, useState } from 'react';
import { ChevronLeft, Play, Shuffle, ListMusic, Music } from 'lucide-react';
import { Playlist } from '../types/music';
import { apiService } from '../services/api';
import { SongCard } from '../components/cards/SongCard';
import { usePlayer } from '../context/PlayerContext';

interface PlaylistPageProps {
  playlistId: string;
  onBack: () => void;
  onOpenArtist?: (artistId: string, artistName: string) => void;
}

export const PlaylistPage: React.FC<PlaylistPageProps> = ({
  playlistId,
  onBack,
  onOpenArtist,
}) => {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { playTrack } = usePlayer();

  useEffect(() => {
    loadPlaylist();
  }, [playlistId]);

  const loadPlaylist = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.getPlaylist(playlistId);
      if (data) {
        setPlaylist(data);
      } else {
        setError('Playlist not found');
      }
    } catch (err) {
      console.error('Failed to load playlist:', err);
      setError('Could not load playlist.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPlaylist = () => {
    if (playlist?.tracks && playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], playlist.tracks);
    }
  };

  const handleShufflePlaylist = () => {
    if (playlist?.tracks && playlist.tracks.length > 0) {
      const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  return (
    <div id="playlist-page" className="pb-36 pt-2">
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

      {isLoading && (
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

      {!isLoading && playlist && (
        <div className="space-y-8 px-4 sm:px-6">
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pt-2">
            <div className="aspect-square w-52 sm:w-60 overflow-hidden rounded-2xl bg-zinc-200 shadow-2xl ring-1 ring-zinc-900/10 dark:ring-white/10 shrink-0">
              <img
                src={playlist.artworkUrl && playlist.artworkUrl.trim() !== '' ? playlist.artworkUrl : 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop'}
                alt={playlist.title || 'Playlist'}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop';
                }}
              />
            </div>

            <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FA233B]">
                {playlist.isMix ? 'Personal Mix' : 'Playlist'}
              </span>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                {playlist.title}
              </h1>
              {playlist.author && (
                <p className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  By {playlist.author}
                </p>
              )}
              {playlist.description && (
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 max-w-xl">
                  {playlist.description}
                </p>
              )}

              <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                <span>{playlist.tracks?.length || playlist.trackCount || 0} Songs</span>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex gap-3">
                <button
                  onClick={handlePlayPlaylist}
                  disabled={!playlist.tracks || playlist.tracks.length === 0}
                  className="flex items-center gap-2 rounded-full bg-[#FA233B] px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[#d91d32] transition-transform active:scale-95"
                >
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                  Play
                </button>
                <button
                  onClick={handleShufflePlaylist}
                  disabled={!playlist.tracks || playlist.tracks.length === 0}
                  className="flex items-center gap-2 rounded-full bg-zinc-100 px-6 py-2.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-200 transition-transform active:scale-95 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                >
                  <Shuffle className="h-4 w-4" />
                  Shuffle
                </button>
              </div>
            </div>
          </div>

          {/* Tracks List */}
          <div className="mt-8">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-2">Songs</h2>
            {playlist.tracks && playlist.tracks.length > 0 ? (
              <div className="divide-y divide-zinc-100 rounded-2xl bg-zinc-50/50 p-2 dark:divide-zinc-800 dark:bg-zinc-900/40">
                {playlist.tracks.map((track, idx) => (
                  <SongCard
                    key={`playlist-track-${track.videoId || 'trk'}-${idx}`}
                    track={track}
                    index={idx}
                    queueContext={playlist.tracks}
                    onArtistClick={onOpenArtist}
                  />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-zinc-400">
                <Music className="h-8 w-8 mx-auto opacity-30 mb-2" />
                No tracks currently listed in this playlist
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
