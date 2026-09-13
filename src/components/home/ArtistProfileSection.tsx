import React, { useEffect, useState } from 'react';
import { Play, Shuffle, CheckCircle, ChevronRight, Disc, Sparkles, UserPlus, UserCheck } from 'lucide-react';
import { Artist, Track, Album } from '../../types/music';
import { apiService } from '../../services/api';
import { usePlayer } from '../../context/PlayerContext';
import { useLibrary } from '../../context/LibraryContext';
import { SongCard } from '../cards/SongCard';
import { AlbumCard } from '../cards/AlbumCard';
import { PRESET_ARTISTS, tasteService } from '../../services/tasteService';

interface ArtistProfileSectionProps {
  initialArtistName?: string;
  initialArtistId?: string;
  favoriteArtists?: string[];
  onOpenArtist: (artistId: string, artistName: string) => void;
  onOpenAlbum: (albumId: string, album?: Album) => void;
}

export const ArtistProfileSection: React.FC<ArtistProfileSectionProps> = ({
  initialArtistName = 'The Weeknd',
  initialArtistId,
  favoriteArtists = [],
  onOpenArtist,
  onOpenAlbum,
}) => {
  const [selectedArtistName, setSelectedArtistName] = useState(initialArtistName);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const { playTrack } = usePlayer();
  const { isFollowingArtist, toggleFollowArtist } = useLibrary();

  const currentArtistName = artist?.name || selectedArtistName;
  const isFollowing = currentArtistName ? isFollowingArtist(currentArtistName) : false;

  const handleToggleFollow = () => {
    if (!currentArtistName) return;
    toggleFollowArtist(currentArtistName, artist?.artworkUrl);
  };

  // Find matching preset artist
  const getArtistChannelId = (name: string) => {
    const found = PRESET_ARTISTS.find((p) => p.name.toLowerCase() === name.toLowerCase());
    return found?.artistId || name;
  };

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const idToFetch = selectedArtistName === initialArtistName && initialArtistId
          ? initialArtistId
          : getArtistChannelId(selectedArtistName);

        let data = await apiService.getArtist(idToFetch);

        // Fallback: If direct artist lookup returned null or no songs, fetch artist catalog via search
        if (!data || !data.songs || data.songs.length === 0) {
          const searchResult = await apiService.search(`${selectedArtistName} top songs`, 'all');
          const presetMatch = PRESET_ARTISTS.find(
            (p) => p.name.toLowerCase() === selectedArtistName.toLowerCase()
          );

          if (searchResult.songs && searchResult.songs.length > 0) {
            data = {
              id: idToFetch || selectedArtistName,
              artistId: idToFetch || selectedArtistName,
              name: selectedArtistName,
              artworkUrl:
                presetMatch?.artworkUrl ||
                tasteService.getArtistArtwork(selectedArtistName) ||
                searchResult.artists[0]?.artworkUrl ||
                searchResult.songs[0]?.artworkUrl ||
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
              description: `Explore the music, popular tracks, and albums of ${selectedArtistName}.`,
              subscribers: '10M+',
              songs: searchResult.songs.slice(0, 15),
              albums: searchResult.albums || [],
              singles: [],
              provider: 'youtube_music',
            };
          }
        }

        if (isMounted && data) {
          setArtist(data);
        }
      } catch (err) {
        console.error('Failed to load artist profile:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [selectedArtistName, initialArtistId]);

  const handlePlayAll = () => {
    if (artist?.songs && artist.songs.length > 0) {
      playTrack(artist.songs[0], artist.songs);
    }
  };

  const handleShuffle = () => {
    if (artist?.songs && artist.songs.length > 0) {
      const shuffled = [...artist.songs].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  // Valid studio albums (deduplicated)
  const seenAlbumIds = new Set<string>();
  const validAlbums = (artist?.albums || []).filter((alb) => {
    if (!alb.albumId || alb.albumId.startsWith('VL') || alb.albumId.startsWith('PL') || alb.albumId.startsWith('RD')) {
      return false;
    }
    if (seenAlbumIds.has(alb.albumId)) return false;
    seenAlbumIds.add(alb.albumId);
    return true;
  });

  return (
    <section id="artist-profile-section" className="space-y-4 px-4 sm:px-6">
      {/* Header and Artist Selector Pills */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FA233B]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Featured Artist Profile</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-2xl">
            {artist?.name || selectedArtistName}
          </h2>
        </div>

        {/* Quick artist switcher chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {favoriteArtists.slice(0, 5).map((artistName) => {
            const isSelected = selectedArtistName.toLowerCase() === artistName.toLowerCase();
            return (
              <button
                key={artistName}
                onClick={() => {
                  setSelectedArtistName(artistName);
                  setIsBioExpanded(false);
                }}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-[#FA233B] text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                {artistName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4 rounded-3xl border border-zinc-200/70 bg-zinc-50/50 p-6 dark:border-zinc-800/70 dark:bg-zinc-900/40">
          <div className="flex items-center gap-4 animate-pulse">
            <div className="h-24 w-24 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3.5 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-64 rounded bg-zinc-100 dark:bg-zinc-800/60" />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/50" />
            ))}
          </div>
        </div>
      )}

      {/* Actual Artist Profile Card */}
      {!isLoading && artist && (
        <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-gradient-to-b from-zinc-50 to-white p-5 shadow-xs dark:border-zinc-800/80 dark:from-zinc-900/60 dark:to-zinc-950/60 sm:p-7">
          {/* Top Artist Bio Banner */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-full ring-4 ring-white shadow-lg dark:ring-zinc-800">
                <img
                  src={
                    artist.artworkUrl && artist.artworkUrl.trim() !== ''
                      ? artist.artworkUrl
                      : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop'
                  }
                  alt={artist.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#FA233B]">
                  <CheckCircle className="h-3.5 w-3.5 fill-current text-white" />
                  <span>Verified Artist</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-2xl">
                  {artist.name}
                </h3>
                {artist.subscribers && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {artist.subscribers} listeners
                  </p>
                )}
                {artist.description && (
                  <div className="mt-1">
                    <p
                      className={`text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-xl ${
                        isBioExpanded ? '' : 'line-clamp-2'
                      }`}
                    >
                      {artist.description}
                    </p>
                    {artist.description.length > 120 && (
                      <button
                        onClick={() => setIsBioExpanded(!isBioExpanded)}
                        className="mt-0.5 text-[11px] font-semibold text-[#FA233B] hover:underline"
                      >
                        {isBioExpanded ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Play, Shuffle, Follow & Full Profile Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              <button
                onClick={handlePlayAll}
                disabled={!artist.songs || artist.songs.length === 0}
                className="flex items-center gap-1.5 rounded-full bg-[#FA233B] px-4 py-2 text-xs font-bold text-white shadow-xs transition-transform hover:bg-[#D91B32] active:scale-95 disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                <span>Play All</span>
              </button>

              <button
                onClick={handleShuffle}
                disabled={!artist.songs || artist.songs.length === 0}
                className="flex items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 shadow-2xs transition-all hover:bg-zinc-100 active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                <Shuffle className="h-3.5 w-3.5" />
                <span>Shuffle</span>
              </button>

              <button
                onClick={handleToggleFollow}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 ${
                  isFollowing
                    ? 'border border-red-500/40 bg-red-500/10 text-[#FA233B] hover:bg-red-500/20 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-400'
                    : 'border border-zinc-200/80 bg-white text-zinc-800 shadow-2xs hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
                }`}
                aria-label={isFollowing ? `Unfollow ${currentArtistName}` : `Follow ${currentArtistName}`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="h-3.5 w-3.5 text-[#FA233B]" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Follow</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onOpenArtist(artist.artistId, artist.name)}
                className="flex items-center gap-1 rounded-full bg-zinc-100 px-3.5 py-2 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
              >
                <span>Full Profile</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Top Songs by this Artist */}
          {artist.songs && artist.songs.length > 0 && (
            <div className="mt-6 border-t border-zinc-200/60 pt-5 dark:border-zinc-800/60">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                  Top Songs
                </h4>
                <button
                  onClick={() => onOpenArtist(artist.artistId, artist.name)}
                  className="text-xs font-medium text-[#FA233B] hover:underline"
                >
                  See all {artist.songs.length}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {artist.songs.slice(0, 6).map((song, idx) => (
                  <SongCard
                    key={`artist-profile-song-${song.videoId || 'song'}-${idx}`}
                    track={song}
                    index={idx}
                    layout="row"
                    queueContext={artist.songs}
                    onArtistClick={onOpenArtist}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Studio Albums by this Artist */}
          {validAlbums.length > 0 && (
            <div className="mt-6 border-t border-zinc-200/60 pt-5 dark:border-zinc-800/60">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Disc className="h-4 w-4 text-[#FA233B]" />
                  <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                    Studio Albums & Releases
                  </h4>
                </div>
                <button
                  onClick={() => onOpenArtist(artist.artistId, artist.name)}
                  className="text-xs font-medium text-[#FA233B] hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar">
                {validAlbums.slice(0, 6).map((album, idx) => (
                  <AlbumCard
                    key={`artist-profile-album-${album.albumId || 'alb'}-${idx}`}
                    album={album}
                    onClick={onOpenAlbum}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fallback if artist could not be retrieved */}
      {!isLoading && !artist && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-200/80 bg-zinc-50/50 p-8 text-center dark:border-zinc-800/80 dark:bg-zinc-900/30">
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Artist profile for {selectedArtistName} is currently updating.
          </p>
          <button
            onClick={() => {
              setSelectedArtistName(favoriteArtists[0] || 'The Weeknd');
            }}
            className="mt-3 rounded-full bg-[#FA233B] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#D91B32] transition-colors"
          >
            Switch Artist
          </button>
        </div>
      )}
    </section>
  );
};
