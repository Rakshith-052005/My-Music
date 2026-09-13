import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Track } from '../types/music';
import { eventTracker } from '../services/eventTracker';
import { recommendationService } from '../services/recommendationService';
import { tasteService } from '../services/tasteService';
import { useLibrary } from './LibraryContext';

export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  manualQueue: Track[];
  suggestedQueue: Track[];
  historyQueue: Track[];
  currentIndex: number;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  isAutoplay: boolean;
  audioQuality: 'Lossless' | 'Hi-Res Lossless' | 'Dolby Atmos';
  isFullPlayerOpen: boolean;
  isQueueOpen: boolean;
  isLoading: boolean;
  isVideoMode: boolean;
  activeVideo: Track | null;
  activeVideoQueue: Track[];

  setIsVideoMode: (enabled: boolean) => void;
  playTrack: (track: Track, newQueue?: Track[]) => void;
  playVideo: (video: Track, newVideoQueue?: Track[]) => void;
  closeVideo: () => void;
  togglePlay: () => void;
  playNext: () => void;
  next: () => void; // alias
  playPrevious: () => void;
  previous: () => void; // alias
  seek: (seconds: number) => void;
  setVolume: (level: number) => void;
  toggleMute: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  cycleRepeatMode: () => void;
  toggleShuffle: () => void;
  toggleAutoplay: () => void;
  setAudioQuality: (quality: 'Lossless' | 'Hi-Res Lossless' | 'Dolby Atmos') => void;
  addToQueue: (track: Track) => void;
  addToManualQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  removeFromManualQueue: (index: number) => void;
  removeFromSuggestedQueue: (index: number) => void;
  clearQueue: () => void;
  clearManualQueue: () => void;
  clearSuggestedQueue: () => void;
  setIsFullPlayerOpen: (open: boolean) => void;
  setIsQueueOpen: (open: boolean) => void;
}

const PlayerContext = createContext<PlayerContextType>({} as PlayerContextType);

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { history } = useLibrary();

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [manualQueue, setManualQueue] = useState<Track[]>([]);
  const [suggestedQueue, setSuggestedQueue] = useState<Track[]>([]);
  const [historyQueue, setHistoryQueue] = useState<Track[]>([]);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isShuffle, setIsShuffle] = useState(false);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [activeVideo, setActiveVideo] = useState<Track | null>(null);
  const [activeVideoQueue, setActiveVideoQueue] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoplay, setIsAutoplay] = useState(tasteService.getPreferences().autoplayEnabled);
  const [audioQuality, setAudioQualityState] = useState<'Lossless' | 'Hi-Res Lossless' | 'Dolby Atmos'>(
    tasteService.getPreferences().audioQuality || 'Hi-Res Lossless'
  );

  // Unified full queue: currentTrack, then user-selected manualQueue, then suggestedQueue
  const queue = useMemo(() => {
    const list: Track[] = [];
    if (currentTrack) list.push(currentTrack);
    list.push(...manualQueue);
    list.push(...suggestedQueue);
    return list;
  }, [currentTrack, manualQueue, suggestedQueue]);

  const currentIndex = currentTrack ? 0 : -1;

  const toggleAutoplay = useCallback(() => {
    setIsAutoplay((prev) => {
      const next = !prev;
      tasteService.setAutoplay(next);
      return next;
    });
  }, []);

  const setAudioQuality = useCallback((quality: 'Lossless' | 'Hi-Res Lossless' | 'Dolby Atmos') => {
    setAudioQualityState(quality);
    tasteService.setAudioQuality(quality);
  }, []);

  // YouTube player reference
  const ytPlayerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const progressTimerRef = useRef<any>(null);
  const fetchingRecommendationsRef = useRef(false);

  // Dynamic Refs to resolve stale closure issues in YouTube IFrame API event listeners
  const handleTrackEndedRef = useRef<() => void>(() => {});
  const playNextRef = useRef<() => void>(() => {});

  // Initialize YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      initPlayer();
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    }

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  const initPlayer = () => {
    if (ytPlayerRef.current || !playerContainerRef.current) return;

    try {
      ytPlayerRef.current = new window.YT.Player('youtube-audio-player', {
        height: '0',
        width: '0',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(volume * 100);
          },
          onStateChange: (event: any) => {
            // YT.PlayerState.PLAYING = 1, PAUSED = 2, ENDED = 0, BUFFERING = 3
            if (event.data === 1) {
              setIsPlaying(true);
              setIsLoading(false);
              const dur = ytPlayerRef.current?.getDuration() || 0;
              if (dur > 0) setDuration(dur);
            } else if (event.data === 2) {
              setIsPlaying(false);
            } else if (event.data === 0) {
              handleTrackEndedRef.current();
            } else if (event.data === 3) {
              setIsLoading(true);
            }
          },
          onError: (err: any) => {
            console.warn('YouTube Player Error:', err);
            setIsLoading(false);
            // Skip to next track on unplayable error (e.g. video blocked or unavailable)
            playNextRef.current();
          },
        },
      });
    } catch (e) {
      console.error('Failed to initialize YouTube player instance:', e);
    }
  };

  // Progress monitoring loop
  useEffect(() => {
    if (isPlaying) {
      progressTimerRef.current = setInterval(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          try {
            const time = ytPlayerRef.current.getCurrentTime() || 0;
            const dur = ytPlayerRef.current.getDuration() || 0;
            setCurrentTime(time);
            if (dur > 0 && dur !== duration) {
              setDuration(dur);
            }
            if (currentTrack) {
              eventTracker.trackPlaybackProgress(time, dur || currentTrack.duration, currentTrack);
            }
          } catch {
            // Player might be re-buffering
          }
        }
      }, 500);
    } else {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    }

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [isPlaying, duration, currentTrack]);

  // Smart Queue: When fewer than 4 tracks remain in suggestedQueue, fetch recommendations
  useEffect(() => {
    if (currentTrack && suggestedQueue.length < 4 && !fetchingRecommendationsRef.current && isAutoplay) {
      fetchingRecommendationsRef.current = true;
      const knownTracks = [currentTrack, ...manualQueue, ...suggestedQueue];
      recommendationService
        .getSmartQueueTracks(currentTrack, knownTracks, history)
        .then((newTracks) => {
          if (newTracks && newTracks.length > 0) {
            setSuggestedQueue((prev) => {
              const existingIds = new Set([
                currentTrack?.videoId,
                ...manualQueue.map((t) => t.videoId),
                ...prev.map((t) => t.videoId),
              ]);
              const uniqueNew = newTracks.filter((t) => t.videoId && !existingIds.has(t.videoId));
              return [...prev, ...uniqueNew];
            });
          }
        })
        .catch((err) => console.warn('Smart queue extension error:', err))
        .finally(() => {
          fetchingRecommendationsRef.current = false;
        });
    }
  }, [suggestedQueue.length, manualQueue, currentTrack, history, isAutoplay]);

  const loadAndPlayTrack = (track: Track) => {
    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(track.duration || 0);
    setIsLoading(true);

    eventTracker.trackPlaybackStart(track);
    tasteService.registerUserAction(track, 'play');

    if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
      try {
        ytPlayerRef.current.loadVideoById(track.videoId);
        ytPlayerRef.current.playVideo();
      } catch (err) {
        console.warn('Could not load video via YT Player:', err);
      }
    }
  };

  const playTrack = useCallback(
    (track: Track, newQueue?: Track[]) => {
      if (currentTrack && currentTrack.videoId !== track.videoId) {
        setHistoryQueue((prev) => [...prev, currentTrack]);
      }

      if (newQueue && newQueue.length > 0) {
        // When playing from an album/playlist, populate suggestedQueue with rest of context
        // while preserving manualQueue (so user-selected songs play first!)
        const trackIndex = newQueue.findIndex((t) => t.videoId === track.videoId);
        const remainingContext =
          trackIndex !== -1
            ? newQueue.slice(trackIndex + 1)
            : newQueue.filter((t) => t.videoId !== track.videoId);
        setSuggestedQueue(remainingContext);
      } else {
        // Clear previous suggestions
        setSuggestedQueue([]);

        // Dynamically build smart genre & popularity recommendations in background
        recommendationService
          .buildGenreAndPopularityQueue(track, 20)
          .then((smartQueue) => {
            if (smartQueue && smartQueue.length > 0) {
              setSuggestedQueue((current) => {
                if (current.length === 0) {
                  const rest = smartQueue.filter((t) => t.videoId !== track.videoId);
                  return rest;
                }
                return current;
              });
            }
          })
          .catch((err) => {
            console.warn('Smart queue build error:', err);
          });
      }

      loadAndPlayTrack(track);
    },
    [currentTrack]
  );

  const playVideo = useCallback(
    (video: Track, newVideoQueue?: Track[]) => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {
          // ignore
        }
      }
      setIsPlaying(false);
      setCurrentTrack(video);
      setIsVideoMode(true);
      setIsFullPlayerOpen(true);
      setActiveVideo(video);
      if (newVideoQueue && newVideoQueue.length > 0) {
        const idx = newVideoQueue.findIndex((v) => v.videoId === video.videoId);
        const rest = idx !== -1 ? newVideoQueue.slice(idx + 1) : newVideoQueue.filter((v) => v.videoId !== video.videoId);
        setSuggestedQueue(rest);
        setActiveVideoQueue(newVideoQueue);
      } else {
        setSuggestedQueue([]);
        setActiveVideoQueue([video]);
      }
      eventTracker.trackPlaybackStart(video);
      tasteService.registerUserAction(video, 'play');
    },
    []
  );

  const closeVideo = useCallback(() => {
    setActiveVideo(null);
    setIsVideoMode(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (!currentTrack) {
      if (manualQueue.length > 0 || suggestedQueue.length > 0) {
        playNext();
      }
      return;
    }

    if (isPlaying) {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        ytPlayerRef.current.pauseVideo();
      }
      setIsPlaying(false);
    } else {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
        ytPlayerRef.current.playVideo();
      }
      setIsPlaying(true);
    }
  }, [currentTrack, isPlaying, manualQueue.length, suggestedQueue.length]);

  const playNext = useCallback(() => {
    if (currentTrack) {
      eventTracker.trackSkip(currentTrack, currentTime, duration);
      setHistoryQueue((prev) => [...prev, currentTrack]);
    }

    // Priority 1: User's manually added songs play first
    if (manualQueue.length > 0) {
      if (isShuffle) {
        const randIdx = Math.floor(Math.random() * manualQueue.length);
        const nextTrack = manualQueue[randIdx];
        setManualQueue((prev) => prev.filter((_, i) => i !== randIdx));
        loadAndPlayTrack(nextTrack);
      } else {
        const nextTrack = manualQueue[0];
        setManualQueue((prev) => prev.slice(1));
        loadAndPlayTrack(nextTrack);
      }
      return;
    }

    // Priority 2: System-suggested tracks
    if (suggestedQueue.length > 0) {
      if (isShuffle) {
        const randIdx = Math.floor(Math.random() * suggestedQueue.length);
        const nextTrack = suggestedQueue[randIdx];
        setSuggestedQueue((prev) => prev.filter((_, i) => i !== randIdx));
        loadAndPlayTrack(nextTrack);
      } else {
        const nextTrack = suggestedQueue[0];
        setSuggestedQueue((prev) => prev.slice(1));
        loadAndPlayTrack(nextTrack);
      }
      return;
    }

    // Priority 3: Loop if repeat mode is 'all'
    if (repeatMode === 'all' && historyQueue.length > 0) {
      const loopTrack = historyQueue[0];
      setHistoryQueue((prev) => prev.slice(1));
      loadAndPlayTrack(loopTrack);
      return;
    }

    // Priority 4: Continuous Playback — Auto-generate smart queue if currentTrack ended with no remaining queue
    if (currentTrack) {
      recommendationService
        .buildGenreAndPopularityQueue(currentTrack, 10)
        .then((smartQueue) => {
          const remaining = smartQueue.filter((t) => t.videoId !== currentTrack.videoId);
          if (remaining.length > 0) {
            const nextTrack = remaining[0];
            setSuggestedQueue(remaining.slice(1));
            loadAndPlayTrack(nextTrack);
          } else {
            setIsPlaying(false);
          }
        })
        .catch(() => setIsPlaying(false));
      return;
    }

    // End of queue
    setIsPlaying(false);
  }, [currentTrack, currentTime, duration, manualQueue, suggestedQueue, isShuffle, repeatMode, historyQueue]);

  const playPrevious = useCallback(() => {
    // If more than 3 seconds in, restart track
    if (currentTime > 3) {
      seek(0);
      if (currentTrack) eventTracker.trackReplay(currentTrack);
      return;
    }

    if (historyQueue.length > 0) {
      const prevTrack = historyQueue[historyQueue.length - 1];
      setHistoryQueue((prev) => prev.slice(0, -1));
      if (currentTrack) {
        // Prepend current track to manualQueue so skipping forward goes right back to it
        setManualQueue((prev) => [currentTrack, ...prev]);
      }
      loadAndPlayTrack(prevTrack);
    }
  }, [currentTime, historyQueue, currentTrack]);

  const handleTrackEnded = useCallback(() => {
    if (repeatMode === 'one' && currentTrack) {
      seek(0);
      ytPlayerRef.current?.playVideo();
      eventTracker.trackReplay(currentTrack);
    } else {
      playNext();
    }
  }, [repeatMode, currentTrack, playNext]);

  // Keep callback refs updated to avoid stale closures in YouTube API event listeners
  useEffect(() => {
    handleTrackEndedRef.current = handleTrackEnded;
  }, [handleTrackEnded]);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  const seek = useCallback((seconds: number) => {
    setCurrentTime(seconds);
    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(seconds, true);
    }
  }, []);

  const setVolume = useCallback((level: number) => {
    const clamped = Math.max(0, Math.min(1, level));
    setVolumeState(clamped);
    setIsMuted(clamped === 0);
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      ytPlayerRef.current.setVolume(clamped * 100);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(volume || 0.85);
    } else {
      setIsMuted(true);
      if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
        ytPlayerRef.current.setVolume(0);
      }
    }
  }, [isMuted, volume, setVolume]);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setManualQueue((prev) => [...prev, track]);
    eventTracker.trackAddToQueue(track);
    if (!currentTrack) {
      loadAndPlayTrack(track);
      setManualQueue((prev) => prev.slice(1));
    }
  }, [currentTrack]);

  const addToManualQueue = addToQueue;

  const removeFromManualQueue = useCallback((index: number) => {
    setManualQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeFromSuggestedQueue = useCallback((index: number) => {
    setSuggestedQueue((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    if (index === 0) {
      playNext();
      return;
    }
    const adjustedIndex = index - 1;
    if (adjustedIndex < manualQueue.length) {
      removeFromManualQueue(adjustedIndex);
    } else {
      const suggestedIndex = adjustedIndex - manualQueue.length;
      removeFromSuggestedQueue(suggestedIndex);
    }
  }, [manualQueue.length, playNext, removeFromManualQueue, removeFromSuggestedQueue]);

  const clearManualQueue = useCallback(() => {
    setManualQueue([]);
  }, []);

  const clearSuggestedQueue = useCallback(() => {
    setSuggestedQueue([]);
  }, []);

  const clearQueue = useCallback(() => {
    setManualQueue([]);
    setSuggestedQueue([]);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        queue,
        manualQueue,
        suggestedQueue,
        historyQueue,
        currentIndex,
        currentTime,
        duration,
        volume,
        isMuted,
        repeatMode,
        isShuffle,
        isAutoplay,
        audioQuality,
        isFullPlayerOpen,
        isQueueOpen,
        isLoading,
        isVideoMode,
        activeVideo,
        activeVideoQueue,
        setIsVideoMode,
        playTrack,
        playVideo,
        closeVideo,
        togglePlay,
        playNext,
        next: playNext, // alias
        playPrevious,
        previous: playPrevious, // alias
        seek,
        setVolume,
        toggleMute,
        setRepeatMode,
        cycleRepeatMode,
        toggleShuffle,
        toggleAutoplay,
        setAudioQuality,
        addToQueue,
        addToManualQueue,
        removeFromQueue,
        removeFromManualQueue,
        removeFromSuggestedQueue,
        clearQueue,
        clearManualQueue,
        clearSuggestedQueue,
        setIsFullPlayerOpen,
        setIsQueueOpen,
      }}
    >
      {/* Invisible YouTube Player container */}
      <div
        ref={playerContainerRef}
        id="youtube-player-wrapper"
        aria-hidden="true"
        className="pointer-events-none fixed bottom-0 right-0 h-1 w-1 opacity-0 z-0"
      >
        <div id="youtube-audio-player" />
      </div>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);
