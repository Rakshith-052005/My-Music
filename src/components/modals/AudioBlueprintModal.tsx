import React, { useEffect, useState } from 'react';
import { X, Sparkles, Activity, Music, Flame, Zap, Compass, Tag, Check, RefreshCw } from 'lucide-react';
import { Track, SongAudioBlueprint } from '../../types/music';
import { apiService } from '../../services/api';

interface AudioBlueprintModalProps {
  track: Track;
  isOpen: boolean;
  onClose: () => void;
}

export const AudioBlueprintModal: React.FC<AudioBlueprintModalProps> = ({
  track,
  isOpen,
  onClose,
}) => {
  const [blueprint, setBlueprint] = useState<SongAudioBlueprint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !track) return;
    let isMounted = true;
    setIsLoading(true);

    apiService
      .getTrackBlueprint(track.title, track.artist, track.album || 'Pop')
      .then((data) => {
        if (isMounted && data) {
          setBlueprint(data);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, track]);

  if (!isOpen) return null;

  const handleCopyJson = () => {
    if (!blueprint) return;
    navigator.clipboard.writeText(JSON.stringify(blueprint, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-2xl text-left flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#FA233B] to-purple-600 text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Audio Blueprint & Vector Tags</h3>
              <p className="text-[11px] text-zinc-400">Acoustic taxonomy powered by Gemini</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-4 no-scrollbar">
          {/* Track Summary */}
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 border border-white/5">
            <img
              src={track.artworkUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&h=100&fit=crop'}
              alt={track.title}
              className="h-11 w-11 rounded-xl object-cover ring-1 ring-white/10"
            />
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white truncate">{track.title}</h4>
              <p className="text-[11px] text-white/60 truncate">{track.artist}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <RefreshCw className="h-6 w-6 text-[#FA233B] animate-spin" />
              <p className="text-xs font-semibold text-white/70">Analyzing acoustic dimensions...</p>
            </div>
          ) : blueprint ? (
            <>
              {/* Numeric Dimensions Progress Bars */}
              <div className="space-y-3 rounded-2xl bg-black/40 p-4 border border-white/10">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Acoustic Vectors (0.0 — 1.0)
                </h5>

                {/* Energy */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Flame className="h-3.5 w-3.5 text-amber-500" />
                      Energy
                    </span>
                    <span className="font-mono text-[#FA233B]">{blueprint.energy.toFixed(2)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round(blueprint.energy * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Danceability */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Zap className="h-3.5 w-3.5 text-purple-400" />
                      Danceability
                    </span>
                    <span className="font-mono text-purple-400">{blueprint.danceability.toFixed(2)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round(blueprint.danceability * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Acousticness */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Music className="h-3.5 w-3.5 text-emerald-400" />
                      Acousticness
                    </span>
                    <span className="font-mono text-emerald-400">{blueprint.acousticness.toFixed(2)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round(blueprint.acousticness * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Valence */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-white mb-1">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Compass className="h-3.5 w-3.5 text-sky-400" />
                      Valence (Positiveness)
                    </span>
                    <span className="font-mono text-sky-400">{blueprint.valence.toFixed(2)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round(blueprint.valence * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Mood Tags & Micro Genres */}
              <div className="space-y-3">
                <div>
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                    <Activity className="h-3 w-3 text-[#FA233B]" />
                    Cultural Mood Tags
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {blueprint.mood_tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 border border-white/5"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                    <Tag className="h-3 w-3 text-purple-400" />
                    Micro-Genre Classifications
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {blueprint.micro_genres.map((genre, idx) => (
                      <span
                        key={idx}
                        className="rounded-full bg-purple-500/15 px-2.5 py-1 text-[11px] font-semibold text-purple-300 border border-purple-500/20"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-zinc-400 py-6 text-center">Unable to load blueprint analysis.</p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/10 flex items-center gap-2">
          {blueprint && (
            <button
              onClick={handleCopyJson}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-green-400">JSON Copied</span>
                </>
              ) : (
                <>
                  <span>Copy Vector JSON</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-white py-2.5 text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
