import React from 'react';
import {
  Plus,
  Music,
  Type,
  Sparkles,
  Crop,
  ArrowLeft,
  Scissors,
  Gauge,
  Sliders,
  Volume2,
  Trash2,
  Play,
  Pause,
  Wand2,
  Box,
  PenTool,
} from 'lucide-react';
import { TimelineClip } from '../types/editor';

interface ContextualDockProps {
  selectedClip: TimelineClip | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onDeselectClip: () => void;
  onOpenAddMedia: () => void;
  onOpenAudioDrawer: () => void;
  onOpenTextDrawer: () => void;
  onOpenEffectsDrawer: () => void;
  onOpenFormatDrawer: () => void;
  onSplitClip: () => void;
  onOpenSpeedDrawer: () => void;
  onOpenFilterDrawer: () => void;
  onOpenVolumeDrawer: () => void;
  onOpenVideoEffectsDrawer: () => void;
  onOpenTransform3DDrawer: () => void;
  onOpenDrawingDrawer: () => void;
  onDeleteClip: () => void;
}

export const ContextualDock: React.FC<ContextualDockProps> = ({
  selectedClip,
  isPlaying,
  onTogglePlay,
  onDeselectClip,
  onOpenAddMedia,
  onOpenAudioDrawer,
  onOpenTextDrawer,
  onOpenEffectsDrawer,
  onOpenFormatDrawer,
  onSplitClip,
  onOpenSpeedDrawer,
  onOpenFilterDrawer,
  onOpenVolumeDrawer,
  onOpenVideoEffectsDrawer,
  onOpenTransform3DDrawer,
  onOpenDrawingDrawer,
  onDeleteClip,
}) => {
  const isClipSelected = selectedClip !== null;
  const isTextClip = selectedClip?.trackId === 'text';

  return (
    <div className="bg-[#12141C] border-t border-white/[0.08] px-2 py-2 shrink-0 select-none">
      {/* High-frequency center Thumb-zone: Play / Pause + Context action */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          {isClipSelected ? (
            <button
              onClick={onDeselectClip}
              className="min-h-[44px] px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Done</span>
            </button>
          ) : (
            <span className="text-xs font-semibold text-slate-400 pl-1">
              Tap a clip to edit
            </span>
          )}
        </div>

        {/* Central Ergonomic Thumb Play/Pause button */}
        <button
          onClick={onTogglePlay}
          className="min-h-[44px] min-w-[54px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1.5 font-bold text-xs shadow-md active:scale-95 transition-all"
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Play</span>
            </>
          )}
        </button>
      </div>

      {/* Dynamic Dock Buttons with transition-all duration-200 */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 transition-all duration-200">
        {!isClipSelected ? (
          // MODE A: Default (Nothing Selected)
          <>
            <button
              onClick={onOpenAddMedia}
              className="min-h-[50px] min-w-[68px] flex-1 flex flex-col items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-slate-200"
            >
              <Plus className="w-5 h-5 text-amber-400" />
              <span className="text-[11px] font-medium mt-1">Add Media</span>
            </button>

            <button
              onClick={onOpenAudioDrawer}
              className="min-h-[50px] min-w-[68px] flex-1 flex flex-col items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-slate-200"
            >
              <Music className="w-5 h-5 text-emerald-400" />
              <span className="text-[11px] font-medium mt-1">Audio</span>
            </button>

            <button
              onClick={onOpenTextDrawer}
              className="min-h-[50px] min-w-[62px] flex-1 flex flex-col items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-slate-200"
            >
              <Type className="w-5 h-5 text-violet-400" />
              <span className="text-[11px] font-medium mt-1">Text</span>
            </button>

            <button
              onClick={onOpenDrawingDrawer}
              className="min-h-[50px] min-w-[62px] flex-1 flex flex-col items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-slate-200"
            >
              <PenTool className="w-5 h-5 text-amber-400" />
              <span className="text-[11px] font-medium mt-1">Draw</span>
            </button>

            <button
              onClick={onOpenEffectsDrawer}
              className="min-h-[50px] min-w-[62px] flex-1 flex flex-col items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-slate-200"
            >
              <Sparkles className="w-5 h-5 text-sky-400" />
              <span className="text-[11px] font-medium mt-1">Effects</span>
            </button>

            <button
              onClick={onOpenFormatDrawer}
              className="min-h-[50px] min-w-[62px] flex-1 flex flex-col items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-slate-200"
            >
              <Crop className="w-5 h-5 text-amber-400" />
              <span className="text-[11px] font-medium mt-1">Format</span>
            </button>
          </>
        ) : (
          // MODE B: Clip Selected Mode
          <>
            <button
              onClick={onSplitClip}
              className="min-h-[50px] min-w-[54px] flex-1 flex flex-col items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-slate-200"
            >
              <Scissors className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-medium mt-1">Split</span>
            </button>

            {/* 3D Space Transform & Parenting Inspector Button */}
            <button
              onClick={onOpenTransform3DDrawer}
              className={`min-h-[50px] min-w-[54px] flex-1 flex flex-col items-center justify-center rounded-xl active:scale-95 transition-all ${
                selectedClip?.is3D || selectedClip?.mediaType === 'null' || selectedClip?.mediaType === 'camera'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-200'
              }`}
            >
              <Box className="w-4 h-4 text-sky-400" />
              <span className="text-[10px] font-medium mt-1">3D Space</span>
            </button>

            {/* Effects / Style / Brush button based on layer type */}
            {selectedClip?.mediaType === 'drawing' ? (
              <button
                onClick={onOpenDrawingDrawer}
                className="min-h-[50px] min-w-[54px] flex-1 flex flex-col items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-slate-200"
              >
                <PenTool className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-medium mt-1">Brush</span>
              </button>
            ) : isTextClip ? (
              <button
                onClick={onOpenTextDrawer}
                className="min-h-[50px] min-w-[54px] flex-1 flex flex-col items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-slate-200"
              >
                <Type className="w-4 h-4 text-violet-400" />
                <span className="text-[10px] font-medium mt-1">Style</span>
              </button>
            ) : (
              <button
                onClick={onOpenVideoEffectsDrawer}
                className="min-h-[50px] min-w-[54px] flex-1 flex flex-col items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-slate-200"
              >
                <Wand2 className="w-4 h-4 text-pink-400" />
                <span className="text-[10px] font-medium mt-1">Effects</span>
              </button>
            )}

            <button
              onClick={onOpenSpeedDrawer}
              className="min-h-[50px] min-w-[58px] flex-1 flex flex-col items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-slate-200"
            >
              <Gauge className="w-4 h-4 text-sky-400" />
              <span className="text-[10px] font-medium mt-1">Speed</span>
            </button>

            <button
              onClick={onOpenFilterDrawer}
              className="min-h-[50px] min-w-[58px] flex-1 flex flex-col items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-slate-200"
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-medium mt-1">Filter</span>
            </button>

            <button
              onClick={onOpenVolumeDrawer}
              className="min-h-[50px] min-w-[58px] flex-1 flex flex-col items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-slate-200"
            >
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-medium mt-1">Volume</span>
            </button>

            <button
              onClick={onDeleteClip}
              className="min-h-[50px] min-w-[58px] flex-1 flex flex-col items-center justify-center rounded-xl bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 transition-all text-rose-300"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-[10px] font-medium mt-1">Delete</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
