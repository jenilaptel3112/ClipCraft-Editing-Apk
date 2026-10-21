import React from 'react';
import {
  PenTool,
  Highlighter,
  Sparkles,
  Eraser,
  Undo2,
  Trash2,
  Sliders,
  Play,
  RotateCcw,
} from 'lucide-react';
import { BottomDrawer } from './BottomDrawer';
import { TimelineClip, DrawingData, BrushType } from '../types/editor';

interface VectorDrawingDrawerProps {
  isOpen: boolean;
  selectedClip: TimelineClip | null;
  activeBrush: BrushType;
  brushColor: string;
  brushWidth: number;
  brushOpacity: number;
  brushCap: 'round' | 'square';
  onClose: () => void;
  onSelectBrush: (b: BrushType) => void;
  onChangeColor: (c: string) => void;
  onChangeWidth: (w: number) => void;
  onChangeOpacity: (o: number) => void;
  onChangeCap: (cap: 'round' | 'square') => void;
  onUndoStroke: () => void;
  onClearDrawing: () => void;
  onUpdateTrimPaths: (startTrim: number, endTrim: number) => void;
}

const PRESET_COLORS = [
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#FFFFFF', // White
  '#000000', // Black
];

export const VectorDrawingDrawer: React.FC<VectorDrawingDrawerProps> = ({
  isOpen,
  selectedClip,
  activeBrush,
  brushColor,
  brushWidth,
  brushOpacity,
  brushCap,
  onClose,
  onSelectBrush,
  onChangeColor,
  onChangeWidth,
  onChangeOpacity,
  onChangeCap,
  onUndoStroke,
  onClearDrawing,
  onUpdateTrimPaths,
}) => {
  const drawingData = selectedClip?.drawingData || {
    strokes: [],
    startTrim: 0,
    endTrim: 100,
  };

  return (
    <BottomDrawer isOpen={isOpen} title="Vector Drawing & Brushes" onClose={onClose}>
      <div className="space-y-4">
        {/* Brush Type Selector */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => onSelectBrush('pen')}
            className={`p-2.5 rounded-2xl border text-center flex flex-col items-center gap-1 transition-all ${
              activeBrush === 'pen'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-md'
                : 'bg-white/[0.04] border-white/10 text-slate-300'
            }`}
          >
            <PenTool className="w-5 h-5 text-amber-400" />
            <span className="text-[11px]">Pen Curve</span>
          </button>

          <button
            onClick={() => onSelectBrush('marker')}
            className={`p-2.5 rounded-2xl border text-center flex flex-col items-center gap-1 transition-all ${
              activeBrush === 'marker'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-md'
                : 'bg-white/[0.04] border-white/10 text-slate-300'
            }`}
          >
            <Highlighter className="w-5 h-5 text-emerald-400" />
            <span className="text-[11px]">Marker</span>
          </button>

          <button
            onClick={() => onSelectBrush('neon')}
            className={`p-2.5 rounded-2xl border text-center flex flex-col items-center gap-1 transition-all ${
              activeBrush === 'neon'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-md'
                : 'bg-white/[0.04] border-white/10 text-slate-300'
            }`}
          >
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span className="text-[11px]">Neon Glow</span>
          </button>

          <button
            onClick={() => onSelectBrush('eraser')}
            className={`p-2.5 rounded-2xl border text-center flex flex-col items-center gap-1 transition-all ${
              activeBrush === 'eraser'
                ? 'bg-rose-500/20 border-rose-400 text-rose-300 font-bold shadow-md'
                : 'bg-white/[0.04] border-white/10 text-slate-300'
            }`}
          >
            <Eraser className="w-5 h-5 text-rose-400" />
            <span className="text-[11px]">Eraser</span>
          </button>
        </div>

        {/* Color Palette (Disabled if Eraser) */}
        {activeBrush !== 'eraser' && (
          <div>
            <label className="text-xs text-slate-400 block mb-2">Color Palette</label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onChangeColor(c)}
                  className={`w-8 h-8 rounded-full shrink-0 border-2 transition-all ${
                    brushColor.toLowerCase() === c.toLowerCase()
                      ? 'border-white scale-110 shadow-lg'
                      : 'border-transparent opacity-80'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={brushColor}
                onChange={(e) => onChangeColor(e.target.value)}
                className="w-8 h-8 rounded-full border border-white/20 bg-transparent cursor-pointer shrink-0"
                title="Custom Color"
              />
            </div>
          </div>
        )}

        {/* Stroke Width Slider */}
        <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.05]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-300 font-medium">Stroke Width</span>
            <span className="text-xs font-mono-tabular text-amber-400 font-bold">{brushWidth}px</span>
          </div>
          <input
            type="range"
            min="2"
            max="40"
            value={brushWidth}
            onChange={(e) => onChangeWidth(parseInt(e.target.value))}
            className="w-full accent-amber-500 h-2 bg-white/10 rounded-lg cursor-pointer"
          />
        </div>

        {/* Animated Trim Paths (Write-on Effect) */}
        <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/[0.08] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-amber-400" />
              <span>Trim Paths (Write-On Kinetic Effect)</span>
            </span>
            <span className="text-[11px] font-mono-tabular text-amber-400">
              {drawingData.startTrim}% - {drawingData.endTrim}%
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Start Trim:</span>
              <span>{drawingData.startTrim}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={drawingData.startTrim}
              onChange={(e) => onUpdateTrimPaths(parseInt(e.target.value), drawingData.endTrim)}
              className="w-full accent-amber-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>End Trim:</span>
              <span>{drawingData.endTrim}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={drawingData.endTrim}
              onChange={(e) => onUpdateTrimPaths(drawingData.startTrim, parseInt(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Action buttons: Undo Stroke & Clear */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onUndoStroke}
            disabled={drawingData.strokes.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 disabled:opacity-30 transition-all"
          >
            <Undo2 className="w-4 h-4" />
            <span>Undo Stroke</span>
          </button>

          <button
            onClick={onClearDrawing}
            disabled={drawingData.strokes.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-xs font-semibold text-rose-300 flex items-center justify-center gap-1.5 disabled:opacity-30 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Drawing</span>
          </button>
        </div>
      </div>
    </BottomDrawer>
  );
};
