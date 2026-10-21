import React from 'react';
import { BottomDrawer } from './BottomDrawer';
import { TimelineClip, ColorGrading } from '../types/editor';
import { LUT_PRESETS, DEFAULT_COLOR_GRADING } from '../utils/presets';

interface FilterDrawerProps {
  isOpen: boolean;
  selectedClip: TimelineClip | null;
  onClose: () => void;
  onUpdateColorGrading: (clipId: string, updates: Partial<ColorGrading>) => void;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  selectedClip,
  onClose,
  onUpdateColorGrading,
}) => {
  if (!selectedClip) return null;

  const cg = selectedClip.colorGrading;

  const handleReset = () => {
    onUpdateColorGrading(selectedClip.id, { ...DEFAULT_COLOR_GRADING });
  };

  return (
    <BottomDrawer
      isOpen={isOpen}
      title="Filters & Color Grade"
      onClose={onClose}
      onReset={handleReset}
    >
      <div className="space-y-4">
        {/* Preset LUT cards */}
        <div>
          <label className="text-xs text-slate-400 block mb-2">Cinematic Filters</label>
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {LUT_PRESETS.map((lut) => {
              const isActive = cg.lutPreset === lut.id;
              return (
                <button
                  key={lut.id}
                  onClick={() =>
                    onUpdateColorGrading(selectedClip.id, {
                      ...lut.grading,
                      lutPreset: lut.id,
                    })
                  }
                  className={`px-3 py-2.5 rounded-2xl border text-left shrink-0 transition-all flex flex-col justify-between h-18 w-28 ${
                    isActive
                      ? 'bg-amber-500/20 border-amber-400 text-white'
                      : 'bg-white/[0.04] border-white/10 text-slate-300'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-br ${lut.swatch}`} />
                  <span className="text-xs font-semibold truncate block mt-2">{lut.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Thick, thumb-friendly range sliders with visible numeric values */}
        <div className="space-y-3 pt-1 border-t border-white/[0.08]">
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Brightness</span>
              <span className="font-mono-tabular font-semibold text-amber-400">
                {cg.brightness > 100 ? `+${cg.brightness - 100}` : `${cg.brightness - 100}`}
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              value={cg.brightness}
              onChange={(e) =>
                onUpdateColorGrading(selectedClip.id, { brightness: parseInt(e.target.value, 10) })
              }
              className="w-full studio-slider h-3"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Contrast</span>
              <span className="font-mono-tabular font-semibold text-amber-400">
                {cg.contrast > 100 ? `+${cg.contrast - 100}` : `${cg.contrast - 100}`}
              </span>
            </div>
            <input
              type="range"
              min="60"
              max="160"
              value={cg.contrast}
              onChange={(e) =>
                onUpdateColorGrading(selectedClip.id, { contrast: parseInt(e.target.value, 10) })
              }
              className="w-full studio-slider h-3"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Saturation</span>
              <span className="font-mono-tabular font-semibold text-amber-400">
                {cg.saturation}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={cg.saturation}
              onChange={(e) =>
                onUpdateColorGrading(selectedClip.id, { saturation: parseInt(e.target.value, 10) })
              }
              className="w-full studio-slider h-3"
            />
          </div>
        </div>
      </div>
    </BottomDrawer>
  );
};
