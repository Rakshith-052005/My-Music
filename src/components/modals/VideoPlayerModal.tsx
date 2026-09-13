import React, { useEffect, useState } from 'react';
import { X, Play, Heart, SkipBack, SkipForward, ListVideo, Sparkles, ExternalLink } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { useLibrary } from '../../context/LibraryContext';
import { Track } from '../../types/music';

export const VideoPlayerModal: React.FC = () => {
  const { activeVideo, activeVideoQueue, closeVideo, playVideo } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();
  const [showQueue, setShowQueue] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeVideo();
      }
    };
    if (activeVideo) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeVideo, closeVideo]);

  if (!activeVideo) return null;

  const currentIndex = activeVideoQueue.findIndex((v) => v.videoId === activeVideo.videoId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < activeVideoQueue.length - 1;
  const isCurrentLiked = isLiked(activeVideo.videoId);

  const handlePrevious = () => {
    if (hasPrevious) {
      playVideo(activeVideoQueue[currentIndex - 1], activeVideoQueue);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      playVideo(activeVideoQueue[currentIndex + 1], activeVideoQueue);
    }
  };

  return (
    <div
      id="video-player-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
    >
      <div
        id="video-player-container"
        className="relative flex flex-col w-full max-w-5xl max-h-[95vh] rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden"
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <span className="flex items-center gap-1 rounded-md bg-[#FA233B] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              <Sparkles className="h-3 w-3" />
              Music Video
            </span>
            <div className="truncate">
              <h3 className="truncate text-sm font-bold text-white">
                {activeVideo.title}
              </h3>
              <p className="truncate text-xs text-zinc-400">
                {activeVideo.artist}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeVideoQueue.length > 1 && (
              <button
                type="button"
                onClick={() => setShowQueue((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  showQueue
                    ? 'bg-[#FA233B] text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                }`}
                aria-label="Toggle video queue"
              >
                <ListVideo className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Videos ({activeVideoQueue.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={closeVideo}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
              aria-label="Close video player"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Video Player & Queue Layout */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Main Video Viewport */}
          <div className="flex-1 flex flex-col justify-center bg-black min-h-[260px] sm:min-h-[380px] md:min-h-[460px]">
            <div className="relative w-full aspect-video">
              <iframe
                id="active-youtube-video-frame"
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.videoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>

            {/* Video Controls & Meta Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-t border-zinc-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleLike(activeVideo)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
                    isCurrentLiked
                      ? 'border-red-500/50 bg-red-500/20 text-red-500'
                      : 'border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700'
                  }`}
                  aria-label={isCurrentLiked ? 'Unlike video' : 'Like video'}
                >
                  <Heart className={`h-4 w-4 ${isCurrentLiked ? 'fill-red-500' : ''}`} />
                </button>

                <a
                  href={`https://www.youtube.com/watch?v=${activeVideo.videoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/80 px-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">YouTube</span>
                </a>
              </div>

              {/* Navigation across videos */}
              {activeVideoQueue.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!hasPrevious}
                    onClick={handlePrevious}
                    className="flex h-8 items-center gap-1 rounded-full bg-zinc-800 px-3 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <SkipBack className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Previous</span>
                  </button>

                  <span className="px-2 text-xs font-medium text-zinc-500">
                    {currentIndex + 1} / {activeVideoQueue.length}
                  </span>

                  <button
                    type="button"
                    disabled={!hasNext}
                    onClick={handleNext}
                    className="flex h-8 items-center gap-1 rounded-full bg-zinc-800 px-3 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <SkipForward className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Video Queue List (Side panel on desktop / collapsible) */}
          {showQueue && activeVideoQueue.length > 0 && (
            <div className="w-full lg:w-72 max-h-64 lg:max-h-none border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-900/90 overflow-y-auto p-3">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
                More Music Videos
              </h4>
              <div className="space-y-1.5">
                {activeVideoQueue.map((video, idx) => {
                  const isActive = video.videoId === activeVideo.videoId;
                  return (
                    <div
                      key={`modal-queue-vid-${video.videoId}-${idx}`}
                      onClick={() => playVideo(video, activeVideoQueue)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all ${
                        isActive
                          ? 'bg-red-500/15 border border-red-500/30'
                          : 'hover:bg-zinc-800/70 border border-transparent'
                      }`}
                    >
                      <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                        <img
                          src={video.artworkUrl || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`}
                          alt={video.title}
                          className="h-full w-full object-cover"
                        />
                        {isActive && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Play className="h-4 w-4 fill-white text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold truncate ${isActive ? 'text-[#FA233B]' : 'text-zinc-200'}`}>
                          {video.title}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {video.artist}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
