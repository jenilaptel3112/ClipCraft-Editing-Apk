import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import {
  Film,
  Sparkles,
  Music,
  Type,
  Layers,
  Box,
  Camera,
  PenTool,
  GitFork,
  Magnet,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { TimelineClip } from '../types/editor';
import { formatTimestamp } from '../utils/presets';

interface TimelineItemProps {
  clip: TimelineClip;
  isSelected: boolean;
  pxPerSec: number;
  onSelectClip: (clipId: string) => void;
  onStartDrag: (
    e: React.PointerEvent,
    clip: TimelineClip,
    mode: 'move' | 'trim-start' | 'trim-end'
  ) => void;
}

// Strictly memoized timeline item - clips never re-render when playhead/timeline scrolls
const MemoizedClipItem = memo(
  ({
    clip,
    isSelected,
    pxPerSec,
    onSelectClip,
    onStartDrag,
  }: TimelineItemProps) => {
    const leftPx = clip.startTime * pxPerSec;
    const widthPx = Math.max(48, clip.duration * pxPerSec);
    const isVideo = clip.trackId === 'video';
    const isNull = clip.mediaType === 'null';
    const isCamera = clip.mediaType === 'camera';
    const isDrawing = clip.mediaType === 'drawing';

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectClip(clip.id);
    };

    return (
      <div
        onClick={handleClick}
        onPointerDown={(e) => {
          // Select clip without moving playhead
          onSelectClip(clip.id);
          onStartDrag(e, clip, 'move');
        }}
        style={{
          transform: `translate3d(${leftPx}px, 0, 0)`,
          width: `${widthPx}px`,
        }}
        className={`absolute top-1 bottom-1 rounded-xl transition-colors flex items-center justify-between cursor-pointer overflow-hidden select-none will-change-transform ${
          isSelected
            ? 'bg-amber-500/25 border-2 border-amber-400 shadow-lg shadow-amber-500/10 z-10'
            : isNull
            ? 'bg-cyan-900/30 border border-cyan-400/50'
            : isCamera
            ? 'bg-purple-900/30 border border-purple-400/50'
            : isDrawing
            ? 'bg-amber-900/30 border border-amber-400/50'
            : isVideo
            ? 'bg-blue-600/30 border border-blue-400/40 hover:bg-blue-600/40'
            : clip.trackId === 'audio'
            ? 'bg-emerald-600/30 border border-emerald-500/40'
            : 'bg-violet-600/30 border border-violet-500/40'
        }`}
      >
        {/* Left Extra-Wide Yellow Trim Handle when Selected */}
        {isSelected ? (
          <div
            data-handle="trim-start"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartDrag(e, clip, 'trim-start');
            }}
            className="w-5 h-full bg-amber-400 hover:bg-amber-300 flex items-center justify-center cursor-ew-resize z-20 shrink-0"
            title="Trim start handle"
          >
            <div className="w-1 h-5 bg-slate-950 rounded-full" />
          </div>
        ) : (
          <div className="w-2" />
        )}

        {/* Clip Name & Hierarchy Badges */}
        <div className="flex-1 px-1.5 min-w-0 text-left pointer-events-none flex flex-col justify-center">
          <div className="flex items-center gap-1 truncate">
            {isNull && (
              <span className="px-1 py-0.5 rounded bg-cyan-500/30 text-cyan-300 text-[9px] font-bold">
                NULL
              </span>
            )}
            {isCamera && (
              <span className="px-1 py-0.5 rounded bg-purple-500/30 text-purple-300 text-[9px] font-bold">
                CAM
              </span>
            )}
            {isDrawing && (
              <span className="px-1 py-0.5 rounded bg-amber-500/30 text-amber-300 text-[9px] font-bold">
                DRAW
              </span>
            )}
            {clip.is3D && (
              <span className="px-1 py-0.5 rounded bg-sky-500/30 text-sky-300 text-[9px] font-bold">
                3D
              </span>
            )}
            <span className="text-xs font-semibold text-white truncate">
              {clip.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono-tabular text-slate-400">
            <span>{clip.duration.toFixed(1)}s</span>
            {clip.parentId && (
              <span className="text-cyan-300 font-sans flex items-center gap-0.5 text-[9px]">
                <GitFork className="w-2.5 h-2.5" />
                <span>Parented</span>
              </span>
            )}
          </div>
        </div>

        {/* Transition icon indicator */}
        {clip.transitionIn.type !== 'none' && (
          <div className="mr-1 p-0.5 rounded bg-black/50 text-amber-400 pointer-events-none">
            <Sparkles className="w-3 h-3" />
          </div>
        )}

        {/* Right Extra-Wide Yellow Trim Handle when Selected */}
        {isSelected ? (
          <div
            data-handle="trim-end"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartDrag(e, clip, 'trim-end');
            }}
            className="w-5 h-full bg-amber-400 hover:bg-amber-300 flex items-center justify-center cursor-ew-resize z-20 shrink-0"
            title="Trim end handle"
          >
            <div className="w-1 h-5 bg-slate-950 rounded-full" />
          </div>
        ) : (
          <div className="w-2" />
        )}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.clip.id === next.clip.id &&
      prev.clip.startTime === next.clip.startTime &&
      prev.clip.duration === next.clip.duration &&
      prev.clip.sourceStartOffset === next.clip.sourceStartOffset &&
      prev.clip.speed === next.clip.speed &&
      prev.clip.name === next.clip.name &&
      prev.isSelected === next.isSelected &&
      prev.pxPerSec === next.pxPerSec
    );
  }
);

MemoizedClipItem.displayName = 'MemoizedClipItem';

interface TimelineViewProps {
  clips: TimelineClip[];
  totalDuration: number;
  selectedClipId: string | null;
  isPlaying?: boolean;
  currentTime?: number;
  onSelectClip: (clipId: string | null) => void;
  onSeek: (time: number, isScrubbing: boolean) => void;
  onUpdateClipTiming: (
    clipId: string,
    newStartTime: number,
    newDuration: number,
    newSourceOffset: number
  ) => void;
  registerScrubberTrigger?: (trigger: (time: number) => void) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = memo(
  ({
    clips,
    totalDuration,
    selectedClipId,
    isPlaying = false,
    currentTime = 0,
    onSelectClip,
    onSeek,
    onUpdateClipTiming,
    registerScrubberTrigger,
  }) => {
    const pxPerSec = 72; // 72px = 1 second
    const timelineSpan = Math.max(12, Math.ceil(totalDuration + 4));
    const timelineWidthPx = timelineSpan * pxPerSec;

    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const timeDisplayRef = useRef<HTMLSpanElement | null>(null);

    // Half-width of scroll container to center 0:00 at scrollLeft = 0
    const [halfWidth, setHalfWidth] = useState<number>(200);

    // Track user gesture states
    const isProgrammaticScrollRef = useRef<boolean>(false);
    const isUserScrubbingRef = useRef<boolean>(false);
    const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Drag-to-scrub state for trackpad/mouse on timeline background
    const isDragScrubbingRef = useRef<boolean>(false);
    const dragStartXRef = useRef<number>(0);
    const dragStartScrollLeftRef = useRef<number>(0);
    const didMoveDragRef = useRef<boolean>(false);

    // Dynamic measurement of half-width for exact 50% center needle alignment
    useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const updateWidth = () => {
        if (scrollContainerRef.current) {
          const w = scrollContainerRef.current.clientWidth;
          if (w > 0) {
            setHalfWidth(Math.floor(w / 2));
          }
        }
      };

      updateWidth();

      const resizeObserver = new ResizeObserver(() => {
        updateWidth();
      });
      resizeObserver.observe(container);

      window.addEventListener('resize', updateWidth);
      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', updateWidth);
      };
    }, []);

    // Register callback for playback engine: smoothly update container.scrollLeft during playback
    const updateScrollFromPlayback = useCallback(
      (time: number) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        // If user is actively touching/scrubbing, do not override scrollLeft
        if (isUserScrubbingRef.current || isDragScrubbingRef.current) return;

        isProgrammaticScrollRef.current = true;
        const targetScroll = Math.max(0, time * pxPerSec);
        container.scrollLeft = targetScroll;

        if (timeDisplayRef.current) {
          timeDisplayRef.current.textContent = formatTimestamp(time);
        }
      },
      [pxPerSec]
    );

    useEffect(() => {
      if (registerScrubberTrigger) {
        registerScrubberTrigger(updateScrollFromPlayback);
      }
    }, [registerScrubberTrigger, updateScrollFromPlayback]);

    // Initial positioning on mount
    useEffect(() => {
      const container = scrollContainerRef.current;
      if (container && currentTime > 0) {
        isProgrammaticScrollRef.current = true;
        container.scrollLeft = currentTime * pxPerSec;
        if (timeDisplayRef.current) {
          timeDisplayRef.current.textContent = formatTimestamp(currentTime);
        }
      }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Optimized onScroll handler: the single source of truth for fixed-center playhead scrubbing
    const handleContainerScroll = useCallback(() => {
      // Ignore programmatic scrolls driven by playback RAF or jump buttons
      if (isProgrammaticScrollRef.current) {
        isProgrammaticScrollRef.current = false;
        return;
      }

      const container = scrollContainerRef.current;
      if (!container) return;

      isUserScrubbingRef.current = true;
      const scrollLeft = container.scrollLeft;
      const rawTime = scrollLeft / pxPerSec;
      const clampedTime = Math.max(0, Math.min(totalDuration, rawTime));

      // Update header timecode badge in real-time
      if (timeDisplayRef.current) {
        timeDisplayRef.current.textContent = formatTimestamp(clampedTime);
      }

      // Notify parent with isScrubbing = true
      onSeek(+clampedTime.toFixed(3), true);

      // Debounce the final scrub release
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
      }
      scrollEndTimerRef.current = setTimeout(() => {
        isUserScrubbingRef.current = false;
        onSeek(+clampedTime.toFixed(3), false);
      }, 100);
    }, [pxPerSec, totalDuration, onSeek]);

    // Desktop/Touch drag-to-scrub on empty background or ruler
    const handleBackgroundPointerDown = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        // If clicking on trim handles or clips, ignore
        if ((e.target as HTMLElement).closest('[data-handle]')) return;

        const container = scrollContainerRef.current;
        if (!container) return;

        isDragScrubbingRef.current = true;
        didMoveDragRef.current = false;
        dragStartXRef.current = e.clientX;
        dragStartScrollLeftRef.current = container.scrollLeft;

        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      },
      []
    );

    const handleBackgroundPointerMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragScrubbingRef.current) return;
        const container = scrollContainerRef.current;
        if (!container) return;

        const deltaX = e.clientX - dragStartXRef.current;
        if (Math.abs(deltaX) > 3) {
          didMoveDragRef.current = true;
          isUserScrubbingRef.current = true;
          // Dragging right pulls earlier frames to center, dragging left pulls later frames
          container.scrollLeft = dragStartScrollLeftRef.current - deltaX;
        }
      },
      []
    );

    const handleBackgroundPointerUp = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragScrubbingRef.current) return;
        isDragScrubbingRef.current = false;

        // If user tapped without dragging, deselect clips without jumping the playhead!
        if (!didMoveDragRef.current) {
          onSelectClip(null);
        }

        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          // Safe ignore
        }
      },
      [onSelectClip]
    );

    // Clip Drag & Trim Handle Interaction
    const dragTrimRef = useRef<{
      mode: 'move' | 'trim-start' | 'trim-end';
      clipId: string;
      startX: number;
      initialStartTime: number;
      initialDuration: number;
      initialSourceOffset: number;
      maxDuration: number;
    } | null>(null);

    const handleStartDrag = useCallback(
      (
        e: React.PointerEvent,
        clip: TimelineClip,
        mode: 'move' | 'trim-start' | 'trim-end'
      ) => {
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

        dragTrimRef.current = {
          mode,
          clipId: clip.id,
          startX: e.clientX,
          initialStartTime: clip.startTime,
          initialDuration: clip.duration,
          initialSourceOffset: clip.sourceStartOffset,
          maxDuration: clip.sourceMaxDuration || 30,
        };
      },
      []
    );

    const handleDragMove = useCallback(
      (e: React.PointerEvent) => {
        const active = dragTrimRef.current;
        if (!active) return;
        e.stopPropagation();

        const deltaSec = (e.clientX - active.startX) / pxPerSec;

        if (active.mode === 'move') {
          const newStart = Math.max(0, active.initialStartTime + deltaSec);
          onUpdateClipTiming(
            active.clipId,
            +newStart.toFixed(2),
            active.initialDuration,
            active.initialSourceOffset
          );
        } else if (active.mode === 'trim-start') {
          const maxTrimDelta = active.initialDuration - 0.4;
          const clampedDelta = Math.max(-active.initialStartTime, Math.min(maxTrimDelta, deltaSec));
          const newStart = Math.max(0, active.initialStartTime + clampedDelta);
          const newDuration = Math.max(0.4, active.initialDuration - clampedDelta);
          const newOffset = Math.max(0, active.initialSourceOffset + clampedDelta);

          onUpdateClipTiming(
            active.clipId,
            +newStart.toFixed(2),
            +newDuration.toFixed(2),
            +newOffset.toFixed(2)
          );
        } else if (active.mode === 'trim-end') {
          const newDuration = Math.max(
            0.4,
            Math.min(active.maxDuration, active.initialDuration + deltaSec)
          );
          onUpdateClipTiming(
            active.clipId,
            active.initialStartTime,
            +newDuration.toFixed(2),
            active.initialSourceOffset
          );
        }
      },
      [pxPerSec, onUpdateClipTiming]
    );

    const handleDragEnd = useCallback(() => {
      dragTrimRef.current = null;
    }, []);

    // Quick jump to 0:00 or end
    const handleJumpToStart = () => {
      if (scrollContainerRef.current) {
        isProgrammaticScrollRef.current = true;
        scrollContainerRef.current.scrollLeft = 0;
        onSeek(0, false);
        if (timeDisplayRef.current) {
          timeDisplayRef.current.textContent = formatTimestamp(0);
        }
      }
    };

    const handleJumpToEnd = () => {
      if (scrollContainerRef.current) {
        isProgrammaticScrollRef.current = true;
        const endScroll = totalDuration * pxPerSec;
        scrollContainerRef.current.scrollLeft = endScroll;
        onSeek(totalDuration, false);
        if (timeDisplayRef.current) {
          timeDisplayRef.current.textContent = formatTimestamp(totalDuration);
        }
      }
    };

    const selectedClip = clips.find((c) => c.id === selectedClipId) || null;
    const videoClips = clips.filter((c) => c.trackId === 'video');

    const secondaryType = selectedClip?.trackId && selectedClip.trackId !== 'video'
      ? selectedClip.trackId
      : clips.some((c) => c.trackId === 'text')
      ? 'text'
      : 'audio';

    const secondaryClips = clips.filter((c) => c.trackId === secondaryType);

    return (
      <div className="relative flex flex-col bg-[#0B0C10] border-t border-b border-white/[0.08] shrink-0 select-none">
        {/* Timeline Header Bar: Timecode display & Quick Controls */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#0e1017] border-b border-white/[0.04] text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleJumpToStart}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all"
              title="Jump to Start (00:00.00)"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleJumpToEnd}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all"
              title="Jump to End"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Centered Master Timecode Display */}
          <div className="flex items-center gap-1.5 font-mono-tabular">
            <span
              ref={timeDisplayRef}
              className="text-amber-400 font-bold text-xs tracking-wide"
            >
              {formatTimestamp(currentTime)}
            </span>
            <span className="text-slate-600 text-[11px]">/</span>
            <span className="text-slate-400 text-xs">
              {formatTimestamp(totalDuration)}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Center Playhead</span>
          </div>
        </div>

        {/* Scrollable Timeline Area */}
        <div className="relative w-full">
          {/* STATIONARY FIXED-CENTER PLAYHEAD: Stays visually pinned at 50% horizontal center */}
          <div
            className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center"
            style={{ width: '2px' }}
          >
            {/* Top Amber Playhead Needle Cap (CapCut Style) */}
            <div className="w-3.5 h-3.5 -mt-0.5 bg-amber-400 rounded-b-md flex items-center justify-center shadow-lg shadow-amber-400/50 border border-slate-950">
              <div className="w-1 h-1 bg-slate-950 rounded-full" />
            </div>

            {/* Vertical Amber Guideline through all tracks */}
            <div className="w-[2px] h-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]" />

            {/* Bottom Anchor Bead */}
            <div className="w-2 h-2 -mb-1 bg-amber-400 rounded-full shadow-md shadow-amber-400/40" />
          </div>

          {/* Scrollable Container with Half-Width Padding */}
          <div
            ref={scrollContainerRef}
            onScroll={handleContainerScroll}
            onPointerDown={handleBackgroundPointerDown}
            onPointerMove={handleBackgroundPointerMove}
            onPointerUp={handleBackgroundPointerUp}
            className="overflow-x-auto overflow-y-hidden py-2 bg-[#090A0F] scrollbar-none cursor-grab active:cursor-grabbing"
            style={{
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-x',
              paddingLeft: `${halfWidth}px`,
              paddingRight: `${halfWidth}px`,
            }}
          >
            {/* Tracks Content Box */}
            <div
              className="relative min-h-[142px]"
              style={{ width: `${Math.max(timelineWidthPx, 600)}px` }}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
            >
              {/* TIME RULER */}
              <div className="relative h-6 mb-2 pointer-events-none border-b border-white/[0.04]">
                {Array.from({ length: timelineSpan + 1 }).map((_, sec) => (
                  <div
                    key={sec}
                    className="absolute top-0 flex flex-col items-center -translate-x-1/2"
                    style={{ left: `${sec * pxPerSec}px` }}
                  >
                    <span className="font-mono-tabular text-[10px] font-medium text-slate-500">
                      {sec}s
                    </span>
                    <div className="h-2 w-[1px] bg-white/20 mt-0.5" />
                  </div>
                ))}
                {/* Half-second subdivision tick marks */}
                {Array.from({ length: timelineSpan * 2 }).map((_, half) => (
                  <div
                    key={`half-${half}`}
                    className="absolute bottom-0 -translate-x-1/2 h-1 w-[1px] bg-white/10"
                    style={{ left: `${(half + 0.5) * (pxPerSec / 2)}px` }}
                  />
                ))}
              </div>

              {/* TRACK 1: Primary Video Track */}
              <div className="relative h-14 bg-white/[0.02] rounded-xl mb-2.5 p-1 border border-white/[0.04]">
                <div className="absolute left-2 top-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 pointer-events-none z-0">
                  <Film className="w-3 h-3 text-amber-400" />
                  <span>Video Track</span>
                </div>

                {videoClips.map((clip) => (
                  <MemoizedClipItem
                    key={clip.id}
                    clip={clip}
                    isSelected={clip.id === selectedClipId}
                    pxPerSec={pxPerSec}
                    onSelectClip={onSelectClip}
                    onStartDrag={handleStartDrag}
                  />
                ))}
              </div>

              {/* TRACK 2: Secondary Contextual Track (Audio/Text/Effects) */}
              <div className="relative h-12 bg-white/[0.02] rounded-xl p-1 border border-white/[0.04]">
                <div className="absolute left-2 top-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 pointer-events-none z-0">
                  {secondaryType === 'audio' ? (
                    <Music className="w-3 h-3 text-emerald-400" />
                  ) : secondaryType === 'text' ? (
                    <Type className="w-3 h-3 text-violet-400" />
                  ) : (
                    <Layers className="w-3 h-3 text-sky-400" />
                  )}
                  <span className="capitalize">{secondaryType} Track</span>
                </div>

                {secondaryClips.map((clip) => (
                  <MemoizedClipItem
                    key={clip.id}
                    clip={clip}
                    isSelected={clip.id === selectedClipId}
                    pxPerSec={pxPerSec}
                    onSelectClip={onSelectClip}
                    onStartDrag={handleStartDrag}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

TimelineView.displayName = 'TimelineView';
