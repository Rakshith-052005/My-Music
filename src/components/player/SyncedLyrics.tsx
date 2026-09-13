import React, { useMemo, useEffect, useRef } from 'react';
import { LyricLine } from '../../types/music';

/**
 * Parses raw LRC string into a sorted array of LyricLine objects.
 * Matches timestamps like [01:15.50] or [01:15:500]
 */
export function parseLRC(lrcContent: string): LyricLine[] {
  if (!lrcContent || typeof lrcContent !== 'string') return [];

  const timeTagRegex = /\[(\d{1,3}):(\d{2})(?:[\.:](\d{2,3}))?\]/g;
  const lines = lrcContent.split('\n');
  const result: LyricLine[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Find all time tags in this line
    const matches = Array.from(trimmed.matchAll(timeTagRegex));
    if (matches.length === 0) continue;

    const text = trimmed.replace(timeTagRegex, '').trim();

    for (const match of matches) {
      const minutes = parseInt(match[1], 10) || 0;
      const seconds = parseInt(match[2], 10) || 0;
      const msStr = match[3] || '0';
      const fraction = msStr.length === 3 ? parseInt(msStr, 10) / 1000 : parseInt(msStr, 10) / 100;
      const totalSeconds = minutes * 60 + seconds + fraction;

      if (text) {
        result.push({
          time: totalSeconds,
          text,
        });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

interface SyncedLyricsProps {
  lines: LyricLine[] | string;
  currentTime: number;
  seek: (time: number) => void;
  align?: 'left' | 'center';
  variant?: 'desktop' | 'mobile';
  className?: string;
  hasTimestamps?: boolean;
}

export const SyncedLyrics: React.FC<SyncedLyricsProps> = ({
  lines: rawLines,
  currentTime,
  seek,
  align = 'left',
  variant = 'desktop',
  className = '',
  hasTimestamps = true,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 1. Normalize and parse lines
  const lines: LyricLine[] = useMemo(() => {
    if (typeof rawLines === 'string') {
      return parseLRC(rawLines);
    }
    return Array.isArray(rawLines) ? rawLines : [];
  }, [rawLines]);

  // 2. Active Index Calculation based on currentTime
  const activeIdx = useMemo(() => {
    if (!lines || lines.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (currentTime >= lines[i].time) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [lines, currentTime]);

  // 4. Smooth Centering & Auto-Scroll Animation with smooth physics
  useEffect(() => {
    if (activeIdx >= 0 && scrollContainerRef.current && hasTimestamps) {
      const scrollParent = scrollContainerRef.current;
      const activeEl = scrollParent.children[activeIdx] as HTMLElement;

      if (activeEl) {
        const activeTop = activeEl.offsetTop;
        const activeHeight = activeEl.offsetHeight;
        const parentHeight = scrollParent.clientHeight;
        const targetScrollTop = activeTop - parentHeight / 2 + activeHeight / 2;

        scrollParent.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth',
        });
      }
    }
  }, [activeIdx, hasTimestamps]);

  if (!lines || lines.length === 0) {
    return null;
  }

  const isDesktop = variant === 'desktop';

  return (
    <div
      ref={scrollContainerRef}
      className={`overflow-y-auto overflow-x-hidden no-scrollbar select-text w-full max-w-full ${
        align === 'center' ? 'text-center' : 'text-left'
      } ${
        isDesktop
          ? 'px-4 py-16 space-y-7 max-h-[560px]'
          : 'px-3 py-10 space-y-6 flex-1 max-h-[50vh]'
      } ${className}`}
      style={{
        maskImage:
          'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
      }}
    >
      {lines.map((line, idx) => {
        const isActive = hasTimestamps && idx === activeIdx;
        const isPassed = hasTimestamps && activeIdx >= 0 && idx < activeIdx;
        const isUpcoming = hasTimestamps && (activeIdx === -1 || idx > activeIdx);

        // Visual Styling & Typography with refined weights and smooth transition
        let stateClasses = '';
        if (isActive) {
          stateClasses =
            'text-white font-bold opacity-100 drop-shadow-[0_2px_18px_rgba(255,255,255,0.35)] translate-x-1 sm:translate-x-1.5';
        } else if (isPassed) {
          stateClasses = 'text-white/40 font-semibold opacity-60 hover:opacity-85 translate-x-0';
        } else if (isUpcoming) {
          stateClasses = 'text-white/20 font-medium opacity-40 hover:opacity-65 translate-x-0';
        } else {
          stateClasses = 'text-white/80 font-medium translate-x-0';
        }

        const sizeClasses = isDesktop
          ? isActive
            ? 'text-2xl xl:text-3xl leading-snug'
            : 'text-xl xl:text-2xl leading-normal'
          : isActive
          ? 'text-xl sm:text-2xl leading-snug'
          : 'text-lg sm:text-xl leading-normal';

        return (
          <div
            key={idx}
            onClick={() => {
              if (hasTimestamps && typeof line.time === 'number') {
                seek(line.time);
              }
            }}
            className={`transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] w-full max-w-full break-words whitespace-normal will-change-transform ${
              hasTimestamps ? 'cursor-pointer active:opacity-90' : 'cursor-default'
            }`}
          >
            <p
              className={`transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] w-full max-w-full break-words whitespace-normal tracking-normal ${sizeClasses} ${stateClasses}`}
            >
              {line.text}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default SyncedLyrics;
