import React, { useRef } from 'react';
import { Film, Sparkles, Music, Type, Layers } from 'lucide-react';
import { TimelineClip } from '../types/editor';

interface SimplifiedTimelineProps {
  clips: TimelineClip[];
  playhead: number;
  totalDuration: number;
  selectedClipId: string | null;
  onSelectClip: (clipId: string | null) => void;
  onSeek: (time: number) => void;
  onUpdateClipTiming: (
    clipId: string,
    newStartTime: number,
    newDuration: number,
    newSourceOffset: number
  ) => void;
}

type DragTrim = {
  mode: 'move' | 'trim-start' | 'trim-end';
  clipId: string;
  startX: number;
  initialStartTime: number;
  initialDuration: number;
  initialSourceOffset: number;
  maxDuration: number;
};

export const SimplifiedTimeline: React.FC<SimplifiedTimelineProps> = ({
  clips,
  playhead,
  totalDuration,
  selectedClipId,
  onSelectClip,
  onSeek,
  onUpdateClipTiming,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragTrim | null>(null);
  const pxPerSec = 72; // Generous comfortable thumb scale
  const timelineSpan = Math.max(12, Math.ceil(totalDuration + 3));
  const timelineWidthPx = timelineSpan * pxPerSec;

  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;

  // Track 1: Primary Video Track
  const videoClips = clips
    .filter((c) => c.trackId === 'video')
    .sort((a, b) => a.startTime - b.startTime);

  // Track 2: Contextual Sub-Track (Audio, Text, or Overlay)
  // If a non-video clip is selected, show that type; otherwise show active text or audio
  const secondaryType = selectedClip?.trackId && selectedClip.trackId !== 'video'
    ? selectedClip.trackId
    : clips.some((c) => c.trackId === 'text')
    ? 'text'
    : 'audio';

  const secondaryClips = clips
    .filter((c) => c.trackId === secondaryType)
    .sort((a, b) => a.startTime - b.startTime);

  // Automatic magnetic snap for video track to prevent gaps
  const autoSnapVideoClips = (
    movedClipId: string,
    targetStart: number,
    duration: number,
    sourceOffset: number
  ) => {
    // Collect boundary snap points from adjacent clips
    const otherVideoClips = videoClips.filter((c) => c.id !== movedClipId);
    let finalStart = Math.max(0, targetStart);

    // Snap to 0, playhead, or other clip edges within 14px threshold
    const snapThresholdSec = 14 / pxPerSec;
    const snapPoints = [0, playhead];
    otherVideoClips.forEach((c) => {
      snapPoints.push(c.startTime);
      snapPoints.push(c.startTime + c.duration);
    });

    for (const p of snapPoints) {
      if (Math.abs(finalStart - p) < snapThresholdSec) {
        finalStart = p;
        break;
      }
      if (Math.abs(finalStart + duration - p) < snapThresholdSec) {
        finalStart = Math.max(0, p - duration);
        break;
      }
    }

    onUpdateClipTiming(movedClipId, +finalStart.toFixed(2), duration, sourceOffset);
  };

  // Convert timeline container clientX to seconds
  const clientXToSec = (clientX: number): number => {
    const container = scrollContainerRef.current;
    if (!container) return 0;
    const rect = container.getBoundingClientRect();
    const offsetX = clientX - rect.left + container.scrollLeft;
    return Math.max(0, Math.min(timelineSpan, offsetX / pxPerSec));
  };

  // Timeline scrubber pointer handlers
  const handleTimelineScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only seek if clicking outside interactive trim handles
    if ((e.target as HTMLElement).dataset.handle) return;
    const sec = clientXToSec(e.clientX);
    onSeek(+sec.toFixed(2));
  };

  // Trim handle drag start
  const startDrag = (
    e: React.PointerEvent,
    clip: TimelineClip,
    mode: 'move' | 'trim-start' | 'trim-end'
  ) => {
    e.stopPropagation();
    onSelectClip(clip.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    dragRef.current = {
      mode,
      clipId: clip.id,
      startX: e.clientX,
      initialStartTime: clip.startTime,
      initialDuration: clip.duration,
      initialSourceOffset: clip.sourceStartOffset,
      maxDuration: clip.sourceMaxDuration || 30,
    };
  };

  const onDragMove = (e: React.PointerEvent) => {
    const active = dragRef.current;
    if (!active) return;
    e.stopPropagation();

    const deltaSec = (e.clientX - active.startX) / pxPerSec;

    if (active.mode === 'move') {
      const newStart = Math.max(0, active.initialStartTime + deltaSec);
      autoSnapVideoClips(active.clipId, newStart, active.initialDuration, active.initialSourceOffset);
    } else if (active.mode === 'trim-start') {
      // Extra wide trim handle: Drag start
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
      // Extra wide trim handle: Drag end
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
  };

  const onDragEnd = () => {
    dragRef.current = null;
  };

  return (
    <div className="flex flex-col bg-[#0B0C10] border-t border-b border-white/[0.08] shrink-0 select-none touch-pan-x">
      {/* Scrollable simplified 2-track timeline */}
      <div
        ref={scrollContainerRef}
        onPointerDown={handleTimelineScrub}
        className="relative overflow-x-auto overflow-y-hidden py-3 px-2 bg-[#090A0F]"
        style={{ touchAction: 'pan-x' }}
      >
        <div
          className="relative min-h-[148px]"
          style={{ width: `${Math.max(timelineWidthPx, 600)}px` }}
        >
          {/* Time markings ruler */}
          <div className="relative h-5 mb-2 pointer-events-none">
            {Array.from({ length: timelineSpan + 1 }).map((_, sec) => (
              <div
                key={sec}
                className="absolute top-0 flex flex-col items-center -translate-x-1/2"
                style={{ left: `${sec * pxPerSec}px` }}
              >
                <span className="font-mono-tabular text-[10px] text-slate-500">
                  {sec}s
                </span>
                <div className="h-1.5 w-[1px] bg-white/20 mt-0.5" />
              </div>
            ))}
          </div>

          {/* TRACK 1: Main Video Track */}
          <div className="relative h-14 bg-white/[0.02] rounded-xl mb-2.5 p-1 border border-white/[0.04]">
            <div className="absolute left-2 top-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 pointer-events-none z-0">
              <Film className="w-3 h-3 text-amber-400" />
              <span>Video</span>
            </div>

            {videoClips.map((clip) => {
              const leftPx = clip.startTime * pxPerSec;
              const widthPx = Math.max(48, clip.duration * pxPerSec);
              const isSelected = clip.id === selectedClipId;

              return (
                <div
                  key={clip.id}
                  onPointerDown={(e) => startDrag(e, clip, 'move')}
                  onPointerMove={onDragMove}
                  onPointerUp={onDragEnd}
                  style={{
                    left: `${leftPx}px`,
                    width: `${widthPx}px`,
                  }}
                  className={`absolute top-1 bottom-1 rounded-xl transition-all flex items-center justify-between cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'bg-amber-500/25 border-2 border-amber-400 shadow-lg shadow-amber-500/10 z-10'
                      : 'bg-blue-600/30 border border-blue-400/40 hover:bg-blue-600/40'
                  }`}
                >
                  {/* Left Extra-Wide Yellow Trim Handle when Selected (>=44px touch friendly) */}
                  {isSelected ? (
                    <div
                      data-handle="trim-start"
                      onPointerDown={(e) => startDrag(e, clip, 'trim-start')}
                      onPointerMove={onDragMove}
                      onPointerUp={onDragEnd}
                      className="w-5 h-full bg-amber-400 hover:bg-amber-300 flex items-center justify-center cursor-ew-resize z-20 shrink-0"
                      title="Trim start handle"
                    >
                      <div className="w-1 h-5 bg-slate-950 rounded-full" />
                    </div>
                  ) : (
                    <div className="w-2" />
                  )}

                  {/* Clip Name */}
                  <div className="flex-1 px-1.5 min-w-0 text-left pointer-events-none">
                    <span className="text-xs font-semibold text-white truncate block">
                      {clip.name}
                    </span>
                    <span className="text-[10px] font-mono-tabular text-slate-400">
                      {clip.duration.toFixed(1)}s
                    </span>
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
                      onPointerDown={(e) => startDrag(e, clip, 'trim-end')}
                      onPointerMove={onDragMove}
                      onPointerUp={onDragEnd}
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
            })}
          </div>

          {/* TRACK 2: Contextual Dynamic Sub-Track */}
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

            {secondaryClips.map((clip) => {
              const leftPx = clip.startTime * pxPerSec;
              const widthPx = Math.max(42, clip.duration * pxPerSec);
              const isSelected = clip.id === selectedClipId;

              return (
                <div
                  key={clip.id}
                  onPointerDown={(e) => startDrag(e, clip, 'move')}
                  onPointerMove={onDragMove}
                  onPointerUp={onDragEnd}
                  style={{
                    left: `${leftPx}px`,
                    width: `${widthPx}px`,
                  }}
                  className={`absolute top-1 bottom-1 rounded-lg transition-all flex items-center justify-between cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'bg-amber-500/25 border-2 border-amber-400 shadow z-10'
                      : clip.trackId === 'audio'
                      ? 'bg-emerald-600/30 border border-emerald-500/40'
                      : 'bg-violet-600/30 border border-violet-500/40'
                  }`}
                >
                  {/* Trim Handle Left */}
                  {isSelected && (
                    <div
                      data-handle="trim-start"
                      onPointerDown={(e) => startDrag(e, clip, 'trim-start')}
                      onPointerMove={onDragMove}
                      onPointerUp={onDragEnd}
                      className="w-4 h-full bg-amber-400 flex items-center justify-center cursor-ew-resize z-20 shrink-0"
                    >
                      <div className="w-0.5 h-4 bg-slate-950 rounded-full" />
                    </div>
                  )}

                  <div className="flex-1 px-1.5 min-w-0 text-left pointer-events-none">
                    <span className="text-[11px] font-medium text-white truncate block">
                      {clip.name}
                    </span>
                  </div>

                  {/* Waveform graphic for audio */}
                  {clip.trackId === 'audio' && clip.waveform && (
                    <div className="h-3 flex items-end gap-[1px] opacity-60 mr-1 pointer-events-none">
                      {clip.waveform.slice(0, 16).map((w, idx) => (
                        <div
                          key={idx}
                          className="w-1 bg-emerald-300 rounded-t-xs"
                          style={{ height: `${Math.max(20, w * 100)}%` }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Trim Handle Right */}
                  {isSelected && (
                    <div
                      data-handle="trim-end"
                      onPointerDown={(e) => startDrag(e, clip, 'trim-end')}
                      onPointerMove={onDragMove}
                      onPointerUp={onDragEnd}
                      className="w-4 h-full bg-amber-400 flex items-center justify-center cursor-ew-resize z-20 shrink-0"
                    >
                      <div className="w-0.5 h-4 bg-slate-950 rounded-full" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Draggable Playhead with Yellow Line and Thumb Scrubber Cap */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none z-30"
            style={{ left: `${playhead * pxPerSec}px` }}
          >
            {/* Scrubber Knob (>= 44x44px touch area) */}
            <div
              onPointerDown={handleTimelineScrub}
              className="w-8 h-8 -ml-4 -mt-2 bg-amber-400 rounded-full flex items-center justify-center shadow-lg shadow-amber-400/30 border-2 border-slate-950 pointer-events-auto cursor-ew-resize active:scale-110 transition-transform"
            >
              <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
            </div>
            {/* Vertical Marker Line */}
            <div className="w-[2px] h-full -ml-[1px] bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          </div>
        </div>
      </div>
    </div>
  );
};
