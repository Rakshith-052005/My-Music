import React, { useState } from 'react';
import { Heart, Clock, Play, Shuffle, Users, Plus, Disc, UserCheck, X, ListMusic } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { SongCard } from '../components/cards/SongCard';
import { tasteService } from '../services/tasteService';
import { playlistService } from '../services/playlistService';
import { TasteTunerModal } from '../components/modals/TasteTunerModal';
import { SpotifyImportModal } from '../components/modals/SpotifyImportModal';

interface LibraryPageProps {
  onOpenArtist?: (artistId: string, artistName: string) => void;
  onOpenPlaylist?: (playlistId: string) => void;
  openSpotifyModalDirectly?: boolean;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({
  onOpenArtist,
  onOpenPlaylist,
  openSpotifyModalDirectly,
}) => {
  const { likes, history, favoriteArtists, toggleFollowArtist } = useLibrary();
  const { playTrack } = usePlayer();
  const [activeTab, setActiveTab] = useState<'likes' | 'playlists' | 'artists' | 'history'>('likes');
  const [isTasteModalOpen, setIsTasteModalOpen] = useState(false);
  const [isSpotifyModalOpen, setIsSpotifyModalOpen] = useState(openSpotifyModalDirectly || false);

  const userPlaylists = playlistService.getPlaylists();

  const handlePlayAll = (tracks: typeof likes) => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  };

  const handleShuffle = (tracks: typeof likes) => {
    if (tracks.length > 0) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  return (
    <div id="library-page" className="px-4 pb-36 pt-4 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
          Library
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Your personal music collection, playlists & favorite artists
        </p>
      </div>

      {/* Spotify Import Banner Card */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-zinc-900/5 to-emerald-500/5 p-3.5 dark:bg-zinc-900/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1DB954] text-black shadow-sm">
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.899 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.019zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 C9.6 9.9 15 10.561 18.72 12.841c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.18-.1.2-1.02-.421-.18-.6.42-1.02 1.02-1.2 4.2-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white">
              Spotify Data Migration
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Transfer your saved songs, playlists, and listening history to MyMusic
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsSpotifyModalOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-[#1DB954] px-4 py-1.5 text-xs font-bold text-black shadow-xs hover:bg-[#1ed760] transition-transform active:scale-95 cursor-pointer"
        >
          <span>Import Spotify Data</span>
        </button>
      </div>

      {/* Tabs: [Liked Songs] [Playlists] [Favorite Artists] [Recently Played] */}
      <div className="flex gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('likes')}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
            activeTab === 'likes'
              ? 'bg-[#FA233B] text-white shadow-xs'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${activeTab === 'likes' ? 'fill-white' : ''}`} />
          <span>Liked Songs ({likes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('playlists')}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
            activeTab === 'playlists'
              ? 'bg-zinc-900 text-white shadow-xs dark:bg-white dark:text-zinc-950'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          <ListMusic className="h-3.5 w-3.5" />
          <span>Playlists ({userPlaylists.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('artists')}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
            activeTab === 'artists'
              ? 'bg-zinc-900 text-white shadow-xs dark:bg-white dark:text-zinc-950'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Favorite Artists ({favoriteArtists.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
            activeTab === 'history'
              ? 'bg-zinc-900 text-white shadow-xs dark:bg-white dark:text-zinc-950'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Recently Played ({history.length})</span>
        </button>
      </div>

      {/* LIKES VIEW */}
      {activeTab === 'likes' && (
        <div className="mt-4">
          {likes.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">
                {likes.length} {likes.length === 1 ? 'track' : 'tracks'}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => handlePlayAll(likes)}
                  className="flex items-center gap-1.5 rounded-full bg-[#FA233B] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#d91d32] transition-transform active:scale-95"
                >
                  <Play className="h-3 w-3 fill-current ml-0.5" />
                  Play All
                </button>
                <button
                  onClick={() => handleShuffle(likes)}
                  className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-4 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-200 transition-transform active:scale-95 dark:bg-zinc-800 dark:text-white"
                >
                  <Shuffle className="h-3 w-3" />
                  Shuffle
                </button>
              </div>
            </div>
          )}

          {likes.length > 0 ? (
            <div className="divide-y divide-zinc-100 rounded-2xl bg-zinc-50/50 p-2 dark:divide-zinc-800 dark:bg-zinc-900/40">
              {likes.map((track, idx) => (
                <SongCard
                  key={`${track.videoId}-${idx}`}
                  track={track}
                  index={idx}
                  queueContext={likes}
                  onArtistClick={onOpenArtist}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400">
              <Heart className="h-12 w-12 opacity-30 mb-3 text-[#FA233B]" />
              <h3 className="text-base font-semibold text-zinc-700 dark:text-zinc-200">
                No liked songs yet
              </h3>
              <p className="mt-1 text-xs text-zinc-400 max-w-xs">
                Tap the heart icon on any song to add it to your library and personalize your music recommendations.
              </p>
            </div>
          )}
        </div>
      )}

      {/* PLAYLISTS VIEW */}
      {activeTab === 'playlists' && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              {userPlaylists.length} {userPlaylists.length === 1 ? 'playlist' : 'playlists'}
            </span>

            <button
              onClick={() => setIsSpotifyModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-[#1DB954] hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Import Playlists</span>
            </button>
          </div>

          {userPlaylists.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {userPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => {
                    if (onOpenPlaylist) {
                      onOpenPlaylist(pl.id);
                    }
                  }}
                  className="group flex cursor-pointer items-center gap-3.5 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-3 transition-all hover:border-[#FA233B]/40 hover:bg-white hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-200 shadow-sm ring-1 ring-zinc-900/5 dark:bg-zinc-800 dark:ring-white/10">
                    <img
                      src={pl.artworkUrl && pl.artworkUrl.trim() !== '' ? pl.artworkUrl : 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop'}
                      alt={pl.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop';
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-zinc-950 dark:text-white group-hover:text-[#FA233B]">
                      {pl.title}
                    </h3>
                    <p className="truncate text-xs font-medium text-zinc-400">
                      {pl.tracks?.length || pl.trackCount || 0} songs • {pl.author || 'User'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400">
              <ListMusic className="h-12 w-12 opacity-30 mb-3 text-emerald-500" />
              <h3 className="text-base font-semibold text-zinc-700 dark:text-zinc-200">
                No playlists yet
              </h3>
              <p className="mt-1 text-xs text-zinc-400 max-w-xs">
                Import your playlists directly from your Spotify account export archive.
              </p>
              <button
                onClick={() => setIsSpotifyModalOpen(true)}
                className="mt-4 flex items-center gap-1.5 rounded-full bg-[#1DB954] px-4 py-2 text-xs font-bold text-black shadow-xs hover:bg-[#1ed760] transition-transform active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Import Spotify Data</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ARTISTS VIEW */}
      {activeTab === 'artists' && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              {favoriteArtists.length} {favoriteArtists.length === 1 ? 'followed artist' : 'followed artists'}
            </span>

            <button
              onClick={() => setIsTasteModalOpen(true)}
              className="flex items-center gap-1 text-xs font-bold text-[#FA233B] hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Artist</span>
            </button>
          </div>

          {favoriteArtists.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {favoriteArtists.map((artistName) => {
                const artworkUrl = tasteService.getArtistArtwork(artistName);

                return (
                  <div
                    key={artistName}
                    onClick={() => {
                      if (onOpenArtist) {
                        onOpenArtist(artistName, artistName);
                      }
                    }}
                    className="group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-3.5 transition-all hover:border-[#FA233B]/40 hover:bg-white hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:bg-zinc-900"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-zinc-200 dark:ring-zinc-800 bg-red-500/10">
                        {artworkUrl ? (
                          <img
                            src={artworkUrl}
                            alt={artistName}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[#FA233B]">
                            <Disc className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-zinc-950 dark:text-white group-hover:text-[#FA233B]">
                          {artistName}
                        </h3>
                        <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-400">
                          <UserCheck className="h-3 w-3 text-[#FA233B]" />
                          <span>Followed</span>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFollowArtist(artistName);
                      }}
                      title={`Unfollow ${artistName}`}
                      aria-label={`Unfollow ${artistName}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 opacity-70 transition-all hover:bg-zinc-200/80 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400">
              <Users className="h-12 w-12 opacity-30 mb-3" />
              <h3 className="text-base font-semibold text-zinc-700 dark:text-zinc-200">
                No followed artists yet
              </h3>
              <p className="mt-1 text-xs text-zinc-400 max-w-xs">
                Explore an artist page or search for your favorite musicians and tap Follow to keep track of their latest releases.
              </p>
              <button
                onClick={() => setIsTasteModalOpen(true)}
                className="mt-4 flex items-center gap-1.5 rounded-full bg-[#FA233B] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#d91d32] transition-transform active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Follow Artists</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* HISTORY VIEW */}
      {activeTab === 'history' && (
        <div className="mt-4">
          {history.length > 0 ? (
            <div className="divide-y divide-zinc-100 rounded-2xl bg-zinc-50/50 p-2 dark:divide-zinc-800 dark:bg-zinc-900/40">
              {history.map((track, idx) => (
                <SongCard
                  key={`${track.videoId}-${idx}`}
                  track={track}
                  index={idx}
                  queueContext={history}
                  onArtistClick={onOpenArtist}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-400">
              <Clock className="h-12 w-12 opacity-30 mb-3" />
              <h3 className="text-base font-semibold text-zinc-700 dark:text-zinc-200">
                No listening history yet
              </h3>
              <p className="mt-1 text-xs text-zinc-400 max-w-xs">
                Songs you play will automatically appear here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Taste Tuner Modal */}
      <TasteTunerModal
        isOpen={isTasteModalOpen}
        onClose={() => setIsTasteModalOpen(false)}
      />

      {/* Spotify Import Modal */}
      <SpotifyImportModal
        isOpen={isSpotifyModalOpen}
        onClose={() => setIsSpotifyModalOpen(false)}
      />
    </div>
  );
};
