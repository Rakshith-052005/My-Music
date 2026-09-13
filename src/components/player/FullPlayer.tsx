import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  MoreHorizontal,
  Shuffle,
  Repeat,
  Repeat1,
  Volume1,
  Volume2,
  VolumeX,
  ListMusic,
  Quote,
  Mic2,
  Headphones,
  Check,
  Sparkles,
  Video,
} from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { useLibrary } from '../../context/LibraryContext';
import { formatDuration, getHighResArtwork, cleanArtistName, cleanAlbumTitle } from '../../utils/trackHelper';
import { lyricsService } from '../../services/lyricsService';
import { apiService } from '../../services/api';
import { LyricLine } from '../../types/music';
import { SyncedLyrics } from './SyncedLyrics';
import { AudioBlueprintModal } from '../modals/AudioBlueprintModal';

interface FullPlayerProps {
  onOpenArtist?: (artistId: string, artistName: string) => void;
}

export const FullPlayer: React.FC<FullPlayerProps> = ({ onOpenArtist }) => {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    playNext,
    playPrevious,
    currentTime,
    duration,
    seek,
    volume,
    setVolume,
    toggleMute,
    isMuted,
    repeatMode,
    cycleRepeatMode,
    isShuffle,
    toggleShuffle,
    audioQuality,
    setAudioQuality,
    isFullPlayerOpen,
    setIsFullPlayerOpen,
    setIsQueueOpen,
    isLoading,
    isVideoMode,
    setIsVideoMode,
    playVideo,
  } = usePlayer();

  const { isLiked, toggleLike } = useLibrary();
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [showMoreModal, setShowMoreModal] = useState(false);
  const [showBlueprintModal, setShowBlueprintModal] = useState(false);
  const [isSingActive, setIsSingActive] = useState(false);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [hasTimestamps, setHasTimestamps] = useState<boolean>(true);
  const [lyricsSource, setLyricsSource] = useState<string | null>(null);
  const [isLyricsLoading, setIsLyricsLoading] = useState<boolean>(false);
  const [lyricsMessage, setLyricsMessage] = useState<string | null>(null);

  // Video Mode States & Fetcher
  const [resolvedVideoId, setResolvedVideoId] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (currentTrack && isVideoMode) {
      setIsVideoLoading(true);
      setVideoError(null);

      // Search for the actual official music video
      const query = `${currentTrack.title} ${currentTrack.artist} official music video`;
      apiService
        .search(query, 'all')
        .then((res) => {
          if (!isMounted) return;
          setIsVideoLoading(false);
          // Find best matching song / video
          const match =
            (res.songs || []).find((s) => s.videoId && s.videoId !== currentTrack.videoId) ||
            (res.songs || []).find((s) => s.videoId) ||
            null;

          if (match?.videoId) {
            setResolvedVideoId(match.videoId);
          } else if (currentTrack.videoId) {
            setResolvedVideoId(currentTrack.videoId);
          } else {
            setVideoError('No official music video found');
          }
        })
        .catch(() => {
          if (!isMounted) return;
          setIsVideoLoading(false);
          if (currentTrack.videoId) {
            setResolvedVideoId(currentTrack.videoId);
          } else {
            setVideoError('Could not fetch music video');
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [currentTrack?.videoId, currentTrack?.title, currentTrack?.artist, isVideoMode]);

  useEffect(() => {
    let isMounted = true;
    if (currentTrack) {
      setIsLyricsLoading(true);
      setLyrics([]);
      setLyricsMessage(null);
      setLyricsSource(null);

      lyricsService
        .getLyricsForTrack(currentTrack)
        .then((res) => {
          if (!isMounted) return;
          setIsLyricsLoading(false);
          if (res.hasLyrics && res.lyrics && res.lyrics.length > 0) {
            setLyrics(res.lyrics);
            setHasTimestamps(res.hasTimestamps ?? true);
            setLyricsSource(res.source || null);
            setLyricsMessage(null);
          } else {
            setLyrics([]);
            setHasTimestamps(false);
            setLyricsSource(null);
            setLyricsMessage(res.message || 'Lyrics not available for this song');
          }
        })
        .catch(() => {
          if (!isMounted) return;
          setIsLyricsLoading(false);
          setLyrics([]);
          setLyricsMessage('Lyrics not available for this song');
        });
    } else {
      setLyrics([]);
      setLyricsSource(null);
      setLyricsMessage(null);
      setIsLyricsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [currentTrack?.id, currentTrack?.videoId, currentTrack?.title, currentTrack?.artist]);

  if (!isFullPlayerOpen || !currentTrack) return null;

  const liked = isLiked(currentTrack);
  const displayTime = isSeeking ? seekValue : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;
  const remainingTime = duration > displayTime ? duration - displayTime : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeekValue(parseFloat(e.target.value));
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekEnd = () => {
    setIsSeeking(false);
    seek(seekValue);
  };

  const artworkSrc = getHighResArtwork(currentTrack.artworkUrl, currentTrack.videoId);
  const fallbackArtworkSrc = currentTrack.videoId
    ? `https://i.ytimg.com/vi/${currentTrack.videoId}/hqdefault.jpg`
    : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=600&fit=crop';

  const artistName = cleanArtistName(currentTrack.artist, currentTrack.title);
  const albumName = cleanAlbumTitle(currentTrack.album, currentTrack.title, artistName);

  return (
    <div
      id="full-player-modal"
      className="fixed inset-0 z-50 overflow-hidden bg-zinc-950 text-white antialiased animate-in slide-in-from-bottom duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] select-none"
    >
      {/* Dynamic Background Artwork Blur (Authentic Apple Music Mesh Blur) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img
          src={artworkSrc}
          alt=""
          className="h-full w-full object-cover filter blur-[100px] scale-150 opacity-40 transition-all duration-1000 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/85 via-black/45 to-black/80" />
      </div>

      {/* ========================================================================= */}
      {/* 1. LAPTOP / DESKTOP RESPONSIVE VIEW - lg:flex */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex flex-col h-full w-full max-w-7xl mx-auto px-6 lg:px-10 py-4 relative z-10 justify-between overflow-hidden">
        {/* Top Header: Close 'X' Button on Top-Left */}
        <div className="flex items-center justify-start shrink-0">
          <button
            onClick={() => setIsFullPlayerOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors active:scale-95"
            aria-label="Close full player"
            title="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Dual Column Layout: Left Player, Right Synced Lyrics */}
        <div className="grid grid-cols-12 gap-6 lg:gap-12 items-center flex-1 my-auto w-full min-h-0 overflow-hidden py-2">
          {/* LEFT COLUMN: Large Artwork, Track Info, Scrubber, Controls, Volume */}
          <div className="col-span-5 flex flex-col justify-center max-w-[380px] lg:max-w-[420px] ml-auto mr-0 w-full space-y-3 lg:space-y-5">
            {/* Artwork / Music Video Showcase */}
            <div className="relative aspect-square w-full max-w-[320px] lg:max-w-[380px] rounded-2xl lg:rounded-3xl overflow-hidden shadow-[0_25px_65px_-15px_rgba(0,0,0,0.85)] ring-1 ring-white/10 group bg-zinc-900 mx-auto">
              {isVideoMode ? (
                <div className="h-full w-full relative flex items-center justify-center bg-black">
                  {isVideoLoading ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <div className="flex items-center gap-1.5">
                        <span className="h-3 w-1 bg-[#FA233B] rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-6 w-1 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-4 w-1 bg-[#FA233B] rounded-full animate-bounce" />
                      </div>
                      <p className="text-xs font-semibold text-white/90">Fetching Official Music Video...</p>
                      <p className="text-[11px] text-white/50">{currentTrack.title} • {currentTrack.artist}</p>
                    </div>
                  ) : resolvedVideoId ? (
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${resolvedVideoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1`}
                      title={`${currentTrack.title} Official Music Video`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="h-full w-full border-0 object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-white/70">
                      <Video className="h-10 w-10 text-white/40 mb-2" />
                      <p className="text-sm font-medium">{videoError || 'No video stream found'}</p>
                      <button
                        onClick={() => setIsVideoMode(false)}
                        className="mt-3 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20 text-white"
                      >
                        Switch back to Album Art
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="relative h-full w-full cursor-pointer group/art overflow-hidden"
                  onClick={togglePlay}
                >
                  <img
                    src={artworkSrc}
                    alt={currentTrack.title}
                    loading="eager"
                    decoding="async"
                    onError={(e) => {
                      if (e.currentTarget.src !== fallbackArtworkSrc) {
                        e.currentTarget.src = fallbackArtworkSrc;
                      }
                    }}
                    className="h-full w-full object-cover select-none transition-transform duration-700 ease-out group-hover/art:scale-105"
                    draggable={false}
                  />
                </div>
              )}
            </div>

            {/* Track Info Row */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-2xl font-bold tracking-tight text-white">
                  {currentTrack.title}
                </h1>
                <p className="truncate text-base font-medium text-white/70 mt-0.5">
                  <button
                    onClick={() => {
                      const targetArtistId = currentTrack.artistId || artistName;
                      if (targetArtistId && onOpenArtist) {
                        setIsFullPlayerOpen(false);
                        onOpenArtist(targetArtistId, artistName);
                      }
                    }}
                    className="hover:underline hover:text-white transition-colors cursor-pointer"
                  >
                    {artistName}
                  </button>
                  {albumName && (
                    <span className="text-white/50"> — {albumName}</span>
                  )}
                </p>
              </div>

              {/* Heart / Favorite & More Options */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleLike(currentTrack)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-90"
                  aria-label={liked ? 'Remove from Favorites' : 'Add to Favorites'}
                  title="Favorite"
                >
                  <Heart
                    className={`h-5 w-5 ${
                      liked ? 'fill-[#FA233B] text-[#FA233B]' : 'text-white/70'
                    }`}
                  />
                </button>
                <button
                  onClick={() => setShowMoreModal(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-90 text-white/70 hover:text-white"
                  aria-label="More options"
                  title="More"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scrubber / Progress Bar */}
            <div>
              <div className="relative flex items-center">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={1}
                  value={displayTime}
                  onChange={handleSeekChange}
                  onMouseDown={handleSeekStart}
                  onMouseUp={handleSeekEnd}
                  onTouchStart={handleSeekStart}
                  onTouchEnd={handleSeekEnd}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-white outline-none"
                  style={{
                    background: `linear-gradient(to right, white ${progressPercent}%, rgba(255,255,255,0.25) ${progressPercent}%)`,
                  }}
                  aria-label="Seek position"
                />
              </div>
              <div className="mt-2 flex justify-between text-xs tabular-nums text-white/60">
                <span>{formatDuration(displayTime)}</span>
                <span>-{formatDuration(remainingTime)}</span>
              </div>
            </div>

            {/* Playback Controls Row */}
            <div className="flex items-center justify-between px-1">
              <button
                onClick={toggleShuffle}
                className={`p-2 transition-colors ${
                  isShuffle ? 'text-white' : 'text-white/40 hover:text-white'
                }`}
                title="Shuffle"
                aria-label="Toggle shuffle"
              >
                <Shuffle className="h-5 w-5" />
              </button>

              <button
                onClick={playPrevious}
                className="p-3 text-white/80 hover:text-white transition-transform active:scale-90"
                aria-label="Previous track"
              >
                <SkipBack className="h-7 w-7 fill-current" />
              </button>

              <button
                onClick={togglePlay}
                disabled={isLoading}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-zinc-950 shadow-2xl transition-transform hover:scale-105 active:scale-95"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isLoading ? (
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                ) : isPlaying ? (
                  <Pause className="h-8 w-8 fill-current" />
                ) : (
                  <Play className="h-8 w-8 fill-current ml-1" />
                )}
              </button>

              <button
                onClick={playNext}
                className="p-3 text-white/80 hover:text-white transition-transform active:scale-90"
                aria-label="Next track"
              >
                <SkipForward className="h-7 w-7 fill-current" />
              </button>

              <button
                onClick={cycleRepeatMode}
                className={`p-2 transition-colors ${
                  repeatMode !== 'off' ? 'text-white' : 'text-white/40 hover:text-white'
                }`}
                title={`Repeat: ${repeatMode}`}
                aria-label="Cycle repeat mode"
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="h-5 w-5" />
                ) : (
                  <Repeat className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Volume & Bottom Actions Row (Queue & Lyrics integrated right below controls) */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={toggleMute}
                className="text-white/60 hover:text-white transition-colors shrink-0"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume1 className="h-4 w-4" />
                )}
              </button>
              <div className="relative flex items-center flex-1">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="h-1 w-full cursor-pointer appearance-none rounded-full accent-white outline-none"
                  style={{
                    background: `linear-gradient(to right, white ${volume * 100}%, rgba(255,255,255,0.25) ${volume * 100}%)`,
                  }}
                  aria-label="Volume slider"
                />
              </div>

              {/* Action Buttons: Lyrics, Music Video, and Queue */}
              <div className="flex items-center gap-1.5 shrink-0 pl-1">
                <button
                  onClick={() => setShowLyrics((prev) => !prev)}
                  className={`flex items-center justify-center h-8 w-8 rounded-lg transition-all active:scale-95 ${
                    showLyrics
                      ? 'bg-white text-zinc-950 shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  aria-label="Toggle lyrics"
                  title="Time-Synced Lyrics"
                >
                  <Quote className="h-4 w-4 rotate-180" />
                </button>
                <button
                  onClick={() => setIsVideoMode((prev) => !prev)}
                  className={`flex items-center justify-center h-8 w-8 rounded-lg transition-all active:scale-95 ${
                    isVideoMode
                      ? 'bg-[#FA233B] text-white shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  title={isVideoMode ? 'Switch to Album Cover' : 'Watch Official Music Video'}
                  aria-label="Watch Music Video"
                >
                  <Video className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsQueueOpen(true)}
                  className="flex items-center justify-center h-8 w-8 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                  title="Playing Next"
                  aria-label="Queue"
                >
                  <ListMusic className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Apple Music Synced Scrolling Lyrics (Image 1) */}
          <div className="col-span-7 flex flex-col h-full justify-center pl-6 xl:pl-10 min-w-0 overflow-hidden">
            {showLyrics ? (
              <div className="flex flex-col h-full justify-center min-w-0 w-full overflow-hidden">
                {isLyricsLoading ? (
                  <div className="flex flex-col items-start justify-center py-24 space-y-4">
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-1 bg-white/70 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-6 w-1 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-4 w-1 bg-white/70 rounded-full animate-bounce" />
                    </div>
                    <p className="text-sm font-semibold text-white/60">
                      Loading lyrics from YouTube Music...
                    </p>
                  </div>
                ) : lyrics.length > 0 ? (
                  <>
                    <SyncedLyrics
                      lines={lyrics}
                      currentTime={currentTime}
                      seek={seek}
                      align="left"
                      variant="desktop"
                      hasTimestamps={hasTimestamps}
                    />
                    {lyricsSource && (
                      <div className="pt-6 pb-2 border-t border-white/10 mt-4 text-left">
                        <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">
                          {lyricsSource}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-24 text-left space-y-2">
                    <p className="text-2xl font-bold text-white/80">
                      {lyricsMessage || 'Lyrics not available for this song'}
                    </p>
                    <p className="text-sm text-white/40">
                      No synchronized lyrics were provided for this track.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[420px] text-center space-y-4">
                <Quote className="h-16 w-16 text-white/20 rotate-180" />
                <p className="text-xl font-semibold text-white/60">Lyrics hidden</p>
                <button
                  onClick={() => setShowLyrics(true)}
                  className="rounded-full bg-white/10 hover:bg-white/20 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
                >
                  Show Synced Lyrics
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MOBILE & TABLET RESPONSIVE VIEW - lg:hidden */}
      {/* ========================================================================= */}
      <div className="lg:hidden flex flex-col justify-between h-full w-full max-w-md sm:max-w-xl mx-auto px-5 sm:px-8 pt-3 pb-6 sm:pb-8 relative z-10 overflow-y-auto sm:overflow-hidden">
        {showLyrics ? (
          /* MOBILE LYRICS VIEW (Exact replicate of Image 2) */
          <>
            {/* Top Bar: Mini Track Info (Album Cover + Song Name + Artist) & Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-1 pb-2">
              {/* Mini Album Cover Artwork + Song Name + Artist Name */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-zinc-900 shadow-md ring-1 ring-white/10">
                  <img
                    src={artworkSrc}
                    alt={currentTrack.title}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      if (e.currentTarget.src !== fallbackArtworkSrc) {
                        e.currentTarget.src = fallbackArtworkSrc;
                      }
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-white">
                    {currentTrack.title}
                  </h3>
                  <p className="truncate text-xs font-medium text-white/70">
                    <button
                      onClick={() => {
                        const targetArtistId = currentTrack.artistId || artistName;
                        if (targetArtistId && onOpenArtist) {
                          setIsFullPlayerOpen(false);
                          onOpenArtist(targetArtistId, artistName);
                        }
                      }}
                      className="hover:underline hover:text-white transition-colors cursor-pointer"
                    >
                      {artistName}
                    </button>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleLike(currentTrack)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-90"
                  aria-label={liked ? 'Remove from Favorites' : 'Add to Favorites'}
                >
                  <Heart
                    className={`h-5 w-5 ${
                      liked ? 'fill-[#FA233B] text-[#FA233B]' : 'text-white/70'
                    }`}
                  />
                </button>
                <button
                  onClick={() => setShowMoreModal(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-90 text-white/70 hover:text-white"
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setIsFullPlayerOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:text-white transition-colors"
                  aria-label="Close full player"
                >
                  <ChevronDown className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Center Area: Full Scrolling Lyrics (Image 2) */}
            <div className="relative flex-1 flex flex-col justify-center my-auto min-h-0">
              {isLyricsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-1 bg-white/70 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-6 w-1 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-4 w-1 bg-white/70 rounded-full animate-bounce" />
                  </div>
                  <p className="text-xs font-semibold text-white/60">
                    Loading lyrics from YouTube Music...
                  </p>
                </div>
              ) : lyrics.length > 0 ? (
                <div className="flex-1 flex flex-col justify-center overflow-hidden">
                  <SyncedLyrics
                    lines={lyrics}
                    currentTime={currentTime}
                    seek={seek}
                    align="left"
                    variant="mobile"
                    hasTimestamps={hasTimestamps}
                  />
                  {lyricsSource && (
                    <div className="pt-3 pb-1 border-t border-white/10 mt-2 text-center">
                      <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
                        {lyricsSource}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center space-y-2">
                  <p className="text-lg font-bold text-white/80">
                    {lyricsMessage || 'Lyrics not available for this song'}
                  </p>
                  <p className="text-xs text-white/40">
                    No synchronized lyrics were provided on YouTube Music.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Controls Area (Image 2) */}
            <div className="space-y-2.5 sm:space-y-4 pt-1">
              {/* Scrubber Bar */}
              <div>
                <div className="relative flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={1}
                    value={displayTime}
                    onChange={handleSeekChange}
                    onMouseDown={handleSeekStart}
                    onMouseUp={handleSeekEnd}
                    onTouchStart={handleSeekStart}
                    onTouchEnd={handleSeekEnd}
                    className="h-1 w-full cursor-pointer appearance-none rounded-full accent-white outline-none"
                    style={{
                      background: `linear-gradient(to right, white ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`,
                    }}
                    aria-label="Seek position"
                  />
                </div>
                <div className="mt-1 flex justify-between text-[11px] tabular-nums text-white/60">
                  <span>{formatDuration(displayTime)}</span>
                  <span>-{formatDuration(remainingTime)}</span>
                </div>
              </div>

              {/* Playback Controls (Image 2: SkipBack, Play/Pause, SkipForward) */}
              <div className="flex items-center justify-center gap-10 sm:gap-12 py-0.5">
                <button
                  onClick={playPrevious}
                  className="p-2 text-white hover:text-white/80 transition-transform active:scale-90"
                  aria-label="Previous track"
                >
                  <SkipBack className="h-6 w-6 sm:h-7 sm:w-7 fill-current" />
                </button>

                <button
                  onClick={togglePlay}
                  disabled={isLoading}
                  className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isLoading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : isPlaying ? (
                    <Pause className="h-9 w-9 sm:h-10 sm:w-10 fill-current" />
                  ) : (
                    <Play className="h-9 w-9 sm:h-10 sm:w-10 fill-current ml-1" />
                  )}
                </button>

                <button
                  onClick={playNext}
                  className="p-2 text-white hover:text-white/80 transition-transform active:scale-90"
                  aria-label="Next track"
                >
                  <SkipForward className="h-6 w-6 sm:h-7 sm:w-7 fill-current" />
                </button>
              </div>

              {/* Volume Slider (Image 2) */}
              <div className="flex items-center gap-2.5 px-2">
                <button
                  onClick={toggleMute}
                  className="text-white/60 hover:text-white transition-colors"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume1 className="h-4 w-4" />
                  )}
                </button>
                <div className="relative flex items-center w-full">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="h-1 w-full cursor-pointer appearance-none rounded-full accent-white outline-none"
                    style={{
                      background: `linear-gradient(to right, white ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%)`,
                    }}
                    aria-label="Volume slider"
                  />
                </div>
                <Volume2 className="h-4 w-4 text-white/60" />
              </div>

              {/* Bottom Dock Toolbar (Image 2: Lyrics, Video, Queue) */}
              <div className="flex items-center justify-between pt-1 sm:pt-2 px-4 sm:px-6">
                {/* Lyrics Button - Active in Image 2 */}
                <button
                  onClick={() => setShowLyrics(false)}
                  className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/20 text-white shadow-sm transition-all active:scale-90"
                  title="Switch to Artwork view"
                  aria-label="Switch to Artwork view"
                >
                  <Quote className="h-5 w-5 rotate-180" />
                </button>

                {/* Music Video Button */}
                <button
                  onClick={() => {
                    setShowLyrics(false);
                    setIsVideoMode(true);
                  }}
                  className={`flex items-center justify-center h-10 w-10 rounded-xl transition-all active:scale-90 ${
                    isVideoMode
                      ? 'bg-[#FA233B] text-white shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  title="Watch Music Video"
                  aria-label="Watch Music Video"
                >
                  <Video className="h-5 w-5" />
                </button>

                {/* Queue / Playing Next Button (Image 2) */}
                <button
                  onClick={() => setIsQueueOpen(true)}
                  className="flex items-center justify-center h-10 w-10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-90"
                  title="Playing Next"
                  aria-label="Queue"
                >
                  <ListMusic className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* MOBILE ARTWORK VIEW (When lyrics are toggled off) */
          <>
            {/* Top Bar with Collapse */}
            <div className="flex items-center justify-between pt-1 pb-1 shrink-0">
              <button
                onClick={() => setIsFullPlayerOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:text-white active:scale-95"
                aria-label="Collapse player"
              >
                <ChevronDown className="h-7 w-7" />
              </button>

              <button
                onClick={() => setShowMoreModal(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:text-white active:scale-95"
                aria-label="More options"
              >
                <MoreHorizontal className="h-6 w-6" />
              </button>
            </div>

            {/* Artwork / Music Video Showcase */}
            <div className="flex-1 flex items-center justify-center my-auto min-h-0 w-full py-2 sm:py-3">
              <div className="relative aspect-square w-[86vw] sm:w-[75vw] max-w-[340px] sm:max-w-[380px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85)] ring-1 ring-white/10 mx-auto bg-zinc-900 group">
                {isVideoMode ? (
                  <div className="h-full w-full relative flex items-center justify-center bg-black">
                    {isVideoLoading ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                        <div className="flex items-center gap-1.5">
                          <span className="h-3 w-1 bg-[#FA233B] rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="h-6 w-1 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="h-4 w-1 bg-[#FA233B] rounded-full animate-bounce" />
                        </div>
                        <p className="text-xs font-semibold text-white/90">Fetching Official Music Video...</p>
                        <p className="text-[10px] text-white/50">{currentTrack.title} • {currentTrack.artist}</p>
                      </div>
                    ) : resolvedVideoId ? (
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${resolvedVideoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1`}
                        title={`${currentTrack.title} Official Music Video`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="h-full w-full border-0 object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-center text-white/70">
                        <Video className="h-9 w-9 text-white/40 mb-2" />
                        <p className="text-xs font-medium">{videoError || 'No video stream found'}</p>
                        <button
                          onClick={() => setIsVideoMode(false)}
                          className="mt-3 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20 text-white"
                        >
                          Switch to Album Art
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="relative h-full w-full cursor-pointer group/mobileart overflow-hidden"
                    onClick={togglePlay}
                  >
                    <img
                      src={artworkSrc}
                      alt={currentTrack.title}
                      loading="eager"
                      decoding="async"
                      onError={(e) => {
                        if (e.currentTarget.src !== fallbackArtworkSrc) {
                          e.currentTarget.src = fallbackArtworkSrc;
                        }
                      }}
                      className="h-full w-full object-cover select-none transition-transform duration-700 ease-out group-hover/mobileart:scale-105"
                      draggable={false}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Title, Scrubber & Controls */}
            <div className="space-y-3 sm:space-y-4 w-full max-w-[340px] sm:max-w-[380px] mx-auto shrink-0 pb-1">
              {/* Title & Artist */}
              <div className="flex items-center justify-between w-full px-1">
                <div className="min-w-0 flex-1 pr-3">
                  <h2 className="truncate text-xl sm:text-2xl font-bold tracking-tight text-white">
                    {currentTrack.title}
                  </h2>
                  <p className="truncate text-sm sm:text-base font-semibold text-white/80 mt-0.5">
                    <button
                      onClick={() => {
                        const targetArtistId = currentTrack.artistId || artistName;
                        if (targetArtistId && onOpenArtist) {
                          setIsFullPlayerOpen(false);
                          onOpenArtist(targetArtistId, artistName);
                        }
                      }}
                      className="hover:underline hover:text-white transition-colors cursor-pointer"
                    >
                      {artistName}
                    </button>
                    {albumName && (
                      <span className="text-white/50 font-normal"> — {albumName}</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => toggleLike(currentTrack)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white active:scale-90 shrink-0"
                  aria-label="Favorite"
                >
                  <Heart
                    className={`h-5 w-5 ${
                      liked ? 'fill-[#FA233B] text-[#FA233B]' : 'text-white/70'
                    }`}
                  />
                </button>
              </div>

              {/* Scrubber */}
              <div>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={1}
                  value={displayTime}
                  onChange={handleSeekChange}
                  onMouseDown={handleSeekStart}
                  onMouseUp={handleSeekEnd}
                  onTouchStart={handleSeekStart}
                  onTouchEnd={handleSeekEnd}
                  className="h-1 w-full cursor-pointer appearance-none rounded-full accent-white outline-none"
                  style={{
                    background: `linear-gradient(to right, white ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`,
                  }}
                />
                <div className="mt-1 flex justify-between text-[11px] tabular-nums text-white/60">
                  <span>{formatDuration(displayTime)}</span>
                  <span>-{formatDuration(remainingTime)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between px-2 sm:px-3">
                <button
                  onClick={toggleShuffle}
                  className={`p-2 ${isShuffle ? 'text-white' : 'text-white/40'}`}
                >
                  <Shuffle className="h-5 w-5" />
                </button>
                <button
                  onClick={playPrevious}
                  className="p-2 text-white active:scale-90"
                >
                  <SkipBack className="h-7 w-7 fill-current" />
                </button>
                <button
                  onClick={togglePlay}
                  className="flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-white text-zinc-950 shadow-xl active:scale-95"
                >
                  {isPlaying ? (
                    <Pause className="h-7 w-7 fill-current" />
                  ) : (
                    <Play className="h-7 w-7 fill-current ml-0.5" />
                  )}
                </button>
                <button
                  onClick={playNext}
                  className="p-2 text-white active:scale-90"
                >
                  <SkipForward className="h-7 w-7 fill-current" />
                </button>
                <button
                  onClick={cycleRepeatMode}
                  className={`p-2 ${repeatMode !== 'off' ? 'text-white' : 'text-white/40'}`}
                >
                  {repeatMode === 'one' ? (
                    <Repeat1 className="h-5 w-5" />
                  ) : (
                    <Repeat className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-2.5 px-2">
                <Volume1 className="h-4 w-4 text-white/60" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="h-1 w-full cursor-pointer appearance-none rounded-full accent-white outline-none"
                  style={{
                    background: `linear-gradient(to right, white ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%)`,
                  }}
                />
                <Volume2 className="h-4 w-4 text-white/60" />
              </div>

              {/* Bottom Dock Toolbar */}
              <div className="flex items-center justify-between pt-1 sm:pt-2 px-4 sm:px-6">
                <button
                  onClick={() => setShowLyrics(true)}
                  className="flex items-center justify-center h-10 w-10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 active:scale-90"
                  title="Switch to Lyrics view"
                >
                  <Quote className="h-5 w-5 rotate-180" />
                </button>
                <button
                  onClick={() => setIsVideoMode((prev) => !prev)}
                  className={`flex items-center justify-center h-10 w-10 rounded-xl transition-all active:scale-90 ${
                    isVideoMode
                      ? 'bg-[#FA233B] text-white shadow-md'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                  title={isVideoMode ? 'Switch to Album Cover' : 'Watch Music Video'}
                  aria-label="Watch Music Video"
                >
                  <Video className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setIsQueueOpen(true)}
                  className="flex items-center justify-center h-10 w-10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 active:scale-90"
                >
                  <ListMusic className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. APPLE MUSIC MORE OPTIONS ACTION SHEET / MODAL */}
      {/* ========================================================================= */}
      {showMoreModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-2xl text-left">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <img
                src={artworkSrc}
                alt=""
                className="h-12 w-12 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-white truncate">
                  {currentTrack.title}
                </h4>
                <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <button
                onClick={() => {
                  toggleLike(currentTrack);
                  setShowMoreModal(false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                <span>{liked ? 'Remove from Favorites' : 'Add to Favorites'}</span>
                <Heart
                  className={`h-4 w-4 ${
                    liked ? 'fill-[#FA233B] text-[#FA233B]' : 'text-zinc-400'
                  }`}
                />
              </button>

              {currentTrack.artistId && onOpenArtist && (
                <button
                  onClick={() => {
                    setShowMoreModal(false);
                    setIsFullPlayerOpen(false);
                    onOpenArtist(currentTrack.artistId!, currentTrack.artist);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
                >
                  <span>Go to Artist</span>
                </button>
              )}

              <button
                onClick={() => {
                  setShowMoreModal(false);
                  setShowQualityModal(true);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                <span>Audio Quality</span>
                <span className="text-xs text-zinc-400"> {audioQuality}</span>
              </button>

              <button
                onClick={() => {
                  setShowMoreModal(false);
                  setShowBlueprintModal(true);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#FA233B]" />
                  <span>Audio Blueprint & AI Tags</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded">
                  AI
                </span>
              </button>

              <button
                onClick={() => {
                  setShowMoreModal(false);
                  setShowLyrics(false);
                  setIsVideoMode((prev) => !prev);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-[#FA233B]" />
                  <span>{isVideoMode ? 'Switch to Album Artwork' : 'Watch Official Music Video'}</span>
                </div>
                <span className="text-xs text-white/50">{isVideoMode ? 'Active' : 'Video'}</span>
              </button>

              <button
                onClick={() => {
                  setShowMoreModal(false);
                  setIsQueueOpen(true);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                <span>View Playing Next Queue</span>
                <ListMusic className="h-4 w-4 text-zinc-400" />
              </button>
            </div>

            <button
              onClick={() => setShowMoreModal(false)}
              className="mt-4 w-full rounded-full bg-zinc-800 py-2.5 text-xs font-bold text-zinc-200 hover:bg-zinc-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. QUALITY SETTINGS MODAL */}
      {/* ========================================================================= */}
      {showQualityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl text-left">
            <h3 className="text-lg font-bold text-white">Apple Music Audio Quality</h3>
            <p className="mt-1 text-xs text-zinc-400">
              Lossless streaming preserves all details of the original studio recording.
            </p>

            <div className="mt-5 space-y-2">
              {(['Lossless', 'Hi-Res Lossless', 'Dolby Atmos'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setAudioQuality(q);
                    setShowQualityModal(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-2xl p-3.5 text-sm font-semibold transition-all ${
                    audioQuality === q
                      ? 'bg-white text-zinc-950 shadow-md font-bold'
                      : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <span> {q}</span>
                  {audioQuality === q && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowQualityModal(false)}
              className="mt-6 w-full rounded-full bg-zinc-800 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. AUDIO BLUEPRINT & AI VECTOR MODAL */}
      {/* ========================================================================= */}
      {currentTrack && (
        <AudioBlueprintModal
          track={currentTrack}
          isOpen={showBlueprintModal}
          onClose={() => setShowBlueprintModal(false)}
        />
      )}
    </div>
  );
};
