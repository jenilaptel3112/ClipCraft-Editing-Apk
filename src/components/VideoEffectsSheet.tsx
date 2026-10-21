import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Activity,
  ZoomIn,
  Sun,
  Eye,
  Film,
  X,
  Layers,
  Sliders,
} from 'lucide-react';
import { BottomDrawer } from './BottomDrawer';
import { TimelineClip, VideoEffectType, VideoEffectConfig } from '../types/editor';

interface VideoEffectsSheetProps {
  isOpen: boolean;
  selectedClip: TimelineClip | null;
  onClose: () => void;
  onUpdateEffects: (clipId: string, effects: VideoEffectConfig[]) => void;
}

const EFFECT_PRESETS: {
  id: VideoEffectType;
  name: string;
  category: 'motion' | 'glow' | 'stylized';
  desc: string;
  icon: React.ReactNode;
  cssAnimClass: string;
  defaultConfig: Partial<VideoEffectConfig>;
}[] = [
  // 1. Motion & Camera Shake
  {
    id: 'camera-shake',
    name: 'Earthquake Shake',
    category: 'motion',
    desc: 'High-frequency impact vibration',
    icon: <Activity className="w-4 h-4 text-rose-400" />,
    cssAnimClass: 'animate-bounce',
    defaultConfig: { intensity: 45, speed: 1.4 },
  },
  {
    id: 'slow-zoom',
    name: 'Cinematic Push-In',
    category: 'motion',
    desc: 'Smooth exponential zoom ramp',
    icon: <ZoomIn className="w-4 h-4 text-sky-400" />,
    cssAnimClass: 'scale-105 transition-transform duration-700',
    defaultConfig: { intensity: 50, speed: 1.0 },
  },

  // 2. Glow & Lighting Effects
  {
    id: 'edge-glow',
    name: 'Dream Edge Glow',
    category: 'glow',
    desc: 'Screen bloom with soft diffuse',
    icon: <Sun className="w-4 h-4 text-amber-400" />,
    cssAnimClass: 'shadow-[0_0_15px_rgba(245,158,11,0.6)]',
    defaultConfig: { glow: 65, intensity: 50 },
  },
  {
    id: 'rgb-split',
    name: 'RGB Chromatic',
    category: 'glow',
    desc: 'Anamorphic color channel split',
    icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
    cssAnimClass: 'border-cyan-400 border-r-2 border-l-2',
    defaultConfig: { intensity: 50, speed: 1.0 },
  },
  {
    id: 'white-strobe',
    name: 'Beat White Strobe',
    category: 'glow',
    desc: '150ms flash decay on beat drops',
    icon: <Zap className="w-4 h-4 text-yellow-300" />,
    cssAnimClass: 'animate-pulse',
    defaultConfig: { intensity: 60, speed: 1.5 },
  },

  // 3. Trendy Stylized Visuals
  {
    id: 'film-grain',
    name: '35mm Film Grain',
    category: 'stylized',
    desc: 'Organic celluloid dust & noise',
    icon: <Film className="w-4 h-4 text-orange-400" />,
    cssAnimClass: 'opacity-90',
    defaultConfig: { intensity: 40 },
  },
  {
    id: 'lens-blur',
    name: 'Focus Pull Blur',
    category: 'stylized',
    desc: 'Resolves from blur into focus',
    icon: <Eye className="w-4 h-4 text-purple-400" />,
    cssAnimClass: 'backdrop-blur-xs',
    defaultConfig: { blur: 14, intensity: 50 },
  },
  {
    id: 'bw-pop',
    name: 'B&W Color Pop',
    category: 'stylized',
    desc: 'High contrast with vignette frame',
    icon: <Layers className="w-4 h-4 text-slate-300" />,
    cssAnimClass: 'grayscale',
    defaultConfig: { intensity: 55 },
  },
];

export const VideoEffectsSheet: React.FC<VideoEffectsSheetProps> = ({
  isOpen,
  selectedClip,
  onClose,
  onUpdateEffects,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'motion' | 'glow' | 'stylized'>('all');
  const [editingEffectId, setEditingEffectId] = useState<string | null>(null);

  if (!selectedClip) return null;

  const currentEffects = selectedClip.activeEffects || [];

  const handleToggleEffect = (preset: typeof EFFECT_PRESETS[0]) => {
    const existingIndex = currentEffects.findIndex((e) => e.type === preset.id);

    if (existingIndex >= 0) {
      // Remove effect
      const next = currentEffects.filter((_, idx) => idx !== existingIndex);
      onUpdateEffects(selectedClip.id, next);
      if (editingEffectId === currentEffects[existingIndex].id) {
        setEditingEffectId(null);
      }
    } else {
      // CapCut allows stacking up to 2 simultaneous effects
      const newConfig: VideoEffectConfig = {
        id: `eff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: preset.id,
        intensity: preset.defaultConfig.intensity ?? 50,
        speed: preset.defaultConfig.speed ?? 1.0,
        glow: preset.defaultConfig.glow ?? 50,
        blur: preset.defaultConfig.blur ?? 12,
      };

      const next = currentEffects.length >= 2
        ? [currentEffects[1], newConfig]
        : [...currentEffects, newConfig];

      onUpdateEffects(selectedClip.id, next);
      setEditingEffectId(newConfig.id);
    }
  };

  const handleRemoveEffect = (effectId: string) => {
    const next = currentEffects.filter((e) => e.id !== effectId);
    onUpdateEffects(selectedClip.id, next);
    if (editingEffectId === effectId) {
      setEditingEffectId(null);
    }
  };

  const handleUpdateEffectConfig = (effectId: string, updates: Partial<VideoEffectConfig>) => {
    const next = currentEffects.map((e) => (e.id === effectId ? { ...e, ...updates } : e));
    onUpdateEffects(selectedClip.id, next);
  };

  const filteredPresets = activeCategory === 'all'
    ? EFFECT_PRESETS
    : EFFECT_PRESETS.filter((p) => p.category === activeCategory);

  const activeEditingEffect = currentEffects.find((e) => e.id === editingEffectId) || currentEffects[0] || null;

  return (
    <BottomDrawer
      isOpen={isOpen}
      title="Video Effects"
      onClose={onClose}
      onReset={() => onUpdateEffects(selectedClip.id, [])}
    >
      <div className="space-y-4">
        {/* Active Stacked Effects Pills (Max 2) */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">
              Active Effects ({currentEffects.length}/2):
            </span>
            {currentEffects.length === 0 && (
              <span className="text-[11px] text-slate-500">None selected</span>
            )}
            {currentEffects.map((eff) => {
              const presetInfo = EFFECT_PRESETS.find((p) => p.id === eff.type);
              const isEditing = activeEditingEffect?.id === eff.id;

              return (
                <div
                  key={eff.id}
                  onClick={() => setEditingEffectId(eff.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs cursor-pointer transition-all ${
                    isEditing
                      ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                      : 'bg-white/[0.06] border-white/10 text-slate-200'
                  }`}
                >
                  <span className="font-medium text-[11px]">{presetInfo?.name || eff.type}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveEffect(eff.id);
                    }}
                    className="p-0.5 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-time Adjustment Sliders for active selected effect */}
        {activeEditingEffect && (
          <div className="p-3 bg-black/40 rounded-2xl border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5" />
                <span>Adjusting: {EFFECT_PRESETS.find((p) => p.id === activeEditingEffect.type)?.name}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Intensity Slider */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>Intensity</span>
                  <span className="font-mono-tabular font-semibold text-amber-400">
                    {activeEditingEffect.intensity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={activeEditingEffect.intensity}
                  onChange={(e) =>
                    handleUpdateEffectConfig(activeEditingEffect.id, {
                      intensity: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full studio-slider h-2.5"
                />
              </div>

              {/* Speed Slider */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>Speed</span>
                  <span className="font-mono-tabular font-semibold text-amber-400">
                    {activeEditingEffect.speed.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={activeEditingEffect.speed}
                  onChange={(e) =>
                    handleUpdateEffectConfig(activeEditingEffect.id, {
                      speed: parseFloat(e.target.value),
                    })
                  }
                  className="w-full studio-slider h-2.5"
                />
              </div>

              {/* Glow Slider if applicable */}
              {activeEditingEffect.type === 'edge-glow' && (
                <div className="col-span-2">
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>Bloom Glow</span>
                    <span className="font-mono-tabular font-semibold text-amber-400">
                      {activeEditingEffect.glow}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={activeEditingEffect.glow}
                    onChange={(e) =>
                      handleUpdateEffectConfig(activeEditingEffect.id, {
                        glow: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full studio-slider h-2.5"
                  />
                </div>
              )}

              {/* Focus pull blur if applicable */}
              {activeEditingEffect.type === 'lens-blur' && (
                <div className="col-span-2">
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>Initial Blur</span>
                    <span className="font-mono-tabular font-semibold text-amber-400">
                      {activeEditingEffect.blur}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="30"
                    value={activeEditingEffect.blur}
                    onChange={(e) =>
                      handleUpdateEffectConfig(activeEditingEffect.id, {
                        blur: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full studio-slider h-2.5"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(
            [
              { id: 'all', label: 'All Effects' },
              { id: 'motion', label: 'Motion & Shake' },
              { id: 'glow', label: 'Glow & Strobe' },
              { id: 'stylized', label: 'Film & Stylized' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Animated Preset Cards with Micro-Previews */}
        <div className="grid grid-cols-2 gap-2.5">
          {filteredPresets.map((preset) => {
            const isSelected = currentEffects.some((e) => e.type === preset.id);

            return (
              <button
                key={preset.id}
                onClick={() => handleToggleEffect(preset)}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 relative overflow-hidden ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                    : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
                }`}
              >
                {/* Header & Icon */}
                <div className="flex items-center justify-between w-full">
                  <div className="w-7 h-7 rounded-lg bg-black/40 flex items-center justify-center">
                    {preset.icon}
                  </div>
                  {isSelected && (
                    <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.5 rounded-full">
                      ACTIVE
                    </span>
                  )}
                </div>

                {/* Animated CSS micro-preview indicator */}
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <span>{preset.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {preset.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </BottomDrawer>
  );
};
