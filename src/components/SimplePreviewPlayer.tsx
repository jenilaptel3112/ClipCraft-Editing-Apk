import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { AspectRatio, FitMode, TimelineClip, TrackMeta } from '../types/editor';
import { formatTimestamp } from '../utils/presets';
import { renderCompositeFrame } from '../utils/canvasRenderer';

interface SimplePreviewPlayerProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  playhead: number;
  totalDuration: number;
  isPlaying: boolean;
  aspectRatio: AspectRatio;
  fitMode: FitMode;
  clips: TimelineClip[];
  tracks: TrackMeta[];
  mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>;
  selectedClipId: string | null;
  onTogglePlay: () => void;
  onUpdateClipTransform: (clipId: string, updates: Partial<TimelineClip>) => void;
  onSelectClip: (clipId: string | null) => void;
}

export const SimplePreviewPlayer: React.FC<SimplePreviewPlayerProps> = ({
  canvasRef,
  playhead,
  totalDuration,
  isPlaying,
  aspectRatio,
  fitMode,
  clips,
  tracks,
  mediaElements,
  selectedClipId,
  onTogglePlay,
  onUpdateClipTransform,
}) => {
  const [showPlayIconFlash, setShowPlayIconFlash] = useState<boolean>(false);
  const touchStartRef = useRef<{
    time: number;
    startX: number;
    startY: number;
    initialDistance: number | null;
    initialScale: number;
    initialClipX: number;
    initialClipY: number;
  } | null>(null);

  // Resolution targets
  const getCanvasDimensions = useCallback((): { width: number; height: number } => {
    switch (aspectRatio) {
      case '9:16':
        return { width: 540, height: 960 };
      case '16:9':
        return { width: 960, height: 540 };
      case '1:1':
        return { width: 720, height: 720 };
      case '4:5':
        return { width: 720, height: 900 };
    }
  }, [aspectRatio]);

  const { width: canvasW, height: canvasH } = getCanvasDimensions();

  // Render on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderCompositeFrame(
      ctx,
      canvasW,
      canvasH,
      playhead,
      clips,
      tracks,
      mediaElements,
      fitMode,
      selectedClipId,
      false // Clean zero-clutter monitor
    );
  }, [
    canvasRef,
    canvasW,
    canvasH,
    playhead,
    clips,
    tracks,
    mediaElements,
    fitMode,
    selectedClipId,
  ]);

  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;

  // Single tap on preview toggles play/pause, pinch scales selected clip, drag moves clip
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      touchStartRef.current = {
        time: Date.now(),
        startX: 0,
        startY: 0,
        initialDistance: dist,
        initialScale: selectedClip?.scale || 1,
        initialClipX: selectedClip?.x || 0,
        initialClipY: selectedClip?.y || 0,
      };
    } else if (e.touches.length === 1) {
      touchStartRef.current = {
        time: Date.now(),
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initialDistance: null,
        initialScale: selectedClip?.scale || 1,
        initialClipX: selectedClip?.x || 0,
        initialClipY: selectedClip?.y || 0,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;

    // Pinch to scale selected clip directly
    if (e.touches.length === 2 && touchStartRef.current.initialDistance && selectedClip) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / touchStartRef.current.initialDistance;
      const newScale = Math.max(0.2, Math.min(3.0, +(touchStartRef.current.initialScale * ratio).toFixed(2)));
      onUpdateClipTransform(selectedClip.id, { scale: newScale });
    } else if (e.touches.length === 1 && !touchStartRef.current.initialDistance && selectedClip) {
      const deltaX = e.touches[0].clientX - touchStartRef.current.startX;
      const deltaY = e.touches[0].clientY - touchStartRef.current.startY;
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        onUpdateClipTransform(selectedClip.id, {
          x: Math.round(touchStartRef.current.initialClipX + deltaX * 0.28),
          y: Math.round(touchStartRef.current.initialClipY + deltaY * 0.28),
        });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;
    const elapsed = Date.now() - touchStartRef.current.time;
    // Fast tap without heavy drag = toggle play/pause
    if (elapsed < 280 && e.changedTouches.length === 1 && !touchStartRef.current.initialDistance) {
      const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartRef.current.startX);
      const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.startY);
      if (deltaX < 12 && deltaY < 12) {
        onTogglePlay();
        setShowPlayIconFlash(true);
        setTimeout(() => setShowPlayIconFlash(false), 500);
      }
    }
    touchStartRef.current = null;
  };

  const handleMonitorClick = () => {
    onTogglePlay();
    setShowPlayIconFlash(true);
    setTimeout(() => setShowPlayIconFlash(false), 500);
  };

  return (
    <div className="relative flex flex-col flex-1 min-h-0 bg-[#08090D] overflow-hidden select-none">
      {/* Zero-clutter monitor stage */}
      <div
        className="relative flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden cursor-pointer"
        onClick={handleMonitorClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative flex items-center justify-center max-h-full max-w-full shadow-2xl rounded-xl overflow-hidden ring-1 ring-white/10"
          style={{
            aspectRatio: aspectRatio.replace(':', ' / '),
            height: aspectRatio === '16:9' ? 'auto' : '100%',
            width: aspectRatio === '16:9' ? '100%' : 'auto',
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasW}
            height={canvasH}
            className="w-full h-full object-contain rounded-xl bg-black block"
          />

          {/* Flash play/pause feedback overlay */}
          {showPlayIconFlash && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[2px] transition-opacity duration-300 pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xl animate-scale-in">
                {isPlaying ? (
                  <Play className="w-7 h-7 fill-current ml-1" />
                ) : (
                  <Pause className="w-7 h-7 fill-current" />
                )}
              </div>
            </div>
          )}

          {/* Tap-to-play subtle prompt if paused and initial start */}
          {!isPlaying && playhead === 0 && !showPlayIconFlash && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-medium">
                <Play className="w-3.5 h-3.5 fill-current text-amber-400" />
                <span>Tap preview to play</span>
              </div>
            </div>
          )}
        </div>

        {/* Minimal clean time badge floating on preview */}
        <div className="absolute bottom-2 left-3 pointer-events-none flex items-center gap-1.5 font-mono-tabular text-xs bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
          <span className="text-amber-400 font-semibold">{formatTimestamp(playhead)}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-300">{formatTimestamp(totalDuration)}</span>
        </div>

        {/* Clip badge if selected */}
        {selectedClip && (
          <div className="absolute top-2 right-3 pointer-events-none flex items-center gap-1.5 text-[11px] bg-amber-500/15 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-500/30 text-amber-300 font-medium truncate max-w-[170px]">
            <span className="truncate">{selectedClip.name}</span>
          </div>
        )}
      </div>
    </div>
  );
};
