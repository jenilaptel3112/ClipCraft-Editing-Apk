import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Grid,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crop,
} from 'lucide-react';
import { AspectRatio, FitMode, TimelineClip, TrackMeta } from '../types/editor';
import { formatTimestamp } from '../utils/presets';
import { renderCompositeFrame } from '../utils/canvasRenderer';

interface PreviewPlayerProps {
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
  onSeek: (time: number) => void;
  onUpdateClipTransform: (clipId: string, updates: Partial<TimelineClip>) => void;
  onCycleFitMode: () => void;
}

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({
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
  onSeek,
  onUpdateClipTransform,
  onCycleFitMode,
}) => {
  const [viewportZoom, setViewportZoom] = useState<number>(1);
  const [viewportPan, setViewportPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showSafeGuides, setShowSafeGuides] = useState<boolean>(true);

  // Gesture tracking refs for canvas drag / pinch-to-zoom
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    initialClipX: number;
    initialClipY: number;
    initialPanX: number;
    initialPanY: number;
    pinchDistance: number | null;
    initialZoom: number;
  } | null>(null);

  // Compute target internal resolution based on aspect ratio
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

  // Render composite frame whenever playhead, clips, or settings change
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
      showSafeGuides
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
    showSafeGuides,
  ]);

  const selectedClip = clips.find((c) => c.id === selectedClipId) || null;

  // Pointer & Multi-Touch Pinch-to-Zoom / Pan handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      dragStartRef.current = {
        clientX: 0,
        clientY: 0,
        initialClipX: selectedClip?.x || 0,
        initialClipY: selectedClip?.y || 0,
        initialPanX: viewportPan.x,
        initialPanY: viewportPan.y,
        pinchDistance: dist,
        initialZoom: viewportZoom,
      };
    } else if (e.touches.length === 1) {
      dragStartRef.current = {
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY,
        initialClipX: selectedClip?.x || 0,
        initialClipY: selectedClip?.y || 0,
        initialPanX: viewportPan.x,
        initialPanY: viewportPan.y,
        pinchDistance: null,
        initialZoom: viewportZoom,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    if (e.touches.length === 2 && dragStartRef.current.pinchDistance) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scaleRatio = dist / dragStartRef.current.pinchDistance;
      const nextZoom = Math.max(0.5, Math.min(2.5, dragStartRef.current.initialZoom * scaleRatio));
      setViewportZoom(nextZoom);
    } else if (e.touches.length === 1 && !dragStartRef.current.pinchDistance) {
      const deltaX = e.touches[0].clientX - dragStartRef.current.clientX;
      const deltaY = e.touches[0].clientY - dragStartRef.current.clientY;

      if (selectedClip) {
        onUpdateClipTransform(selectedClip.id, {
          x: Math.round(dragStartRef.current.initialClipX + deltaX * 0.25),
          y: Math.round(dragStartRef.current.initialClipY + deltaY * 0.25),
        });
      } else if (viewportZoom > 1) {
        setViewportPan({
          x: dragStartRef.current.initialPanX + deltaX,
          y: dragStartRef.current.initialPanY + deltaY,
        });
      }
    }
  };

  const handleTouchEnd = () => {
    dragStartRef.current = null;
  };

  // Mouse drag support for desktop positioning
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialClipX: selectedClip?.x || 0,
      initialClipY: selectedClip?.y || 0,
      initialPanX: viewportPan.x,
      initialPanY: viewportPan.y,
      pinchDistance: null,
      initialZoom: viewportZoom,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.clientX;
    const deltaY = e.clientY - dragStartRef.current.clientY;

    if (selectedClip) {
      onUpdateClipTransform(selectedClip.id, {
        x: Math.round(dragStartRef.current.initialClipX + deltaX * 0.22),
        y: Math.round(dragStartRef.current.initialClipY + deltaY * 0.22),
      });
    } else if (viewportZoom > 1) {
      setViewportPan({
        x: dragStartRef.current.initialPanX + deltaX,
        y: dragStartRef.current.initialPanY + deltaY,
      });
    }
  };

  const handleMouseUp = () => {
    dragStartRef.current = null;
  };

  const resetViewZoom = () => {
    setViewportZoom(1);
    setViewportPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative flex flex-col flex-1 min-h-0 bg-[#08090D] border-b border-white/[0.07] select-none overflow-hidden">
      {/* Top Viewport Overlay Controls */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0D0F14]/90 border-b border-white/[0.05] text-xs text-slate-400 z-10">
        <div className="flex items-center gap-2">
          <span>{aspectRatio}</span>
          <span aria-hidden="true">·</span>
          <button
            onClick={onCycleFitMode}
            className="flex items-center gap-1 hover:text-slate-100 transition-colors min-h-[28px] px-1.5 rounded"
            title="Cycle Canvas Fit/Fill/Contain Mode"
          >
            <Crop className="w-3.5 h-3.5 text-amber-400" />
            <span className="capitalize">{fitMode}</span>
          </button>
          <span aria-hidden="true">·</span>
          <button
            onClick={() => setShowSafeGuides((v) => !v)}
            className={`flex items-center gap-1 min-h-[28px] px-1.5 rounded transition-colors ${
              showSafeGuides ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Safe Frame & Rule-of-Thirds Guides"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Guides</span>
          </button>
        </div>

        {/* Canvas Zoom & Reset Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewportZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))}
            className="p-1.5 hover:text-white rounded hover:bg-white/[0.06] transition-colors"
            title="Zoom Out Canvas"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono-tabular text-[11px] text-slate-300 w-11 text-center">
            {Math.round(viewportZoom * 100)}%
          </span>
          <button
            onClick={() => setViewportZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))}
            className="p-1.5 hover:text-white rounded hover:bg-white/[0.06] transition-colors"
            title="Zoom In Canvas"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          {(viewportZoom !== 1 || viewportPan.x !== 0 || viewportPan.y !== 0) && (
            <button
              onClick={resetViewZoom}
              className="p-1.5 text-amber-400 hover:text-amber-300 rounded hover:bg-white/[0.06] transition-colors"
              title="Reset Viewport Zoom & Pan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Interactive Canvas Stage */}
      <div
        className="relative flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="relative flex items-center justify-center max-h-full max-w-full shadow-2xl ring-1 ring-white/10 transition-transform duration-75"
          style={{
            transform: `translate3d(${viewportPan.x}px, ${viewportPan.y}px, 0) scale(${viewportZoom})`,
            aspectRatio: aspectRatio.replace(':', ' / '),
            height: aspectRatio === '16:9' ? 'auto' : '100%',
            width: aspectRatio === '16:9' ? '100%' : 'auto',
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasW}
            height={canvasH}
            className="w-full h-full object-contain rounded-sm bg-black block"
          />
        </div>

        {/* Selected Clip Quick Transform Readout */}
        {selectedClip && (
          <div className="absolute bottom-2 left-3 pointer-events-none flex items-center gap-2 text-[11px] font-mono-tabular text-slate-300 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10">
            <span className="text-amber-400 font-medium truncate max-w-[130px]">{selectedClip.name}</span>
            <span aria-hidden="true">·</span>
            <span>
              X:{selectedClip.x}% Y:{selectedClip.y}%
            </span>
            <span aria-hidden="true">·</span>
            <span>{Math.round(selectedClip.scale * 100)}%</span>
          </div>
        )}
      </div>

      {/* Transport Playback Bar & SMPTE Timestamp Readout */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0D0F14] border-t border-white/[0.06] shrink-0">
        {/* Current Timestamp / Total Duration */}
        <div className="flex items-center gap-1.5 font-mono-tabular text-xs">
          <span className="text-amber-400 font-semibold">{formatTimestamp(playhead)}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">{formatTimestamp(totalDuration)}</span>
        </div>

        {/* Center Transport Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSeek(0)}
            className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Jump to Start (00:00.00)"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={onTogglePlay}
            className="min-w-[42px] min-h-[38px] px-3 flex items-center justify-center rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition-all shadow-sm"
            title={isPlaying ? 'Pause Playback (Space)' : 'Start Playback (Space)'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
          <button
            onClick={() => onSeek(totalDuration)}
            className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Jump to End"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right Quick Scrubber / Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={resetViewZoom}
            className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Fit Canvas to Viewport"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
