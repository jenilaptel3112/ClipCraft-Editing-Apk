import React from 'react';
import { Gauge } from 'lucide-react';
import { BottomDrawer } from './BottomDrawer';
import { TimelineClip } from '../types/editor';

interface SpeedDrawerProps {
  isOpen: boolean;
  selectedClip: TimelineClip | null;
  onClose: () => void;
  onUpdateSpeed: (clipId: string, speed: number, preservePitch: boolean) => void;
}

export const SpeedDrawer: React.FC<SpeedDrawerProps> = ({
  isOpen,
  selectedClip,
  onClose,
  onUpdateSpeed,
}) => {
  if (!selectedClip) return null;

  const currentSpeed = selectedClip.speed;
  const preservePitch = selectedClip.preservePitch;

  const speedPresets = [0.5, 1.0, 1.5, 2.0, 3.0];

  return (
    <BottomDrawer
      isOpen={isOpen}
      title="Clip Speed"
      onClose={onClose}
      onReset={() => onUpdateSpeed(selectedClip.id, 1.0, true)}
    >
      <div className="space-y-4">
        {/* Preset speed pills */}
        <div className="grid grid-cols-5 gap-2">
          {speedPresets.map((spd) => (
            <button
              key={spd}
              onClick={() => onUpdateSpeed(selectedClip.id, spd, preservePitch)}
              className={`py-2.5 rounded-xl text-xs font-mono-tabular font-bold transition-all ${
                Math.abs(currentSpeed - spd) < 0.05
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        {/* Thick, thumb-friendly range slider with visible numeric value */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-300">Custom Speed</span>
            <span className="font-mono-tabular font-bold text-amber-400 text-sm">
              Speed: {currentSpeed.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0.2"
            max="4.0"
            step="0.1"
            value={currentSpeed}
            onChange={(e) =>
              onUpdateSpeed(selectedClip.id, parseFloat(e.target.value), preservePitch)
            }
            className="w-full studio-slider h-3"
          />
        </div>

        {/* Pitch lock toggle */}
        <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
          <span className="text-xs text-slate-300">Keep Audio Pitch</span>
          <button
            onClick={() => onUpdateSpeed(selectedClip.id, currentSpeed, !preservePitch)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              preservePitch
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-white/[0.06] text-slate-400'
            }`}
          >
            {preservePitch ? 'Pitch Locked' : 'Normal Pitch'}
          </button>
        </div>
      </div>
    </BottomDrawer>
  );
};
