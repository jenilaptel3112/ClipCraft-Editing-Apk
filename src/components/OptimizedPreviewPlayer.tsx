import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import { Play, Pause, Compass, Box, PenTool } from 'lucide-react';
import {
  AspectRatio,
  FitMode,
  TimelineClip,
  TrackMeta,
  BrushType,
  DrawingStroke,
  DrawingPoint,
  ResolutionTier,
  ProjectFrameRate,
  TimecodeDisplayMode,
} from '../types/editor';
import { formatTimestamp, formatTimecode } from '../utils/presets';
import { renderCompositeFrame } from '../utils/canvasRenderer';
import { threeSceneManager } from '../utils/threeSceneManager';
import { Viewport3DGizmo } from './Viewport3DGizmo';

interface OptimizedPreviewPlayerProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  currentTimeRef: React.MutableRefObject<number>;
  totalDuration: number;
  isPlaying: boolean;
  aspectRatio: AspectRatio;
  fitMode: FitMode;
  clips: TimelineClip[];
  tracks: TrackMeta[];
  mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>;
  selectedClipId: string | null;
  customDimensions?: { width: number; height: number };
  resolutionTier?: ResolutionTier;
  backgroundColor?: string;
  backgroundBlurFallback?: boolean;
  timecodeDisplay?: TimecodeDisplayMode;
  frameRate?: ProjectFrameRate;
  isDraftScrubbing?: boolean;
  isDrawingMode?: boolean;
  activeBrush?: BrushType;
  brushColor?: string;
  brushWidth?: number;
  brushOpacity?: number;
  brushCap?: 'round' | 'square';
  onTogglePlay: () => void;
  onUpdateClipTransform: (clipId: string, updates: Partial<TimelineClip>) => void;
  onAddDrawingStroke?: (stroke: DrawingStroke) => void;
  registerRenderTrigger?: (trigger: (time: number, isDraft?: boolean) => void) => void;
}

export const OptimizedPreviewPlayer: React.FC<OptimizedPreviewPlayerProps> = memo(
  ({
    canvasRef,
    currentTimeRef,
    totalDuration,
    isPlaying,
    aspectRatio,
    fitMode,
    clips,
    tracks,
    mediaElements,
    selectedClipId,
    customDimensions,
    resolutionTier = '1080p',
    backgroundColor = '#000000',
    backgroundBlurFallback = true,
    timecodeDisplay = 'compact',
    frameRate = 30,
    isDraftScrubbing = false,
    isDrawingMode = false,
    activeBrush = 'pen',
    brushColor = '#F59E0B',
    brushWidth = 6,
    brushOpacity = 1,
    brushCap = 'round',
    onTogglePlay,
    onUpdateClipTransform,
    onAddDrawingStroke,
    registerRenderTrigger,
  }) => {
    const [showPlayIconFlash, setShowPlayIconFlash] = useState<boolean>(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const timecodeDisplayRef = useRef<HTMLSpanElement | null>(null);

    // Active drawing stroke state during mouse/touch drag
    const currentStrokePointsRef = useRef<DrawingPoint[]>([]);
    const [isCurrentlyDrawing, setIsCurrentlyDrawing] = useState(false);

    const touchStartRef = useRef<{
      time: number;
      startX: number;
      startY: number;
      initialDistance: number | null;
      initialAngle: number | null;
      initialScale: number;
      initialClipX: number;
      initialClipY: number;
      initialRotZ: number;
    } | null>(null);

    const getCanvasDimensions = useCallback((): { width: number; height: number } => {
      if (aspectRatio === 'custom' && customDimensions) {
        const ratio = customDimensions.width / Math.max(1, customDimensions.height);
        if (ratio >= 1) {
          return { width: 960, height: Math.round(960 / ratio) };
        } else {
          return { width: Math.round(960 * ratio), height: 960 };
        }
      }

      switch (aspectRatio) {
        case '9:16':
          return { width: 540, height: 960 };
        case '16:9':
          return { width: 960, height: 540 };
        case '1:1':
          return { width: 720, height: 720 };
        case '4:5':
          return { width: 720, height: 900 };
        case '21:9':
          return { width: 960, height: 411 };
        case '4:3':
          return { width: 720, height: 540 };
        default:
          return { width: 540, height: 960 };
      }
    }, [aspectRatio, customDimensions]);

    const { width: canvasW, height: canvasH } = getCanvasDimensions();

    const selectedClip = clips.find((c) => c.id === selectedClipId) || null;
    const is3DActive = selectedClip && (selectedClip.is3D || selectedClip.mediaType === 'null' || selectedClip.mediaType === 'camera');

    // High performance frame render function
    const drawCurrentFrame = useCallback(
      (time: number, isDraft: boolean = false) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Check if 3D scene activation is required
        const has3D = threeSceneManager.hasActive3DLayers(clips);

        if (has3D) {
          threeSceneManager.init(canvas);
          threeSceneManager.setSize(canvasW, canvasH);
          threeSceneManager.render3D(clips, tracks, time, mediaElements, {
            width: canvasW,
            height: canvasH,
            selectedClipId,
          });
        } else {
          // Standard high-efficiency 2D Canvas pipeline
          const ctx = canvas.getContext('2d');
          if (ctx) {
            renderCompositeFrame(
              ctx,
              canvasW,
              canvasH,
              time,
              clips,
              tracks,
              mediaElements,
              fitMode,
              selectedClipId,
              false,
              isDraft,
              backgroundColor,
              backgroundBlurFallback
            );
          }
        }

        // Direct DOM update for 60fps playhead timecode
        if (timecodeDisplayRef.current) {
          timecodeDisplayRef.current.textContent = formatTimecode(time, timecodeDisplay, frameRate);
        }
      },
      [canvasRef, canvasW, canvasH, clips, tracks, mediaElements, fitMode, selectedClipId, backgroundColor, backgroundBlurFallback, timecodeDisplay, frameRate]
    );

    // Register callback so RAF loop or scrubber gesture can trigger raw canvas render directly
    useEffect(() => {
      if (registerRenderTrigger) {
        registerRenderTrigger(drawCurrentFrame);
      }
    }, [registerRenderTrigger, drawCurrentFrame]);

    // Initial and prop change re-render
    useEffect(() => {
      drawCurrentFrame(currentTimeRef.current, isDraftScrubbing);
    }, [drawCurrentFrame, currentTimeRef, isDraftScrubbing]);

    // ==========================================
    // VECTOR DRAWING TOUCH / MOUSE LISTENERS
    // ==========================================
    const handleDrawingPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingMode || !onAddDrawingStroke) return;
      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = canvasW / rect.width;
      const scaleY = canvasH / rect.height;

      const pt: DrawingPoint = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
        pressure: e.pressure || 0.5,
      };

      currentStrokePointsRef.current = [pt];
      setIsCurrentlyDrawing(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handleDrawingPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isCurrentlyDrawing || !isDrawingMode) return;
      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = canvasW / rect.width;
      const scaleY = canvasH / rect.height;

      const pt: DrawingPoint = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
        pressure: e.pressure || 0.5,
      };

      currentStrokePointsRef.current.push(pt);
      // Trigger instant frame redraw with draft points
      drawCurrentFrame(currentTimeRef.current, true);
    };

    const handleDrawingPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isCurrentlyDrawing) return;
      setIsCurrentlyDrawing(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}

      if (currentStrokePointsRef.current.length > 0 && onAddDrawingStroke) {
        const newStroke: DrawingStroke = {
          id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          points: [...currentStrokePointsRef.current],
          color: brushColor,
          width: brushWidth,
          opacity: brushOpacity,
          brushType: activeBrush,
          cap: brushCap,
        };
        onAddDrawingStroke(newStroke);
      }
      currentStrokePointsRef.current = [];
      drawCurrentFrame(currentTimeRef.current, false);
    };

    // ==========================================
    // TWO-FINGER TWIST & PINCH-TO-SCALE GESTURES
    // ==========================================
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
      if (isDrawingMode) return;

      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const initialAngle = Math.atan2(dy, dx) * (180 / Math.PI);

        touchStartRef.current = {
          time: Date.now(),
          startX: 0,
          startY: 0,
          initialDistance: Math.hypot(dx, dy),
          initialAngle,
          initialScale: selectedClip?.scale || 1,
          initialClipX: selectedClip?.x || 0,
          initialClipY: selectedClip?.y || 0,
          initialRotZ: selectedClip?.rotateZ ?? selectedClip?.rotation ?? 0,
        };
      } else if (e.touches.length === 1) {
        touchStartRef.current = {
          time: Date.now(),
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          initialDistance: null,
          initialAngle: null,
          initialScale: selectedClip?.scale || 1,
          initialClipX: selectedClip?.x || 0,
          initialClipY: selectedClip?.y || 0,
          initialRotZ: selectedClip?.rotateZ ?? selectedClip?.rotation ?? 0,
        };
      }
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
      if (isDrawingMode || !touchStartRef.current || !selectedClip) return;

      if (e.touches.length === 2 && touchStartRef.current.initialDistance) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const ratio = dist / touchStartRef.current.initialDistance;
        const newScale = Math.max(0.2, Math.min(3.5, +(touchStartRef.current.initialScale * ratio).toFixed(2)));

        // Two-finger twist for 3D Z-rotation
        const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        const angleDiff = currentAngle - (touchStartRef.current.initialAngle || 0);
        const nextRotZ = Math.round(touchStartRef.current.initialRotZ + angleDiff) % 360;

        onUpdateClipTransform(selectedClip.id, {
          scale: newScale,
          rotateZ: nextRotZ,
          rotation: nextRotZ,
        });
      } else if (e.touches.length === 1 && !touchStartRef.current.initialDistance && !is3DActive) {
        // 2D drag
        const deltaX = e.touches[0].clientX - touchStartRef.current.startX;
        const deltaY = e.touches[0].clientY - touchStartRef.current.startY;
        if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
          onUpdateClipTransform(selectedClip.id, {
            x: Math.round(touchStartRef.current.initialClipX + deltaX * 0.28),
            y: Math.round(touchStartRef.current.initialClipY + deltaY * 0.28),
          });
        }
      }
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
      if (isDrawingMode || !touchStartRef.current) return;
      const elapsed = Date.now() - touchStartRef.current.time;
      if (elapsed < 280 && e.changedTouches.length === 1 && !touchStartRef.current.initialDistance && !is3DActive) {
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

    const handleMonitorClick = (e: React.MouseEvent) => {
      if (isDrawingMode || is3DActive) return;
      onTogglePlay();
      setShowPlayIconFlash(true);
      setTimeout(() => setShowPlayIconFlash(false), 500);
    };

    return (
      <div
        ref={containerRef}
        className="relative flex flex-col flex-1 min-h-0 bg-[#08090D] overflow-hidden select-none"
      >
        <div
          className="relative flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden"
          onClick={handleMonitorClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="relative flex items-center justify-center max-h-full max-w-full shadow-2xl rounded-xl overflow-hidden ring-1 ring-white/10"
            style={{
              aspectRatio:
                aspectRatio === 'custom' && customDimensions
                  ? `${customDimensions.width} / ${customDimensions.height}`
                  : aspectRatio.replace(':', ' / '),
              height: aspectRatio === '16:9' || aspectRatio === '21:9' ? 'auto' : '100%',
              width: aspectRatio === '16:9' || aspectRatio === '21:9' ? '100%' : 'auto',
              backgroundColor: backgroundColor || '#000000',
            }}
          >
            <canvas
              ref={canvasRef}
              width={canvasW}
              height={canvasH}
              onPointerDown={handleDrawingPointerDown}
              onPointerMove={handleDrawingPointerMove}
              onPointerUp={handleDrawingPointerUp}
              className={`w-full h-full object-contain rounded-xl block ${
                isDrawingMode ? 'cursor-crosshair touch-none' : 'cursor-default'
              }`}
            />

            {/* Interactive 3D Viewport Gizmo Overlay */}
            {is3DActive && selectedClip && (
              <Viewport3DGizmo
                selectedClip={selectedClip}
                onUpdateTransform={onUpdateClipTransform}
                containerWidth={canvasW}
                containerHeight={canvasH}
              />
            )}

            {/* Play/Pause Center Flash Icon */}
            {showPlayIconFlash && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[2px] pointer-events-none transition-opacity duration-300">
                <div className="w-16 h-16 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xl">
                  {isPlaying ? (
                    <Play className="w-7 h-7 fill-current ml-1" />
                  ) : (
                    <Pause className="w-7 h-7 fill-current" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Timecode badge with direct DOM update */}
          <div className="absolute bottom-2 left-3 pointer-events-none flex items-center gap-1.5 font-mono-tabular text-xs bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
            <span ref={timecodeDisplayRef} className="text-amber-400 font-semibold">
              {formatTimecode(currentTimeRef.current, timecodeDisplay, frameRate)}
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-300">{formatTimecode(totalDuration, timecodeDisplay, frameRate)}</span>
          </div>

          {/* Active 3D or Drawing indicator badge */}
          <div className="absolute top-2 right-3 pointer-events-none flex items-center gap-1.5 text-[11px] font-medium">
            {isDrawingMode && (
              <div className="flex items-center gap-1 bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/30">
                <PenTool className="w-3 h-3" />
                <span>Draw on Canvas</span>
              </div>
            )}
            {is3DActive && (
              <div className="flex items-center gap-1 bg-sky-500/20 text-sky-300 px-2.5 py-1 rounded-full border border-sky-500/30">
                <Box className="w-3 h-3" />
                <span>3D Spatial</span>
              </div>
            )}
            {selectedClip && !isDrawingMode && !is3DActive && (
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-slate-300 truncate max-w-[170px]">
                <span className="truncate">{selectedClip.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

OptimizedPreviewPlayer.displayName = 'OptimizedPreviewPlayer';
