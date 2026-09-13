import React from 'react';
import { X, Trash2, Sparkles, Music2, ListPlus } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { SongCard } from '../cards/SongCard';

export const QueueModal: React.FC = () => {
  const {
    currentTrack,
    manualQueue,
    suggestedQueue,
    queue,
    isQueueOpen,
    setIsQueueOpen,
    removeFromManualQueue,
    removeFromSuggestedQueue,
    clearQueue,
    clearManualQueue,
    playTrack,
  } = usePlayer();

  if (!isQueueOpen) return null;

  return (
    <div
      id="queue-modal"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => setIsQueueOpen(false)}
    >
      <div
        className="relative flex max-h-[85vh] w-full flex-col rounded-t-3xl border-t border-zinc-200/50 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:mx-auto sm:max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Playing Next</h2>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {queue.length} {queue.length === 1 ? 'track' : 'tracks'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(manualQueue.length > 0 || suggestedQueue.length > 0) && (
              <button
                onClick={clearQueue}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-500 hover:text-red-500 transition-colors"
                title="Clear queue"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
            <button
              onClick={() => setIsQueueOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              aria-label="Close queue"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Queue List Scrollable Area */}
        <div className="flex-1 overflow-y-auto py-3 space-y-5">
          {/* Current Playing */}
          {currentTrack && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#FA233B]">
                Now Playing
              </span>
              <div className="mt-1">
                <SongCard track={currentTrack} />
              </div>
            </div>
          )}

          {/* User's Manual Queue (Higher Priority) */}
          {manualQueue.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <ListPlus className="h-3.5 w-3.5 text-[#FA233B]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                    Next in Queue ({manualQueue.length})
                  </span>
                </div>
                <button
                  onClick={clearManualQueue}
                  className="text-[11px] text-zinc-400 hover:text-red-500 transition-colors"
                >
                  Clear manual
                </button>
              </div>

              <div className="space-y-1">
                {manualQueue.map((track, idx) => (
                  <div key={`manual-${track.videoId}-${idx}`} className="group relative">
                    <SongCard
                      track={track}
                      index={idx}
                      onPlay={() => playTrack(track)}
                    />
                    <button
                      onClick={() => removeFromManualQueue(idx)}
                      className="absolute right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-opacity"
                      title="Remove from queue"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Recommendations & Autoplay */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                {manualQueue.length > 0 ? 'Followed by Recommendations' : 'Up Next'}
              </span>
              <div className="flex items-center gap-1 text-[11px] text-[#FA233B]">
                <Sparkles className="h-3 w-3" />
                <span>Genre & Popularity Match</span>
              </div>
            </div>

            <div className="space-y-1">
              {suggestedQueue.length > 0 ? (
                suggestedQueue.map((track, idx) => (
                  <div key={`suggested-${track.videoId}-${idx}`} className="group relative">
                    <SongCard
                      track={track}
                      index={idx}
                      onPlay={() => playTrack(track)}
                    />
                    <button
                      onClick={() => removeFromSuggestedQueue(idx)}
                      className="absolute right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-opacity"
                      title="Remove recommendation"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-zinc-400">
                  <Music2 className="h-7 w-7 opacity-40 mb-1.5" />
                  <p className="text-xs font-medium">Smart Queue will automatically recommend tracks</p>
                  <p className="text-[11px] text-zinc-500">Continuous genre and popularity-based matching</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
