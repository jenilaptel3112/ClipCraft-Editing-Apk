import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { BottomDrawer } from './BottomDrawer';
import { TimelineClip } from '../types/editor';

interface VolumeDrawerProps {
  isOpen: boolean;
  selectedClip: TimelineClip | null;
  onClose: () => void;
  onUpdateVolume: (clipId: string, volume: number, muted: boolean) => void;
}

export const VolumeDrawer: React.FC<VolumeDrawerProps> = ({
  isOpen,
  selectedClip,
  onClose,
  onUpdateVolume,
}) => {
  if (!selectedClip) return null;

  const currentVol = selectedClip.volume;
  const isMuted = selectedClip.muted;

  return (
    <BottomDrawer
      isOpen={isOpen}
      title="Clip Volume"
      onClose={onClose}
      onReset={() => onUpdateVolume(selectedClip.id, 100, false)}
    >
      <div className="space-y-4">
        {/* Mute Quick Toggle */}
        <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
          <div className="flex items-center gap-2">
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-rose-400" />
            ) : (
              <Volume2 className="w-5 h-5 text-emerald-400" />
            )}
            <span className="text-xs text-slate-300">
              {isMuted ? 'Audio is Muted' : 'Audio Active'}
            </span>
          </div>

          <button
            onClick={() => onUpdateVolume(selectedClip.id, currentVol, !isMuted)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isMuted
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
            }`}
          >
            {isMuted ? 'Unmute' : 'Mute Clip'}
          </button>
        </div>

        {/* Thick thumb slider */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-300">Volume Level</span>
            <span className="font-mono-tabular font-bold text-amber-400 text-sm">
              {isMuted ? '0%' : `${currentVol}%`}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="150"
            value={isMuted ? 0 : currentVol}
            disabled={isMuted}
            onChange={(e) =>
              onUpdateVolume(selectedClip.id, parseInt(e.target.value, 10), false)
            }
            className="w-full studio-slider h-3"
          />
        </div>
      </div>
    </BottomDrawer>
  );
};
