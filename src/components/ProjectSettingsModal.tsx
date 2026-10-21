import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Check,
  RotateCcw,
  Sliders,
  Tv,
  Film,
  Clock,
  Volume2,
  Palette,
  Eye,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  ProjectSettings,
  AspectRatio,
  ResolutionTier,
  ProjectFrameRate,
  ProjectSampleRate,
  TimecodeDisplayMode,
} from '../types/editor';
import {
  calculateDimensionsForTier,
  formatTimecode,
  createDefaultProjectSettings,
} from '../utils/presets';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  initialSettings?: ProjectSettings;
  onClose: () => void;
  onSave: (settings: ProjectSettings) => void;
}

interface AspectRatioOption {
  id: AspectRatio;
  label: string;
  sub: string;
  ratioW: number;
  ratioH: number;
  iconTag: string;
}

const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  { id: '9:16', label: '9:16', sub: 'TikTok / Reels / Shorts', ratioW: 9, ratioH: 16, iconTag: 'Vertical' },
  { id: '16:9', label: '16:9', sub: 'YouTube / Widescreen TV', ratioW: 16, ratioH: 9, iconTag: 'Cinema' },
  { id: '1:1', label: '1:1', sub: 'Square / IG Feed', ratioW: 1, ratioH: 1, iconTag: 'Square' },
  { id: '4:5', label: '4:5', sub: 'Instagram Portrait', ratioW: 4, ratioH: 5, iconTag: 'Social' },
  { id: '21:9', label: '21:9', sub: 'Cinemascope Ultra-wide', ratioW: 21, ratioH: 9, iconTag: 'Anamorphic' },
  { id: '4:3', label: '4:3', sub: 'Classic TV / iPad', ratioW: 4, ratioH: 3, iconTag: 'Standard' },
  { id: 'custom', label: 'Custom', sub: 'Manual Width × Height', ratioW: 1, ratioH: 1, iconTag: 'Custom' },
];

const RESOLUTION_TIERS: { id: ResolutionTier; label: string; desc: string; badge: string }[] = [
  { id: '720p', label: '720p HD', desc: 'Fast editing, low memory footprint', badge: 'Draft' },
  { id: '1080p', label: '1080p FHD', desc: 'Industry standard for crisp streaming', badge: 'Recommended' },
  { id: '1440p', label: '1440p 2K', desc: 'High pixel density for retina displays', badge: 'Pro' },
  { id: '4k', label: '4K UHD', desc: 'Maximum fidelity & high-res master', badge: 'Ultra' },
];

const FRAME_RATES: { value: ProjectFrameRate; label: string; desc: string }[] = [
  { value: 24, label: '24 fps', desc: 'Classic cinematic film cadence' },
  { value: 25, label: '25 fps', desc: 'PAL / European broadcast rate' },
  { value: 30, label: '30 fps', desc: 'Modern web & social video standard' },
  { value: 50, label: '50 fps', desc: 'Smooth PAL high-frame-rate' },
  { value: 60, label: '60 fps', desc: 'Ultra-fluid gaming & slow-motion ready' },
];

const SAMPLE_RATES: { value: ProjectSampleRate; label: string; desc: string }[] = [
  { value: 48000, label: '48.0 kHz', desc: 'Pro cinema standard (Broadcast-grade)' },
  { value: 44100, label: '44.1 kHz', desc: 'Standard CD & streaming audio' },
];

const TIMECODE_MODES: { value: TimecodeDisplayMode; label: string; example: string; desc: string }[] = [
  { value: 'compact', label: 'Compact (MM:SS.ms)', example: '00:03.12', desc: 'Clean minutes and hundredths' },
  { value: 'hmsf', label: 'Standard (HH:MM:SS:FF)', example: '00:00:03:14', desc: 'Broadcast timecode with exact frame count' },
  { value: 'frames', label: 'Frame Count (F)', example: 'F 84', desc: 'Absolute animation frame index' },
];

const PRESET_BG_COLORS = [
  { name: 'Pure Black', hex: '#000000' },
  { name: 'Dark Void', hex: '#07080C' },
  { name: 'Slate Night', hex: '#0F172A' },
  { name: 'Deep Indigo', hex: '#1E1B4B' },
  { name: 'Dark Zinc', hex: '#18181B' },
];

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  initialSettings,
  onClose,
  onSave,
}) => {
  const [settings, setSettings] = useState<ProjectSettings>(() => {
    return initialSettings || createDefaultProjectSettings();
  });

  const [customWidth, setCustomWidth] = useState<number>(() => {
    return initialSettings?.customDimensions?.width || 1080;
  });

  const [customHeight, setCustomHeight] = useState<number>(() => {
    return initialSettings?.customDimensions?.height || 1920;
  });

  const [activeTab, setActiveTab] = useState<'canvas' | 'timing' | 'compositing' | 'timecode'>('canvas');

  // Sync state if initialSettings changes
  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
      if (initialSettings.customDimensions) {
        setCustomWidth(initialSettings.customDimensions.width);
        setCustomHeight(initialSettings.customDimensions.height);
      }
    }
  }, [initialSettings]);

  if (!isOpen) return null;

  // Calculate current resolved resolution
  const resolvedDimensions = calculateDimensionsForTier(
    settings.aspectRatio,
    settings.resolutionTier,
    settings.aspectRatio === 'custom' ? { width: customWidth, height: customHeight } : undefined
  );

  const handleSave = () => {
    const finalSettings: ProjectSettings = {
      ...settings,
      lastModified: Date.now(),
      customDimensions:
        settings.aspectRatio === 'custom'
          ? { width: Math.max(100, customWidth), height: Math.max(100, customHeight) }
          : settings.customDimensions,
    };
    onSave(finalSettings);
    onClose();
  };

  const handleResetDefaults = () => {
    const defaultSettings = createDefaultProjectSettings(settings.id, settings.name, '9:16');
    setSettings(defaultSettings);
    setCustomWidth(1080);
    setCustomHeight(1920);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-lg bg-[#0F111A] border border-white/[0.12] rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#141724] border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-display">Project Settings</h2>
              <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                {settings.name || 'Untitled Video'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Project Resolution & Spec Summary Banner */}
        <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase">
              {settings.aspectRatio}
            </span>
            <span className="font-mono-tabular text-xs font-semibold text-amber-300">
              {resolvedDimensions.width} × {resolvedDimensions.height} px
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-300 font-mono-tabular">
            <span className="text-slate-400">{settings.frameRate} fps</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">{settings.sampleRate / 1000} kHz</span>
          </div>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="flex items-center border-b border-white/[0.08] bg-[#0A0C14] px-3 pt-2 gap-1 overflow-x-auto scrollbar-none shrink-0">
          {[
            { id: 'canvas', label: 'Canvas & Ratio', icon: Tv },
            { id: 'timing', label: 'Frame & Audio', icon: Clock },
            { id: 'compositing', label: 'Background', icon: Palette },
            { id: 'timecode', label: 'Timecode', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-semibold transition-all border-b-2 shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-amber-400 text-amber-400 bg-white/[0.04]'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#0F111A]">
          {/* TAB 1: Canvas & Dimensions */}
          {activeTab === 'canvas' && (
            <div className="space-y-5 animate-fade-in">
              {/* Project Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Project Name</label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  placeholder="e.g., Summer Vlog Episode 1"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              {/* Aspect Ratio Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Spatial Aspect Ratio</label>
                  <span className="text-[11px] text-amber-400 font-mono-tabular">
                    Selected: {settings.aspectRatio}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ASPECT_RATIO_OPTIONS.map((opt) => {
                    const isSelected = settings.aspectRatio === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSettings({ ...settings, aspectRatio: opt.id })}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 text-white shadow-md shadow-amber-500/10'
                            : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span
                            className={`text-xs font-bold font-mono-tabular ${
                              isSelected ? 'text-amber-400' : 'text-slate-200'
                            }`}
                          >
                            {opt.label}
                          </span>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400">
                            {opt.iconTag}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 line-clamp-1">{opt.sub}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Dimensions Inputs (Shown only if 'custom' is active) */}
                {settings.aspectRatio === 'custom' && (
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] mt-2 space-y-2">
                    <span className="text-xs font-semibold text-slate-300">Custom Dimensions (pixels)</span>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 block mb-1">Width (px)</label>
                        <input
                          type="number"
                          min="100"
                          max="7680"
                          value={customWidth}
                          onChange={(e) => setCustomWidth(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white"
                        />
                      </div>
                      <span className="text-slate-500 pt-4">×</span>
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 block mb-1">Height (px)</label>
                        <input
                          type="number"
                          min="100"
                          max="7680"
                          value={customHeight}
                          onChange={(e) => setCustomHeight(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Resolution Tier */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Resolution Tier</label>
                <div className="grid grid-cols-2 gap-2">
                  {RESOLUTION_TIERS.map((tier) => {
                    const isSelected = settings.resolutionTier === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setSettings({ ...settings, resolutionTier: tier.id })}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 text-white'
                            : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className={`text-xs font-bold ${
                              isSelected ? 'text-amber-400' : 'text-slate-200'
                            }`}
                          >
                            {tier.label}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400">
                            {tier.badge}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block leading-tight">{tier.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Frame Rate & Audio */}
          {activeTab === 'timing' && (
            <div className="space-y-5 animate-fade-in">
              {/* Frame Rate (FPS) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Project Frame Rate (FPS)</label>
                <div className="space-y-1.5">
                  {FRAME_RATES.map((fps) => {
                    const isSelected = settings.frameRate === fps.value;
                    return (
                      <button
                        key={fps.value}
                        type="button"
                        onClick={() => setSettings({ ...settings, frameRate: fps.value })}
                        className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 text-white'
                            : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-amber-400 bg-amber-400' : 'border-slate-600'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                          </div>
                          <div className="text-left">
                            <span
                              className={`text-xs font-bold block ${
                                isSelected ? 'text-amber-400' : 'text-slate-200'
                              }`}
                            >
                              {fps.label}
                            </span>
                            <span className="text-[11px] text-slate-400">{fps.desc}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Audio Sample Rate */}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <label className="text-xs font-semibold text-slate-300">Audio Sample Rate</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SAMPLE_RATES.map((sr) => {
                    const isSelected = settings.sampleRate === sr.value;
                    return (
                      <button
                        key={sr.value}
                        type="button"
                        onClick={() => setSettings({ ...settings, sampleRate: sr.value })}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 text-white'
                            : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.05]'
                        }`}
                      >
                        <span
                          className={`text-xs font-bold block mb-0.5 ${
                            isSelected ? 'text-amber-400' : 'text-slate-200'
                          }`}
                        >
                          {sr.label}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{sr.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Background & Compositing */}
          {activeTab === 'compositing' && (
            <div className="space-y-5 animate-fade-in">
              {/* Background Blur Fallback Toggle */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                <div className="space-y-1 pr-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-white">Smart Ambient Blur</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Auto-blur duplicate background when media aspect ratio differs from project dimensions (CapCut style).
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.backgroundBlurFallback}
                    onChange={(e) =>
                      setSettings({ ...settings, backgroundBlurFallback: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Letterbox Background Color */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Letterbox Background Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_BG_COLORS.map((c) => {
                    const isSelected = settings.backgroundColor.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setSettings({ ...settings, backgroundColor: c.hex })}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-400 bg-amber-400/10 text-white'
                            : 'border-white/[0.08] bg-white/[0.02] text-slate-400'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-xs font-medium">{c.name}</span>
                      </button>
                    );
                  })}

                  {/* Custom Hex Color input */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <input
                      type="color"
                      value={settings.backgroundColor}
                      onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-xs font-mono text-slate-300 uppercase">
                      {settings.backgroundColor}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Timecode & Display */}
          {activeTab === 'timecode' && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Timecode Display Mode</label>
                <div className="space-y-2">
                  {TIMECODE_MODES.map((mode) => {
                    const isSelected = settings.timecodeDisplay === mode.value;
                    const previewSample = formatTimecode(14.367, mode.value, settings.frameRate);
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => setSettings({ ...settings, timecodeDisplay: mode.value })}
                        className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 text-white'
                            : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div>
                          <span
                            className={`text-xs font-bold block ${
                              isSelected ? 'text-amber-400' : 'text-slate-200'
                            }`}
                          >
                            {mode.label}
                          </span>
                          <span className="text-[11px] text-slate-400">{mode.desc}</span>
                        </div>

                        {/* Live format badge */}
                        <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.08] font-mono-tabular text-xs text-amber-300 font-bold">
                          {previewSample}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#141724] border-t border-white/[0.08] shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/[0.06] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
