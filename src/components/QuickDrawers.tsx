import React from 'react';
import { Sparkles, Music } from 'lucide-react';
import { BottomDrawer } from './BottomDrawer';
import { AspectRatio, FitMode, TransitionType, VisualEffectType } from '../types/editor';
import { soundEngine } from '../utils/soundEngine';

// Format & Canvas Aspect Ratio Drawer
interface FormatDrawerProps {
  isOpen: boolean;
  aspectRatio: AspectRatio;
  fitMode: FitMode;
  onClose: () => void;
  onSelectAspectRatio: (ratio: AspectRatio) => void;
  onToggleFitMode: () => void;
}

export const FormatDrawer: React.FC<FormatDrawerProps> = ({
  isOpen,
  aspectRatio,
  fitMode,
  onClose,
  onSelectAspectRatio,
  onToggleFitMode,
}) => {
  const formats: { id: AspectRatio; label: string; desc: string }[] = [
    { id: '9:16', label: '9:16', desc: 'Shorts, Reels & TikTok' },
    { id: '16:9', label: '16:9', desc: 'YouTube & Landscape' },
    { id: '1:1', label: '1:1', desc: 'Square Post' },
    { id: '4:5', label: '4:5', desc: 'Instagram Portrait' },
  ];

  return (
    <BottomDrawer isOpen={isOpen} title="Canvas & Video Format" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 block mb-2">Aspect Ratio</label>
          <div className="grid grid-cols-2 gap-2.5">
            {formats.map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => {
                  onSelectAspectRatio(fmt.id);
                  onClose();
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  aspectRatio === fmt.id
                    ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                    : 'bg-white/[0.04] border-white/10 text-slate-300'
                }`}
              >
                <div className="font-mono-tabular font-bold text-sm text-amber-400">{fmt.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{fmt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
          <div>
            <div className="text-xs font-semibold text-white">Fit / Fill Framing</div>
            <div className="text-[11px] text-slate-400">Current: {fitMode}</div>
          </div>
          <button
            onClick={onToggleFitMode}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-amber-300 capitalize"
          >
            Switch to {fitMode === 'cover' ? 'Contain' : fitMode === 'contain' ? 'Fill' : 'Cover'}
          </button>
        </div>
      </div>
    </BottomDrawer>
  );
};

// Global Audio Drawer
interface AudioDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onImportAudio: () => void;
  onAddSfx: (sfx: 'whoosh' | 'sub-drop' | 'shutter' | 'glitch') => void;
}

export const AudioDrawer: React.FC<AudioDrawerProps> = ({
  isOpen,
  onClose,
  onImportAudio,
  onAddSfx,
}) => {
  return (
    <BottomDrawer isOpen={isOpen} title="Sound & Audio" onClose={onClose}>
      <div className="space-y-4">
        <button
          onClick={() => {
            onImportAudio();
            onClose();
          }}
          className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow"
        >
          <Music className="w-4 h-4" />
          <span>Upload Audio Track (.mp3 / .wav)</span>
        </button>

        <div>
          <label className="text-xs text-slate-400 block mb-2">Instant Sound FX</label>
          <div className="grid grid-cols-2 gap-2">
            {(['whoosh', 'sub-drop', 'shutter', 'glitch'] as const).map((sfx) => (
              <button
                key={sfx}
                onClick={() => {
                  soundEngine.playOneShotSfx(sfx);
                  onAddSfx(sfx);
                  onClose();
                }}
                className="p-3 bg-white/[0.04] hover:bg-white/[0.08] active:scale-96 border border-white/10 rounded-2xl text-left transition-all"
              >
                <div className="text-xs font-semibold text-white capitalize">{sfx} Effect</div>
                <div className="text-[10px] text-slate-400">Tap to insert at playhead</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </BottomDrawer>
  );
};

// Global Video FX & Transitions Drawer
interface EffectsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyEffect: (effect: VisualEffectType) => void;
  onApplyTransition: (transition: TransitionType) => void;
}

export const EffectsDrawer: React.FC<EffectsDrawerProps> = ({
  isOpen,
  onClose,
  onApplyEffect,
  onApplyTransition,
}) => {
  const effects: { id: VisualEffectType; name: string }[] = [
    { id: 'none', name: 'Clean Video' },
    { id: 'chromatic', name: 'RGB Split' },
    { id: 'vhs', name: 'Retro VHS' },
    { id: 'film-grain', name: '35mm Grain' },
    { id: 'light-leak', name: 'Solar Flare' },
  ];

  const transitions: { id: TransitionType; name: string }[] = [
    { id: 'none', name: 'Direct Cut' },
    { id: 'crossfade', name: 'Dissolve' },
    { id: 'wipe-left', name: 'Slide Wipe' },
    { id: 'zoom-in', name: 'Fast Zoom' },
    { id: 'whip-pan', name: 'Whip Pan' },
  ];

  return (
    <BottomDrawer isOpen={isOpen} title="Transitions & Effects" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 block mb-2">Visual Shaders</label>
          <div className="grid grid-cols-3 gap-2">
            {effects.map((fx) => (
              <button
                key={fx.id}
                onClick={() => {
                  onApplyEffect(fx.id);
                  onClose();
                }}
                className="p-2.5 bg-white/[0.04] hover:bg-white/[0.08] active:scale-96 border border-white/10 rounded-xl text-center transition-all text-xs text-slate-200"
              >
                {fx.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-2">Inter-Clip Transition</label>
          <div className="grid grid-cols-3 gap-2">
            {transitions.map((tr) => (
              <button
                key={tr.id}
                onClick={() => {
                  onApplyTransition(tr.id);
                  onClose();
                }}
                className="p-2.5 bg-white/[0.04] hover:bg-white/[0.08] active:scale-96 border border-white/10 rounded-xl text-center transition-all text-xs text-amber-300"
              >
                {tr.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </BottomDrawer>
  );
};
