import React, { useState, useRef, useCallback } from 'react';
import { Move, RotateCcw, Maximize2, Compass, Box } from 'lucide-react';
import { TimelineClip, GizmoMode } from '../types/editor';

interface Viewport3DGizmoProps {
  selectedClip: TimelineClip;
  onUpdateTransform: (clipId: string, updates: Partial<TimelineClip>) => void;
  containerWidth: number;
  containerHeight: number;
}

export const Viewport3DGizmo: React.FC<Viewport3DGizmoProps> = ({
  selectedClip,
  onUpdateTransform,
  containerWidth,
  containerHeight,
}) => {
  const [activeMode, setActiveMode] = useState<GizmoMode>('translate');
  const [activeAxis, setActiveAxis] = useState<'x' | 'y' | 'z' | null>(null);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialZ: number;
    initialRotX: number;
    initialRotY: number;
    initialRotZ: number;
    initialScale: number;
  } | null>(null);

  // Position of gizmo center mapped to screen
  const posX = (containerWidth / 2) + ((selectedClip.x || 0) / 100) * (containerWidth / 2);
  const posY = (containerHeight / 2) + ((selectedClip.y || 0) / 100) * (containerHeight / 2);

  const startAxisDrag = (axis: 'x' | 'y' | 'z', e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveAxis(axis);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: selectedClip.x || 0,
      initialY: selectedClip.y || 0,
      initialZ: selectedClip.z || 0,
      initialRotX: selectedClip.rotateX || 0,
      initialRotY: selectedClip.rotateY || 0,
      initialRotZ: selectedClip.rotateZ ?? selectedClip.rotation ?? 0,
      initialScale: selectedClip.scale || 1,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeAxis || !dragStartRef.current) return;
    e.stopPropagation();

    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (activeMode === 'translate') {
      if (activeAxis === 'x') {
        const nextX = Math.round(dragStartRef.current.initialX + (dx / (containerWidth * 0.5)) * 100);
        onUpdateTransform(selectedClip.id, { x: nextX });
      } else if (activeAxis === 'y') {
        const nextY = Math.round(dragStartRef.current.initialY + (dy / (containerHeight * 0.5)) * 100);
        onUpdateTransform(selectedClip.id, { y: nextY });
      } else if (activeAxis === 'z') {
        const nextZ = Math.round(dragStartRef.current.initialZ - dy * 2.5);
        onUpdateTransform(selectedClip.id, { z: nextZ });
      }
    } else if (activeMode === 'rotate') {
      if (activeAxis === 'x') {
        const nextRotX = Math.round(dragStartRef.current.initialRotX + dy * 0.8) % 360;
        onUpdateTransform(selectedClip.id, { rotateX: nextRotX });
      } else if (activeAxis === 'y') {
        const nextRotY = Math.round(dragStartRef.current.initialRotY + dx * 0.8) % 360;
        onUpdateTransform(selectedClip.id, { rotateY: nextRotY });
      } else if (activeAxis === 'z') {
        const nextRotZ = Math.round(dragStartRef.current.initialRotZ + (dx + dy) * 0.6) % 360;
        onUpdateTransform(selectedClip.id, { rotateZ: nextRotZ, rotation: nextRotZ });
      }
    } else if (activeMode === 'scale') {
      const deltaScale = (dx - dy) * 0.008;
      const nextScale = Math.max(0.1, Math.min(4.0, +(dragStartRef.current.initialScale + deltaScale).toFixed(2)));
      onUpdateTransform(selectedClip.id, { scale: nextScale });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeAxis) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setActiveAxis(null);
      dragStartRef.current = null;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30 overflow-hidden">
      {/* Gizmo Mode Switcher Toolbar (Pinned Top-Left of Preview) */}
      <div className="absolute top-2 left-2 pointer-events-auto flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-lg">
        <button
          onClick={() => setActiveMode('translate')}
          className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
            activeMode === 'translate'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Translate (Move X, Y, Z)"
        >
          <Move className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Move</span>
        </button>

        <button
          onClick={() => setActiveMode('rotate')}
          className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
            activeMode === 'rotate'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Rotate (3D Orientation)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Rotate</span>
        </button>

        <button
          onClick={() => setActiveMode('scale')}
          className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
            activeMode === 'scale'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
          title="Scale (3D Dimension)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Scale</span>
        </button>
      </div>

      {/* 3D Coordinate Live HUD */}
      <div className="absolute top-2 right-2 pointer-events-none bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 text-[10px] font-mono-tabular text-slate-300 flex items-center gap-2">
        <span className="text-red-400 font-bold">X: {selectedClip.x || 0}</span>
        <span className="text-emerald-400 font-bold">Y: {selectedClip.y || 0}</span>
        <span className="text-sky-400 font-bold">Z: {selectedClip.z || 0}</span>
        {activeMode === 'rotate' && (
          <span className="text-amber-400 font-bold">
            Rx:{selectedClip.rotateX || 0}° Ry:{selectedClip.rotateY || 0}°
          </span>
        )}
      </div>

      {/* Central Interactive 3D RGB Gizmo Handles */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: `${posX}px`,
          top: `${posY}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {activeMode === 'translate' && (
          <div className="relative w-28 h-28 -ml-14 -mt-14">
            {/* Center Anchor Pivot */}
            <div className="absolute left-1/2 top-1/2 -ml-2 -mt-2 w-4 h-4 rounded-full bg-white/90 border-2 border-amber-400 shadow-md pointer-events-none" />

            {/* X Axis Arrow (Red / Horizontal) */}
            <div
              onPointerDown={(e) => startAxisDrag('x', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="absolute left-1/2 top-1/2 h-1.5 w-14 bg-red-500 rounded-r-full cursor-ew-resize hover:h-2.5 transition-all shadow-md group origin-left"
            >
              <div className="absolute right-0 top-1/2 -mt-2 -mr-1 w-0 h-0 border-y-4 border-y-transparent border-l-8 border-l-red-500 group-hover:scale-125 transition-transform" />
              <span className="absolute -top-4 right-1 text-[9px] font-bold text-red-400">X</span>
            </div>

            {/* Y Axis Arrow (Green / Vertical) */}
            <div
              onPointerDown={(e) => startAxisDrag('y', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="absolute left-1/2 top-1/2 w-1.5 h-14 bg-emerald-500 rounded-b-full cursor-ns-resize hover:w-2.5 transition-all shadow-md group origin-top"
            >
              <div className="absolute bottom-0 left-1/2 -ml-2 -mb-1 w-0 h-0 border-x-4 border-x-transparent border-t-8 border-t-emerald-500 group-hover:scale-125 transition-transform" />
              <span className="absolute bottom-1 -left-4 text-[9px] font-bold text-emerald-400">Y</span>
            </div>

            {/* Z Axis Dial (Blue / Depth) */}
            <div
              onPointerDown={(e) => startAxisDrag('z', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="absolute left-1/2 top-1/2 -ml-7 -mt-7 w-14 h-14 rounded-full border-2 border-sky-400/80 hover:border-sky-300 hover:border-4 cursor-grab active:cursor-grabbing transition-all flex items-center justify-center shadow-lg"
              title="Drag Z-Depth"
            >
              <span className="text-[9px] font-extrabold text-sky-400 bg-black/60 px-1 rounded">Z</span>
            </div>
          </div>
        )}

        {activeMode === 'rotate' && (
          <div className="relative w-32 h-32 -ml-16 -mt-16">
            {/* Center anchor */}
            <div className="absolute left-1/2 top-1/2 -ml-1.5 -mt-1.5 w-3 h-3 rounded-full bg-amber-400 pointer-events-none" />

            {/* Rotate X Arc (Red) */}
            <div
              onPointerDown={(e) => startAxisDrag('x', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="absolute inset-0 rounded-full border-2 border-dashed border-red-500/70 hover:border-red-400 hover:border-3 cursor-grab transition-all"
              style={{ transform: 'rotateX(60deg)' }}
              title="Rotate X (Tilt)"
            />

            {/* Rotate Y Arc (Green) */}
            <div
              onPointerDown={(e) => startAxisDrag('y', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-500/70 hover:border-emerald-400 hover:border-3 cursor-grab transition-all"
              style={{ transform: 'rotateY(60deg)' }}
              title="Rotate Y (Pan)"
            />

            {/* Rotate Z Ring (Blue) */}
            <div
              onPointerDown={(e) => startAxisDrag('z', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="absolute inset-0 rounded-full border-2 border-sky-400 hover:border-3 cursor-grab transition-all"
              title="Rotate Z (Roll)"
            />
          </div>
        )}

        {activeMode === 'scale' && (
          <div className="relative w-24 h-24 -ml-12 -mt-12 flex items-center justify-center">
            <div
              onPointerDown={(e) => startAxisDrag('x', e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="w-16 h-16 rounded-2xl border-2 border-amber-400 bg-amber-500/10 hover:bg-amber-500/25 cursor-nwse-resize flex items-center justify-center transition-all shadow-xl"
            >
              <Maximize2 className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
