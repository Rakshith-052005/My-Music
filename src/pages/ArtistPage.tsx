import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, Shuffle, CheckCircle, Disc, UserPlus, UserCheck, Video, Heart } from 'lucide-react';
import { Artist, Track, Album } from '../types/music';
import { apiService } from '../services/api';
import { deduplicateArtistTracks } from '../utils/trackHelper';
import { SongCard } from '../components/cards/SongCard';
import { AlbumCard } from '../components/cards/AlbumCard';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';
import { eventTracker } from '../services/eventTracker';

interface ArtistCarouselSectionProps {
  idPrefix: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const ArtistCarouselSection: React.FC<ArtistCarouselSectionProps> = ({
  idPrefix,
  title,
  icon,
  children,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 8);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 8);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(checkScroll, 120);
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScroll);
    };
  }, [children, checkScroll]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -380 : 380;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkScroll, 350);
    }
  };

  return (
    <section className="relative px-4 sm:px-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id={`${idPrefix}-scroll-left`}
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200/80 bg-white text-zinc-700 shadow-xs transition-all hover:bg-zinc-100 disabled:opacity-25 disabled:pointer-events-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 active:scale-95"
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            id={`${idPrefix}-scroll-right`}
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200/80 bg-white text-zinc-700 shadow-xs transition-all hover:bg-zinc-100 disabled:opacity-25 disabled:pointer-events-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 active:scale-95"
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative group/carousel">
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto pb-2 scroll-smooth no-scrollbar"
        >
          {children}
        </div>
      </div>
    </section>
  );
};

interface ArtistPageProps {
  artistId: string;
  artistName?: string;
  onBack: () => void;
  onOpenAlbum: (albumId: string, album?: Album) => void;
}

export const ArtistPage: React.FC<ArtistPageProps> = ({
  artistId,
  artistName = 'Artist',
  onBack,
  onOpenAlbum,
}) => {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [artistVideos, setArtistVideos] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { playTrack, playVideo } = usePlayer();
  const { isFollowingArtist, toggleFollowArtist, toggleLike, isLiked } = useLibrary();

  const currentArtistName = artist?.name || artistName;
  const isFollowing = currentArtistName ? isFollowingArtist(currentArtistName) : false;

  const handleToggleFollow = () => {
    if (!currentArtistName) return;
    toggleFollowArtist(currentArtistName, artist?.artworkUrl);
  };

  useEffect(() => {
    loadArtist();
    eventTracker.trackOpenArtist(artistId, artistName);
  }, [artistId]);

  const loadArtist = async () => {
    setIsLoading(true);
    setError(null);
    setArtistVideos([]);
    try {
      let data = await apiService.getArtist(artistId, artistName);

      // Verification: If returned artist name does not match requested artistName, re-fetch using artistName
      if (
        data &&
        artistName &&
        artistName.toLowerCase() !== 'artist' &&
        !data.name.toLowerCase().includes(artistName.toLowerCase()) &&
        !artistName.toLowerCase().includes(data.name.toLowerCase())
      ) {
        data = await apiService.getArtist(artistName, artistName);
      }

      if ((!data || !data.songs || data.songs.length === 0) && artistName) {
        data = await apiService.getArtist(artistName, artistName);
      }
      if (data) {
        setArtist(data);
      } else {
        // Fallback: search for songs by this artist
        const searchResults = await apiService.search(artistName, 'all');
        data = {
          id: artistId,
          artistId: artistId,
          name: artistName,
          artworkUrl: searchResults.artists[0]?.artworkUrl || '',
          songs: searchResults.songs,
          albums: searchResults.albums,
          provider: 'youtube_music',
        };
        setArtist(data);
      }

      // Proactively fetch official music videos for this artist
      const targetName = data.name || artistName;
      if (data.videos && data.videos.length > 0) {
        setArtistVideos(data.videos);
      } else {
        try {
          const videoSearch = await apiService.search(`${targetName} official music video`, 'all');
          const matchedVideos = (videoSearch.songs || []).slice(0, 10).map((v) => ({
            ...v,
            artworkUrl: v.videoId ? `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg` : v.artworkUrl,
          }));
          if (matchedVideos.length > 0) {
            setArtistVideos(matchedVideos);
          } else if (data.songs && data.songs.length > 0) {
            // Fallback from top songs formatted with video thumbnails
            setArtistVideos(
              data.songs.slice(0, 8).map((s) => ({
                ...s,
                artworkUrl: s.videoId ? `https://i.ytimg.com/vi/${s.videoId}/hqdefault.jpg` : s.artworkUrl,
              }))
            );
          }
        } catch (vErr) {
          console.warn('Video fetch fallback:', vErr);
        }
      }
    } catch (err) {
      console.error('Failed to load artist:', err);
      setError('Could not load artist profile.');
    } finally {
      setIsLoading(false);
    }
  };

  // Deduplicate songs to strictly prevent repeat video API tracks from duplicating top audio songs
  const { uniqueSongs: deduplicatedSongs, musicVideos: extractedVideos } = deduplicateArtistTracks(artist?.songs || []);
  const displaySongs = deduplicatedSongs.length > 0 ? deduplicatedSongs : (artist?.songs || []);
  const displayVideos =
    artistVideos.length > 0
      ? artistVideos
      : (artist?.videos && artist.videos.length > 0)
      ? artist.videos
      : extractedVideos.length > 0
      ? extractedVideos
      : displaySongs.slice(0, 6).map((s) => ({
          ...s,
          artworkUrl: s.videoId ? `https://i.ytimg.com/vi/${s.videoId}/hqdefault.jpg` : s.artworkUrl,
        }));

  const handlePlayAll = () => {
    if (displaySongs.length > 0) {
      playTrack(displaySongs[0], displaySongs);
    }
  };

  const handleShuffle = () => {
    if (displaySongs.length > 0) {
      const shuffled = [...displaySongs].sort(() => Math.random() - 0.5);
      playTrack(shuffled[0], shuffled);
    }
  };

  // Filter actual albums: strictly exclude playlist IDs (VL, PL, RD) and deduplicate by albumId
  const seenAlbumIds = new Set<string>();
  const actualAlbums = (artist?.albums || []).filter((alb) => {
    if (!alb.albumId || alb.albumId.startsWith('VL') || alb.albumId.startsWith('PL') || alb.albumId.startsWith('RD')) {
      return false;
    }
    if (seenAlbumIds.has(alb.albumId)) return false;
    seenAlbumIds.add(alb.albumId);
    return true;
  });

  const seenSingleIds = new Set<string>();
  const actualSingles = (artist?.singles || []).filter((single) => {
    if (!single.albumId || seenAlbumIds.has(single.albumId) || seenSingleIds.has(single.albumId)) {
      return false;
    }
    seenSingleIds.add(single.albumId);
    return true;
  });

  return (
    <div id="artist-page" className="pb-48 pt-2">
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
          <div className="h-48 w-full rounded-3xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800/60" />
            ))}
          </div>
        </div>
      )}

      {!isLoading && artist && (
        <div className="space-y-8">
          {/* Artist Hero Header */}
          <div className="relative overflow-hidden px-4 sm:px-6">
            <div className="relative flex flex-col sm:flex-row items-center gap-6 rounded-3xl bg-gradient-to-b from-zinc-100 to-white p-6 dark:from-zinc-900 dark:to-zinc-950 border border-zinc-200/60 dark:border-zinc-800/60">
              <div className="relative h-36 w-36 sm:h-44 sm:w-44 shrink-0 overflow-hidden rounded-full ring-4 ring-white shadow-xl dark:ring-zinc-800">
                <img
                  src={artist.artworkUrl && artist.artworkUrl.trim() !== '' ? artist.artworkUrl : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop'}
                  alt={artist.name || 'Artist'}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#FA233B]">
                  <CheckCircle className="h-4 w-4 fill-current text-white" />
                  <span>Verified Artist</span>
                </div>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                  {artist.name}
                </h1>
                {artist.subscribers && (
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {artist.subscribers} listeners
                  </p>
                )}

                {/* Actions: Play, Shuffle, and Follow */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 sm:justify-start sm:gap-3">
                  <button
                    onClick={handlePlayAll}
                    disabled={displaySongs.length === 0}
                    className="flex items-center gap-2 rounded-full bg-[#FA233B] px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-[#d91d32] transition-transform active:scale-95 disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Play
                  </button>

                  <button
                    onClick={handleShuffle}
                    disabled={displaySongs.length === 0}
                    className="flex items-center gap-2 rounded-full bg-zinc-100 px-5 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-200 transition-transform active:scale-95 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 disabled:opacity-50"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    Shuffle
                  </button>

                  <button
                    id="artist-follow-btn"
                    onClick={handleToggleFollow}
                    className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition-all active:scale-95 ${
                      isFollowing
                        ? 'border border-red-500/40 bg-red-500/10 text-[#FA233B] hover:bg-red-500/20 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-400'
                        : 'border border-zinc-200 bg-white text-zinc-900 shadow-2xs hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700'
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
                </div>
              </div>
            </div>
          </div>

          {/* Popular Songs (Deduplicated with distinct titles) */}
          {displaySongs.length > 0 && (
            <section className="px-4 sm:px-6">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white mb-3">
                Top Songs
              </h2>
              <div className="divide-y divide-zinc-100 rounded-2xl bg-zinc-50/60 p-2 dark:divide-zinc-800 dark:bg-zinc-900/40">
                {displaySongs.slice(0, 10).map((song, idx) => (
                  <SongCard
                    key={`artist-song-${song.videoId || 'song'}-${idx}`}
                    track={song}
                    index={idx}
                    queueContext={displaySongs}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Actual Albums Section (Strictly validated) */}
          {actualAlbums.length > 0 && (
            <ArtistCarouselSection
              idPrefix="artist-albums"
              title="Albums"
              icon={<Disc className="h-5 w-5 text-[#FA233B]" />}
            >
              {actualAlbums.map((album, idx) => (
                <AlbumCard
                  key={`artist-album-${album.albumId || 'alb'}-${idx}`}
                  album={album}
                  onClick={onOpenAlbum}
                />
              ))}
            </ArtistCarouselSection>
          )}

          {/* Singles & EPs */}
          {actualSingles.length > 0 && (
            <ArtistCarouselSection
              idPrefix="artist-singles"
              title="Singles & EPs"
            >
              {actualSingles.map((single, idx) => (
                <AlbumCard
                  key={`artist-single-${single.albumId || 'single'}-${idx}`}
                  album={single}
                  onClick={onOpenAlbum}
                />
              ))}
            </ArtistCarouselSection>
          )}

          {/* Music Videos Section */}
          {displayVideos.length > 0 && (
            <ArtistCarouselSection
              idPrefix="artist-videos"
              title="Music Videos"
              icon={<Video className="h-5 w-5 text-[#FA233B]" />}
            >
              {displayVideos.map((video, idx) => {
                const isVideoLiked = isLiked(video.videoId);
                return (
                  <div
                    key={`artist-video-${video.videoId || 'vid'}-${idx}`}
                    id={`artist-video-card-${video.videoId || idx}`}
                    onClick={() => playVideo(video, displayVideos)}
                    className="group relative flex w-60 shrink-0 cursor-pointer flex-col sm:w-68"
                  >
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-100 shadow-sm transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-md dark:bg-zinc-800">
                      <img
                        src={video.artworkUrl || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`}
                        alt={video.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          if (video.videoId) {
                            (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black/25 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

                      {/* Video Badge */}
                      <span className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-xs">
                        <Video className="h-3 w-3 text-[#FA233B]" />
                        Video
                      </span>

                      {/* Like Video Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(video);
                        }}
                        className={`absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 ${
                          isVideoLiked
                            ? 'bg-red-500/90 text-white opacity-100 shadow-md'
                            : 'bg-black/50 text-white/90 opacity-0 group-hover:opacity-100 hover:bg-black/70 hover:scale-110'
                        }`}
                        aria-label={isVideoLiked ? `Unlike ${video.title}` : `Like ${video.title}`}
                      >
                        <Heart className={`h-4 w-4 ${isVideoLiked ? 'fill-white' : ''}`} />
                      </button>

                      {/* Play Video Button */}
                      <button
                        type="button"
                        className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#FA233B] text-white shadow-xl opacity-0 translate-y-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-110 active:scale-95"
                        aria-label={`Play music video ${video.title}`}
                      >
                        <Play className="h-4 w-4 fill-white ml-0.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-col">
                      <span className="truncate text-sm font-semibold tracking-tight text-zinc-900 group-hover:text-[#FA233B] dark:text-white">
                        {video.title}
                      </span>
                      <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {video.artist} • Music Video
                      </span>
                    </div>
                  </div>
                );
              })}
            </ArtistCarouselSection>
          )}

          {/* Description / About Section (Positioned in last) */}
          {artist.description && (
            <section className="px-4 sm:px-6">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-2">About</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
                {artist.description}
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
