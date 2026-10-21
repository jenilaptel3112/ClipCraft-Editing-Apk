import React, { useRef, useState } from 'react';
import {
  Scissors,
  Copy,
  Trash2,
  Plus,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Magnet,
  ZoomIn,
  ZoomOut,
  Film,
  Layers,
  Type,
  Music,
  Sparkles,
} from 'lucide-react';
import { TimelineClip, TrackMeta, TrackType } from '../types/editor';
import { formatTimestamp } from '../utils/presets';

interface MultiTrackTimelineProps {
  clips: TimelineClip[];
  tracks: TrackMeta[];
  playhead: number;
  totalDuration: number;
  selectedClipId: string | null;
  magneticSnap: boolean;
  onSelectClip: (clipId: string | null) => void;
  onSeek: (time: number) => void;
  onSplitAtPlayhead: () => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onToggleMagneticSnap: () => void;
  onToggleTrackMute: (trackId: TrackType) => void;
  onToggleTrackVisible: (trackId: TrackType) => void;
  onToggleTrackLock: (trackId: TrackType) => void;
  onUpdateClipTiming: (
    clipId: string,
    newStartTime: number,
    newDuration: number,
    newSourceOffset: number
  ) => void;
  onTriggerMediaUpload: (trackType: TrackType) => void;
}

type DragInteraction = {
  mode: 'move' | 'trim-start' | 'trim-end' | 'slip';
  clipId: string;
  startX: number;
  initialStartTime: number;
  initialDuration: number;
  initialSourceOffset: number;
  maxDuration: number;
};

export const MultiTrackTimeline: React.FC<MultiTrackTimelineProps> = ({
  clips,
  tracks,
  playhead,
  totalDuration,
  selectedClipId,
  magneticSnap,
  onSelectClip,
  onSeek,
  onSplitAtPlayhead,
  onDuplicateSelected,
  onDeleteSelected,
  onToggleMagneticSnap,
  onToggleTrackMute,
  onToggleTrackVisible,
  onToggleTrackLock,
  onUpdateClipTiming,
  onTriggerMediaUpload,
}) => {
  const [pxPerSec, setPxPerSec] = useState<number>(64);
  const [snapGuideTime, setSnapGuideTime] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragInteraction | null>(null);
  const isScrubbingRef = useRef<boolean>(false);

  const timelineSpanSeconds = Math.max(16, Math.ceil(totalDuration + 4));
  const timelineWidthPx = timelineSpanSeconds * pxPerSec;
  const trackHeaderWidth = 108;

  // Compute magnetic snap targets (0, playhead, and all other clip start/end edges)
  const getSnapTargets = (excludeClipId?: string): number[] => {
    const targets = [0, playhead];
    clips.forEach((c) => {
      if (c.id !== excludeClipId) {
        targets.push(c.startTime);
        targets.push(c.startTime + c.duration);
      }
    });
    return targets;
  };

  const snapTimeValue = (rawTime: number, excludeClipId?: string): { time: number; snapped: boolean } => {
    if (!magneticSnap) return { time: Math.max(0, rawTime), snapped: false };
    const thresholdSec = 8 / pxPerSec; // 8px snap radius
    const targets = getSnapTargets(excludeClipId);
    for (const target of targets) {
      if (Math.abs(rawTime - target) <= thresholdSec) {
        return { time: Math.max(0, target), snapped: true };
      }
    }
    return { time: Math.max(0, rawTime), snapped: false };
  };

  // Convert pointer clientX inside timeline area to seconds
  const clientXToSeconds = (clientX: number): number => {
    const container = scrollContainerRef.current;
    if (!container) return 0;
    const rect = container.getBoundingClientRect();
    const offsetX = clientX - rect.left + container.scrollLeft - trackHeaderWidth;
    return Math.max(0, Math.min(timelineSpanSeconds, offsetX / pxPerSec));
  };

  // Ruler & playhead scrubbing handlers
  const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isScrubbingRef.current = true;
    const rawTime = clientXToSeconds(e.clientX);
    const { time } = snapTimeValue(rawTime);
    onSeek(time);
  };

  const handleRulerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return;
    const rawTime = clientXToSeconds(e.clientX);
    const { time, snapped } = snapTimeValue(rawTime);
    setSnapGuideTime(snapped ? time : null);
    onSeek(time);
  };

  const handleRulerPointerUp = () => {
    isScrubbingRef.current = false;
    setSnapGuideTime(null);
  };

  // Clip drag / trim / slip pointer handlers
  const startClipInteraction = (
    e: React.PointerEvent,
    clip: TimelineClip,
    mode: 'move' | 'trim-start' | 'trim-end' | 'slip'
  ) => {
    e.stopPropagation();
    const trackMeta = tracks.find((t) => t.id === clip.trackId);
    if (trackMeta?.locked) return;

    onSelectClip(clip.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode,
      clipId: clip.id,
      startX: e.clientX,
      initialStartTime: clip.startTime,
      initialDuration: clip.duration,
      initialSourceOffset: clip.sourceStartOffset,
      maxDuration: clip.sourceMaxDuration,
    };
  };

  const handleClipPointerMove = (e: React.PointerEvent) => {
    const active = dragRef.current;
    if (!active) return;
    e.stopPropagation();

    const deltaSec = (e.clientX - active.startX) / pxPerSec;

    if (active.mode === 'move') {
      const candidateStart = Math.max(0, active.initialStartTime + deltaSec);
      const startSnap = snapTimeValue(candidateStart, active.clipId);
      const endSnap = snapTimeValue(candidateStart + active.initialDuration, active.clipId);

      let finalStart = candidateStart;
      if (startSnap.snapped) {
        finalStart = startSnap.time;
        setSnapGuideTime(startSnap.time);
      } else if (endSnap.snapped) {
        finalStart = Math.max(0, endSnap.time - active.initialDuration);
        setSnapGuideTime(endSnap.time);
      } else {
        setSnapGuideTime(null);
      }

      onUpdateClipTiming(
        active.clipId,
        +finalStart.toFixed(2),
        active.initialDuration,
        active.initialSourceOffset
      );
    } else if (active.mode === 'trim-start') {
      const maxTrimIn = active.initialDuration - 0.4;
      const clampedDelta = Math.max(-active.initialStartTime, Math.min(maxTrimIn, deltaSec));
      const rawNewStart = active.initialStartTime + clampedDelta;
      const { time: snappedStart, snapped } = snapTimeValue(rawNewStart, active.clipId);
      const actualDelta = snappedStart - active.initialStartTime;

      if (active.initialDuration - actualDelta >= 0.4) {
        setSnapGuideTime(snapped ? snappedStart : null);
        onUpdateClipTiming(
          active.clipId,
          +snappedStart.toFixed(2),
          +(active.initialDuration - actualDelta).toFixed(2),
          Math.max(0, +(active.initialSourceOffset + actualDelta).toFixed(2))
        );
      }
    } else if (active.mode === 'trim-end') {
      const rawNewDuration = Math.max(0.4, Math.min(active.maxDuration, active.initialDuration + deltaSec));
      const rawEndEdge = active.initialStartTime + rawNewDuration;
      const { time: snappedEnd, snapped } = snapTimeValue(rawEndEdge, active.clipId);
      const finalDuration = Math.max(0.4, snappedEnd - active.initialStartTime);
      setSnapGuideTime(snapped ? snappedEnd : null);
      onUpdateClipTiming(
        active.clipId,
        active.initialStartTime,
        +finalDuration.toFixed(2),
        active.initialSourceOffset
      );
    } else if (active.mode === 'slip') {
      // Slip editing adjusts sourceStartOffset without moving the clip on timeline
      const maxOffset = Math.max(0, active.maxDuration - active.initialDuration);
      const nextOffset = Math.max(0, Math.min(maxOffset, active.initialSourceOffset - deltaSec));
      onUpdateClipTiming(
        active.clipId,
        active.initialStartTime,
        active.initialDuration,
        +nextOffset.toFixed(2)
      );
    }
  };

  const handleClipPointerUp = () => {
    dragRef.current = null;
    setSnapGuideTime(null);
  };

  const renderTrackIcon = (id: TrackType) => {
    switch (id) {
      case 'video':
        return <Film className="w-3.5 h-3.5 text-blue-400" />;
      case 'overlay':
        return <Layers className="w-3.5 h-3.5 text-violet-400" />;
      case 'text':
        return <Type className="w-3.5 h-3.5 text-amber-400" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="flex flex-col h-[230px] sm:h-[255px] bg-[#0B0C10] border-b border-white/[0.07] shrink-0 select-none">
      {/* Quick Action & Timeline Utility Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#12141C] border-b border-white/[0.06]">
        {/* Left Quick Actions: Split, Duplicate, Delete, Magnetic Snap */}
        <div className="flex items-center gap-1">
          <button
            onClick={onSplitAtPlayhead}
            disabled={!selectedClipId}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] text-slate-200 hover:bg-white/[0.1] disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0"
            title="Split Selected Clip at Playhead (S)"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>Split</span>
          </button>

          <button
            onClick={onDuplicateSelected}
            disabled={!selectedClipId}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] text-slate-200 hover:bg-white/[0.1] disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0"
            title="Duplicate Selected Clip (D)"
          >
            <Copy className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          <button
            onClick={onDeleteSelected}
            disabled={!selectedClipId}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] text-rose-300 hover:bg-rose-500/20 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0"
            title="Delete Selected Clip (Backspace)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10 mx-1" />

          <button
            onClick={onToggleMagneticSnap}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              magneticSnap
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'bg-white/[0.04] text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Magnetic Timeline Snapping"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Snap</span>
          </button>
        </div>

        {/* Right: Import Media & Timeline Horizontal Zoom */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onTriggerMediaUpload('video')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Import Media</span>
          </button>

          <div className="hidden sm:flex items-center gap-1 bg-white/[0.04] rounded-lg px-1.5 py-0.5">
            <button
              onClick={() => setPxPerSec((p) => Math.max(32, p - 12))}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Zoom Out Timeline"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono-tabular text-[11px] text-slate-400 w-9 text-center">
              {Math.round((pxPerSec / 64) * 100)}%
            </span>
            <button
              onClick={() => setPxPerSec((p) => Math.min(140, p + 12))}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Zoom In Timeline"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Multi-Track Workspace */}
      <div
        ref={scrollContainerRef}
        className="relative flex-1 overflow-x-auto overflow-y-auto bg-[#090A0F]"
      >
        <div
          className="relative min-h-full"
          style={{ width: `${trackHeaderWidth + timelineWidthPx}px` }}
        >
          {/* Sticky Timecode Ruler Row */}
          <div className="sticky top-0 z-20 flex h-7 bg-[#10121A]/95 backdrop-blur-sm border-b border-white/[0.07]">
            {/* Corner Header Label */}
            <div
              className="sticky left-0 z-30 flex items-center justify-between px-2.5 bg-[#12141C] border-r border-white/[0.07] text-[11px] font-mono-tabular text-slate-400 shrink-0"
              style={{ width: `${trackHeaderWidth}px` }}
            >
              <span>TRACKS</span>
              <span>{formatTimestamp(playhead)}</span>
            </div>

            {/* Interactive Timecode Ruler */}
            <div
              ref={rulerRef}
              onPointerDown={handleRulerPointerDown}
              onPointerMove={handleRulerPointerMove}
              onPointerUp={handleRulerPointerUp}
              className="relative flex-1 cursor-ew-resize"
            >
              {Array.from({ length: timelineSpanSeconds + 1 }).map((_, sec) => {
                const leftPx = sec * pxPerSec;
                return (
                  <div
                    key={sec}
                    className="absolute top-0 bottom-0 flex flex-col justify-end pointer-events-none"
                    style={{ left: `${leftPx}px` }}
                  >
                    <div className="flex items-center gap-1 -translate-x-1/2 mb-1">
                      <span className="font-mono-tabular text-[10px] text-slate-400">
                        {sec}s
                      </span>
                    </div>
                    <div className="h-2 w-[1px] bg-white/25" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Multi-Track Lanes */}
          <div className="divide-y divide-white/[0.05]">
            {tracks.map((track) => {
              const trackClips = clips.filter((c) => c.trackId === track.id);
              return (
                <div
                  key={track.id}
                  className="relative flex h-11 sm:h-12 group hover:bg-white/[0.01] transition-colors"
                >
                  {/* Sticky Left Track Header Controls */}
                  <div
                    className="sticky left-0 z-20 flex items-center justify-between px-2 bg-[#12141C] border-r border-white/[0.07] shrink-0"
                    style={{ width: `${trackHeaderWidth}px` }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {renderTrackIcon(track.id)}
                      <span className="text-[11px] font-semibold tracking-tight text-slate-300 truncate">
                        {track.shortLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5">
                      {track.id === 'audio' || track.id === 'video' ? (
                        <button
                          onClick={() => onToggleTrackMute(track.id)}
                          className={`p-1 rounded hover:bg-white/10 transition-colors ${
                            track.muted ? 'text-rose-400' : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title={track.muted ? 'Unmute Track' : 'Mute Track'}
                        >
                          {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                        </button>
                      ) : null}

                      {track.id !== 'audio' && (
                        <button
                          onClick={() => onToggleTrackVisible(track.id)}
                          className={`p-1 rounded hover:bg-white/10 transition-colors ${
                            !track.visible ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title={track.visible ? 'Hide Track' : 'Show Track'}
                        >
                          {track.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>
                      )}

                      <button
                        onClick={() => onToggleTrackLock(track.id)}
                        className={`p-1 rounded hover:bg-white/10 transition-colors ${
                          track.locked ? 'text-amber-400' : 'text-slate-500 hover:text-slate-200'
                        }`}
                        title={track.locked ? 'Unlock Track' : 'Lock Track'}
                      >
                        {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Track Clip Canvas Lane */}
                  <div
                    className="relative flex-1"
                    onClick={(e) => {
                      if (e.target === e.currentTarget) {
                        const clickedSec = clientXToSeconds(e.clientX);
                        onSeek(clickedSec);
                      }
                    }}
                  >
                    {trackClips.map((clip) => {
                      const leftPx = clip.startTime * pxPerSec;
                      const widthPx = Math.max(24, clip.duration * pxPerSec);
                      const isSelected = clip.id === selectedClipId;

                      return (
                        <div
                          key={clip.id}
                          onPointerDown={(e) =>
                            startClipInteraction(e, clip, e.altKey ? 'slip' : 'move')
                          }
                          onPointerMove={handleClipPointerMove}
                          onPointerUp={handleClipPointerUp}
                          style={{
                            left: `${leftPx}px`,
                            width: `${widthPx}px`,
                            backgroundColor: `${clip.accentColor}28`,
                            borderColor: isSelected ? '#F59E0B' : `${clip.accentColor}88`,
                          }}
                          className={`absolute top-1 bottom-1 rounded-md border overflow-hidden cursor-grab active:cursor-grabbing transition-shadow ${
                            isSelected ? 'ring-2 ring-amber-400/70 z-10 shadow-lg' : 'hover:brightness-110'
                          }`}
                        >
                          {/* Top Accent Bar */}
                          <div
                            className="h-1 w-full"
                            style={{ backgroundColor: clip.accentColor }}
                          />

                          {/* Clip Label & Metadata */}
                          <div className="flex items-center justify-between px-2 pt-0.5 text-[11px] font-medium text-slate-100 pointer-events-none">
                            <span className="truncate">{clip.name}</span>
                            {clip.speed !== 1 && (
                              <span className="font-mono-tabular text-[10px] text-amber-300 ml-1 shrink-0">
                                {clip.speed}x
                              </span>
                            )}
                          </div>

                          {/* Transition Badge Indicator */}
                          {clip.transitionIn.type !== 'none' && (
                            <div
                              className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-black/60 px-1 py-0.5 rounded text-[9px] text-amber-300 pointer-events-none"
                              title={`Transition: ${clip.transitionIn.type}`}
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                            </div>
                          )}

                          {/* Dynamic Audio Waveform Bars */}
                          {clip.trackId === 'audio' && clip.waveform && (
                            <div className="absolute inset-x-2 bottom-1 h-4 flex items-end gap-[2px] opacity-65 pointer-events-none">
                              {clip.waveform.map((val, idx) => (
                                <div
                                  key={idx}
                                  className="flex-1 bg-emerald-400 rounded-t-xs"
                                  style={{ height: `${Math.max(15, val * 100)}%` }}
                                />
                              ))}
                            </div>
                          )}

                          {/* Beat Marker Dots on Audio Track */}
                          {clip.trackId === 'audio' &&
                            clip.beatMarkers?.map((bm, i) => {
                              if (bm > clip.duration) return null;
                              return (
                                <div
                                  key={i}
                                  style={{ left: `${bm * pxPerSec}px` }}
                                  className="absolute bottom-0.5 w-1.5 h-1.5 -translate-x-1/2 rotate-45 bg-amber-400 pointer-events-none"
                                  title={`Beat Marker ${bm.toFixed(1)}s`}
                                />
                              );
                            })}

                          {/* Keyframe Diamonds on Clip */}
                          {clip.keyframes.map((kf) => {
                            if (kf.timeOffset > clip.duration) return null;
                            return (
                              <div
                                key={kf.id}
                                style={{ left: `${kf.timeOffset * pxPerSec}px` }}
                                className="absolute bottom-1 w-2 h-2 -translate-x-1/2 rotate-45 bg-amber-400 border border-slate-950 shadow pointer-events-none"
                                title={`Keyframe @ +${kf.timeOffset.toFixed(2)}s`}
                              />
                            );
                          })}

                          {/* Left & Right Trim Handles when Selected */}
                          {isSelected && !track.locked && (
                            <>
                              <div
                                onPointerDown={(e) => startClipInteraction(e, clip, 'trim-start')}
                                onPointerMove={handleClipPointerMove}
                                onPointerUp={handleClipPointerUp}
                                className="absolute left-0 top-0 bottom-0 w-3 bg-amber-400/90 hover:bg-amber-300 flex items-center justify-center cursor-ew-resize z-20"
                                title="Drag to Trim In-Point"
                              >
                                <div className="w-0.5 h-4 bg-slate-950 rounded-full" />
                              </div>
                              <div
                                onPointerDown={(e) => startClipInteraction(e, clip, 'trim-end')}
                                onPointerMove={handleClipPointerMove}
                                onPointerUp={handleClipPointerUp}
                                className="absolute right-0 top-0 bottom-0 w-3 bg-amber-400/90 hover:bg-amber-300 flex items-center justify-center cursor-ew-resize z-20"
                                title="Drag to Trim Out-Point"
                              >
                                <div className="w-0.5 h-4 bg-slate-950 rounded-full" />
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Magnetic Snap Alignment Vertical Guide */}
          {snapGuideTime !== null && (
            <div
              className="absolute top-0 bottom-0 z-30 w-[1px] bg-amber-400 pointer-events-none shadow-[0_0_8px_#F59E0B]"
              style={{ left: `${trackHeaderWidth + snapGuideTime * pxPerSec}px` }}
            />
          )}

          {/* Draggable Scrubber Playhead Line */}
          <div
            className="absolute top-0 bottom-0 z-30 pointer-events-none"
            style={{ left: `${trackHeaderWidth + playhead * pxPerSec}px` }}
          >
            {/* Playhead Cap */}
            <div
              onPointerDown={handleRulerPointerDown}
              onPointerMove={handleRulerPointerMove}
              onPointerUp={handleRulerPointerUp}
              className="w-3.5 h-4 -ml-[7px] bg-amber-400 rounded-t-xs clip-path-polygon pointer-events-auto cursor-ew-resize shadow-md border border-slate-950"
            />
            {/* Playhead Vertical Line */}
            <div className="w-[1.5px] h-full -ml-[0.75px] bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
          </div>
        </div>
      </div>
    </div>
  );
};
