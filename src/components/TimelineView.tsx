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
import { TimelineClip, TimecodeDisplayMode, ProjectFrameRate } from '../types/editor';
import { formatTimecode } from '../utils/presets';
import { useVirtualizedTimeline } from '../hooks/useVirtualizedTimeline';

interface TimelineItemProps {
  clip: TimelineClip;
  isSelected: boolean;
  pxPerSec: number;
  thumbnails?: Record<string, string>;
  onSelectClip: (clipId: string) => void;
  onStartDrag: (
    e: React.PointerEvent,
    clip: TimelineClip,
    mode: 'move' | 'trim-start' | 'trim-end'
  ) => void;
}

// Strictly memoized timeline item with lazy filmstrip thumbnails and waveforms
const MemoizedClipItem = memo(
  ({
    clip,
    isSelected,
    pxPerSec,
    thumbnails,
    onSelectClip,
    onStartDrag,
  }: TimelineItemProps) => {
    const leftPx = clip.startTime * pxPerSec;
    const widthPx = Math.max(28, clip.duration * pxPerSec);

    const isVideo = clip.mediaType === 'video';
    const isAudio = clip.trackId === 'audio';
    const isDrawing = clip.mediaType === 'drawing';
    const isNull = clip.mediaType === 'null';
    const isCamera = clip.mediaType === 'camera';

    // Find thumbnail for this clip if available
    const thumbKey = Object.keys(thumbnails || {}).find((k) => k.startsWith(`${clip.id}_`));
    const thumbUrl = thumbKey ? thumbnails?.[thumbKey] : undefined;

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
            : isAudio
            ? 'bg-emerald-600/30 border border-emerald-500/40'
            : 'bg-violet-600/30 border border-violet-500/40'
        }`}
      >
        {/* On-demand Lazy Video Filmstrip Background Ribbon */}
        {isVideo && thumbUrl && (
          <div
            className="absolute inset-0 opacity-20 pointer-events-none bg-cover bg-center"
            style={{ backgroundImage: `url(${thumbUrl})` }}
          />
        )}

        {/* Audio Waveform visualization if available */}
        {clip.waveform && clip.waveform.length > 0 && (
          <div className="absolute inset-x-2 inset-y-1 flex items-center gap-[2px] opacity-25 pointer-events-none overflow-hidden">
            {clip.waveform.slice(0, Math.floor(widthPx / 4)).map((val, idx) => (
              <div
                key={idx}
                className="w-1 bg-white rounded-full shrink-0"
                style={{ height: `${Math.max(15, val * 100)}%` }}
              />
            ))}
          </div>
        )}

        {/* Left Extra-Wide Yellow Trim Handle when Selected */}
        {isSelected ? (
          <div
            data-handle="trim-start"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartDrag(e, clip, 'trim-start');
            }}
            className="w-5 h-full bg-amber-400 hover:bg-amber-300 flex items-center justify-center cursor-ew-resize z-20 shrink-0 shadow-sm"
            title="Trim start handle"
          >
            <div className="w-1 h-5 bg-slate-950 rounded-full" />
          </div>
        ) : (
          <div className="w-2" />
        )}

        {/* Clip Name & Hierarchy Badges */}
        <div className="flex-1 px-1.5 min-w-0 text-left pointer-events-none flex flex-col justify-center z-10">
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
            {clip.isLongDuration && (
              <span className="px-1 py-0.5 rounded bg-amber-500/30 text-amber-300 text-[8px] font-bold uppercase tracking-wider">
                Proxy
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
            {clip.sourceId && (
              <span className="text-amber-400/80 text-[9px]">Sub-clip</span>
            )}
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
          <div className="mr-1 p-0.5 rounded bg-black/50 text-amber-400 pointer-events-none z-10">
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
            className="w-5 h-full bg-amber-400 hover:bg-amber-300 flex items-center justify-center cursor-ew-resize z-20 shrink-0 shadow-sm"
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
      prev.pxPerSec === next.pxPerSec &&
      prev.thumbnails === next.thumbnails
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
  timecodeDisplay?: TimecodeDisplayMode;
  frameRate?: ProjectFrameRate;
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
    timecodeDisplay = 'compact',
    frameRate = 30,
    onSelectClip,
    onSeek,
    onUpdateClipTiming,
    registerScrubberTrigger,
  }) => {
    // Dynamic pxPerSec scaling: for very long clips (> 600s / 10min), scale down pxPerSec to keep timeline compact
    const pxPerSec = totalDuration > 1800 ? 24 : totalDuration > 600 ? 36 : 72;
    const timelineSpan = Math.max(12, Math.ceil(totalDuration + 4));
    const timelineWidthPx = timelineSpan * pxPerSec;

    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const timeDisplayRef = useRef<HTMLSpanElement | null>(null);

    // Half-width of scroll container to center 0:00 at scrollLeft = 0
    const [halfWidth, setHalfWidth] = useState<number>(200);
    const [scrollLeft, setScrollLeft] = useState<number>(0);
    const [viewportWidth, setViewportWidth] = useState<number>(600);

    // Track user gesture states
    const isProgrammaticScrollRef = useRef<boolean>(false);
    const isUserScrubbingRef = useRef<boolean>(false);
    const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Drag-to-scrub state for trackpad/mouse on timeline background
    const isDragScrubbingRef = useRef<boolean>(false);
    const dragStartXRef = useRef<number>(0);
    const dragStartScrollLeftRef = useRef<number>(0);
    const didMoveDragRef = useRef<boolean>(false);

    // Virtualization Hook: calculates visible window, virtual ruler ticks, and on-demand LRU thumbnails
    const { virtualRulerTicks, thumbnails } = useVirtualizedTimeline({
      scrollLeft,
      viewportWidth,
      pxPerSec,
      totalDuration,
      clips,
    });

    // Dynamic measurement of half-width for exact 50% center needle alignment
    useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const updateWidth = () => {
        if (scrollContainerRef.current) {
          const w = scrollContainerRef.current.clientWidth;
          if (w > 0) {
            setHalfWidth(Math.floor(w / 2));
            setViewportWidth(w);
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
          timeDisplayRef.current.textContent = formatTimecode(time, timecodeDisplay, frameRate);
        }
      },
      [pxPerSec, timecodeDisplay, frameRate]
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
          timeDisplayRef.current.textContent = formatTimecode(currentTime, timecodeDisplay, frameRate);
        }
      }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Optimized onScroll handler: the single source of truth for fixed-center playhead scrubbing
    const handleContainerScroll = useCallback(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const curScroll = container.scrollLeft;
      setScrollLeft(curScroll);

      // Ignore programmatic scrolls driven by playback RAF or jump buttons
      if (isProgrammaticScrollRef.current) {
        isProgrammaticScrollRef.current = false;
        return;
      }

      isUserScrubbingRef.current = true;
      const rawTime = curScroll / pxPerSec;
      const clampedTime = Math.max(0, Math.min(totalDuration, rawTime));

      // Update header timecode badge in real-time
      if (timeDisplayRef.current) {
        timeDisplayRef.current.textContent = formatTimecode(clampedTime, timecodeDisplay, frameRate);
      }

      // Notify parent with isScrubbing = true (uses fastSeek where supported)
      onSeek(+clampedTime.toFixed(3), true);

      // Debounce the final scrub release to execute frame-exact seek
      if (scrollEndTimerRef.current) {
        clearTimeout(scrollEndTimerRef.current);
      }
      scrollEndTimerRef.current = setTimeout(() => {
        isUserScrubbingRef.current = false;
        onSeek(+clampedTime.toFixed(3), false);
      }, 120);
    }, [pxPerSec, totalDuration, onSeek, timecodeDisplay, frameRate]);

    // Desktop/Touch drag-to-scrub on empty background or ruler
    const handleBackgroundPointerDown = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
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
          // Dragging to the right moves content to the right (decreases scrollLeft)
          container.scrollLeft = Math.max(0, dragStartScrollLeftRef.current - deltaX);
        }
      },
      []
    );

    const handleBackgroundPointerUp = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragScrubbingRef.current) return;
        isDragScrubbingRef.current = false;

        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {}

        if (!didMoveDragRef.current) {
          // Plain tap in empty space -> deselect clip without jumping playhead
          onSelectClip(null);
        } else {
          // User finished drag scrubbing -> frame exact seek
          isUserScrubbingRef.current = false;
          const container = scrollContainerRef.current;
          if (container) {
            const rawTime = container.scrollLeft / pxPerSec;
            const clamped = Math.max(0, Math.min(totalDuration, rawTime));
            onSeek(+clamped.toFixed(3), false);
          }
        }
      },
      [onSelectClip, onSeek, pxPerSec, totalDuration]
    );

    // Jump to Start / End buttons
    const handleJumpToStart = () => {
      const container = scrollContainerRef.current;
      if (container) {
        isProgrammaticScrollRef.current = true;
        container.scrollLeft = 0;
        onSeek(0, false);
      }
    };

    const handleJumpToEnd = () => {
      const container = scrollContainerRef.current;
      if (container) {
        isProgrammaticScrollRef.current = true;
        container.scrollLeft = totalDuration * pxPerSec;
        onSeek(totalDuration, false);
      }
    };

    // Clip Drag / Trim state
    const dragRef = useRef<{
      mode: 'move' | 'trim-start' | 'trim-end';
      clipId: string;
      startX: number;
      initialStartTime: number;
      initialDuration: number;
      initialSourceOffset: number;
      speed: number;
      maxDuration: number;
    } | null>(null);

    const handleStartDrag = useCallback(
      (
        e: React.PointerEvent,
        clip: TimelineClip,
        mode: 'move' | 'trim-start' | 'trim-end'
      ) => {
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        dragRef.current = {
          mode,
          clipId: clip.id,
          startX: e.clientX,
          initialStartTime: clip.startTime,
          initialDuration: clip.duration,
          initialSourceOffset: clip.sourceStartOffset,
          speed: clip.speed || 1.0,
          maxDuration: clip.sourceMaxDuration || 60,
        };
      },
      []
    );

    const handleDragMove = useCallback(
      (e: React.PointerEvent) => {
        if (!dragRef.current) return;
        const deltaX = e.clientX - dragRef.current.startX;
        const deltaTime = deltaX / pxPerSec;

        const {
          mode,
          clipId,
          initialStartTime,
          initialDuration,
          initialSourceOffset,
          speed,
        } = dragRef.current;

        if (mode === 'move') {
          const newStart = Math.max(0, +(initialStartTime + deltaTime).toFixed(2));
          onUpdateClipTiming(clipId, newStart, initialDuration, initialSourceOffset);
        } else if (mode === 'trim-start') {
          const clampedDelta = Math.min(deltaTime, initialDuration - 0.4);
          const newStart = Math.max(0, +(initialStartTime + clampedDelta).toFixed(2));
          const newDuration = Math.max(0.4, +(initialDuration - clampedDelta).toFixed(2));
          const newOffset = Math.max(0, +(initialSourceOffset + clampedDelta * speed).toFixed(2));
          onUpdateClipTiming(clipId, newStart, newDuration, newOffset);
        } else if (mode === 'trim-end') {
          const newDuration = Math.max(0.4, +(initialDuration + deltaTime).toFixed(2));
          onUpdateClipTiming(clipId, initialStartTime, newDuration, initialSourceOffset);
        }
      },
      [pxPerSec, onUpdateClipTiming]
    );

    const handleDragEnd = useCallback((e: React.PointerEvent) => {
      if (dragRef.current) {
        try {
          (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {}
        dragRef.current = null;
      }
    }, []);

    // Split clips into tracks
    const videoClips = clips.filter((c) => c.trackId === 'video');
    const secondaryClips = clips.filter((c) => c.trackId !== 'video');
    const secondaryType = secondaryClips[0]?.trackId || 'audio';

    return (
      <div className="bg-[#0C0E14] border-t border-white/[0.08] select-none shrink-0 relative">
        {/* Navigation & Controls Header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04]">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleJumpToStart}
              className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
              title="Jump to Start (0:00)"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleJumpToEnd}
              className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
              title="Jump to Project End"
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
              {formatTimecode(currentTime, timecodeDisplay, frameRate)}
            </span>
            <span className="text-slate-600 text-[11px]">/</span>
            <span className="text-slate-400 text-xs">
              {formatTimecode(totalDuration, timecodeDisplay, frameRate)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
            <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono-tabular text-amber-300 font-bold">
              {frameRate} FPS
            </span>
            <div className="flex items-center gap-1 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Center</span>
            </div>
          </div>
        </div>

        {/* Scrollable Timeline Area */}
        <div className="relative w-full">
          {/* STATIONARY FIXED-CENTER PLAYHEAD: Visually pinned at 50% horizontal center */}
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
              {/* VIRTUALIZED TIME RULER: Only renders ticks in visible viewport */}
              <div className="relative h-6 mb-2 pointer-events-none border-b border-white/[0.04]">
                {virtualRulerTicks.map((tick) => (
                  <div
                    key={tick.sec}
                    className="absolute top-0 flex flex-col items-center -translate-x-1/2"
                    style={{ left: `${tick.x}px` }}
                  >
                    <span className="font-mono-tabular text-[10px] font-medium text-slate-500">
                      {tick.sec}s
                    </span>
                    <div className="h-2 w-[1px] bg-white/20 mt-0.5" />
                  </div>
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
                    thumbnails={thumbnails}
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
                    thumbnails={thumbnails}
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
