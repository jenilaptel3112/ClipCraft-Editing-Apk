import React from 'react';
import {
  Scissors,
  Type,
  Music,
  Sliders,
  Gauge,
  Sparkles,
  Diamond,
  Wand2,
  Plus,
  RotateCcw,
  Volume2,
  VolumeX,
  MoveHorizontal,
} from 'lucide-react';
import {
  ActiveDockTab,
  TimelineClip,
  ColorGrading,
  TextStyle,
  TransitionType,
  VisualEffectType,
  EasingType,
  TrackType,
} from '../types/editor';
import { LUT_PRESETS, DEFAULT_COLOR_GRADING } from '../utils/presets';
import { soundEngine } from '../utils/soundEngine';

interface FeatureDockProps {
  activeTab: ActiveDockTab;
  selectedClip: TimelineClip | null;
  playhead: number;
  onSelectTab: (tab: ActiveDockTab) => void;
  onUpdateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  onUpdateColorGrading: (clipId: string, grading: Partial<ColorGrading>) => void;
  onUpdateTextStyle: (clipId: string, style: Partial<TextStyle>) => void;
  onAddTextClip: () => void;
  onAddPipOverlayClip: () => void;
  onAddSfxClip: (sfxType: 'whoosh' | 'sub-drop' | 'shutter' | 'glitch') => void;
  onAddOrUpdateKeyframe: () => void;
  onRemoveKeyframe: (keyframeId: string) => void;
  onSplitAtPlayhead: () => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onTriggerMediaUpload: (trackType: TrackType) => void;
}

const DOCK_TABS: { id: ActiveDockTab; label: string; icon: React.ReactNode }[] = [
  { id: 'edit', label: 'Split/Cut', icon: <Scissors className="w-4 h-4" /> },
  { id: 'color', label: 'Color/LUTs', icon: <Sliders className="w-4 h-4" /> },
  { id: 'text', label: 'Text', icon: <Type className="w-4 h-4" /> },
  { id: 'keyframes', label: 'Keyframes', icon: <Diamond className="w-4 h-4" /> },
  { id: 'speed', label: 'Speed', icon: <Gauge className="w-4 h-4" /> },
  { id: 'audio', label: 'Audio', icon: <Music className="w-4 h-4" /> },
  { id: 'transitions', label: 'Transitions', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'effects', label: 'FX', icon: <Wand2 className="w-4 h-4" /> },
];

export const FeatureDock: React.FC<FeatureDockProps> = ({
  activeTab,
  selectedClip,
  playhead,
  onSelectTab,
  onUpdateClip,
  onUpdateColorGrading,
  onUpdateTextStyle,
  onAddTextClip,
  onAddPipOverlayClip,
  onAddSfxClip,
  onAddOrUpdateKeyframe,
  onRemoveKeyframe,
  onSplitAtPlayhead,
  onDuplicateSelected,
  onDeleteSelected,
  onTriggerMediaUpload,
}) => {
  return (
    <div className="flex flex-col bg-[#10121A] border-t border-white/[0.07] shrink-0 select-none">
      {/* Contextual Inspector Drawer Content */}
      <div className="h-[195px] sm:h-[210px] overflow-y-auto px-3.5 py-3">
        {/* TAB 1: SPLIT / CUT / TRANSFORM / SLIP */}
        {activeTab === 'edit' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={onSplitAtPlayhead}
                  disabled={!selectedClip}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                >
                  Split at Playhead
                </button>
                <button
                  onClick={onDuplicateSelected}
                  disabled={!selectedClip}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-white/[0.06] text-slate-200 hover:bg-white/[0.12] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                >
                  Duplicate Clip
                </button>
                <button
                  onClick={onDeleteSelected}
                  disabled={!selectedClip}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                >
                  Delete Segment
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onAddPipOverlayClip}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/30 transition-colors whitespace-nowrap shrink-0"
                >
                  + Add B-Roll PIP
                </button>
                <button
                  onClick={() => onTriggerMediaUpload('overlay')}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-white/[0.06] text-slate-200 hover:bg-white/[0.12] transition-colors whitespace-nowrap shrink-0"
                >
                  Upload PIP Media
                </button>
              </div>
            </div>

            {selectedClip ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 border-t border-white/[0.06]">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Scale</span>
                    <span className="font-mono-tabular text-slate-200">
                      {Math.round(selectedClip.scale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.02"
                    value={selectedClip.scale}
                    onChange={(e) =>
                      onUpdateClip(selectedClip.id, { scale: parseFloat(e.target.value) })
                    }
                    className="w-full studio-slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Position X</span>
                    <span className="font-mono-tabular text-slate-200">{selectedClip.x}%</span>
                  </div>
                  <input
                    type="range"
                    min="-80"
                    max="80"
                    step="1"
                    value={selectedClip.x}
                    onChange={(e) =>
                      onUpdateClip(selectedClip.id, { x: parseInt(e.target.value, 10) })
                    }
                    className="w-full studio-slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Position Y</span>
                    <span className="font-mono-tabular text-slate-200">{selectedClip.y}%</span>
                  </div>
                  <input
                    type="range"
                    min="-80"
                    max="80"
                    step="1"
                    value={selectedClip.y}
                    onChange={(e) =>
                      onUpdateClip(selectedClip.id, { y: parseInt(e.target.value, 10) })
                    }
                    className="w-full studio-slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Rotation</span>
                    <span className="font-mono-tabular text-slate-200">{selectedClip.rotation}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={selectedClip.rotation}
                    onChange={(e) =>
                      onUpdateClip(selectedClip.id, { rotation: parseInt(e.target.value, 10) })
                    }
                    className="w-full studio-slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <MoveHorizontal className="w-3 h-3 text-amber-400" />
                      Slip In-Point
                    </span>
                    <span className="font-mono-tabular text-slate-200">
                      {selectedClip.sourceStartOffset.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(1, selectedClip.sourceMaxDuration - selectedClip.duration)}
                    step="0.1"
                    value={selectedClip.sourceStartOffset}
                    onChange={(e) =>
                      onUpdateClip(selectedClip.id, {
                        sourceStartOffset: parseFloat(e.target.value),
                      })
                    }
                    className="w-full studio-slider"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 pt-2">
                Tap any clip on the multi-track timeline to trim, split, slip source offset, or transform geometry.
              </p>
            )}
          </div>
        )}

        {/* TAB 2: COLOR GRADING & CINEMATIC LUTS */}
        {activeTab === 'color' && (
          <div className="space-y-3">
            {selectedClip ? (
              <>
                {/* One-Tap Cinematic LUT Presets */}
                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                  <div className="flex items-center gap-2">
                    {LUT_PRESETS.map((lut) => {
                      const isActive = selectedClip.colorGrading.lutPreset === lut.id;
                      return (
                        <button
                          key={lut.id}
                          onClick={() =>
                            onUpdateColorGrading(selectedClip.id, {
                              ...lut.grading,
                              lutPreset: lut.id,
                            })
                          }
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left transition-all whitespace-nowrap shrink-0 ${
                            isActive
                              ? 'border-amber-400 bg-amber-500/15 text-white'
                              : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full bg-gradient-to-br ${lut.swatch} shrink-0`}
                          />
                          <div>
                            <div className="text-xs font-semibold">{lut.name}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() =>
                      onUpdateColorGrading(selectedClip.id, { ...DEFAULT_COLOR_GRADING })
                    }
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-white/[0.04] whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>

                {/* 6 Fine-Tuning Color Sliders */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Brightness</span>
                      <span className="font-mono-tabular text-slate-200">
                        {selectedClip.colorGrading.brightness}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="160"
                      value={selectedClip.colorGrading.brightness}
                      onChange={(e) =>
                        onUpdateColorGrading(selectedClip.id, {
                          brightness: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full studio-slider"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Contrast</span>
                      <span className="font-mono-tabular text-slate-200">
                        {selectedClip.colorGrading.contrast}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="180"
                      value={selectedClip.colorGrading.contrast}
                      onChange={(e) =>
                        onUpdateColorGrading(selectedClip.id, {
                          contrast: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full studio-slider"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Saturation</span>
                      <span className="font-mono-tabular text-slate-200">
                        {selectedClip.colorGrading.saturation}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={selectedClip.colorGrading.saturation}
                      onChange={(e) =>
                        onUpdateColorGrading(selectedClip.id, {
                          saturation: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full studio-slider"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Warmth</span>
                      <span className="font-mono-tabular text-slate-200">
                        {selectedClip.colorGrading.warmth}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      value={selectedClip.colorGrading.warmth}
                      onChange={(e) =>
                        onUpdateColorGrading(selectedClip.id, {
                          warmth: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full studio-slider"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Vignette</span>
                      <span className="font-mono-tabular text-slate-200">
                        {selectedClip.colorGrading.vignette}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      value={selectedClip.colorGrading.vignette}
                      onChange={(e) =>
                        onUpdateColorGrading(selectedClip.id, {
                          vignette: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full studio-slider"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Blur</span>
                      <span className="font-mono-tabular text-slate-200">
                        {selectedClip.colorGrading.blur}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={selectedClip.colorGrading.blur}
                      onChange={(e) =>
                        onUpdateColorGrading(selectedClip.id, {
                          blur: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full studio-slider"
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400">
                Select a video or overlay clip to apply cinematic LUTs and color grading.
              </p>
            )}
          </div>
        )}

        {/* TAB 3: TEXT & KINETIC TYPOGRAPHY */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={onAddTextClip}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Kinetic Title at Playhead</span>
              </button>

              {selectedClip?.textStyle && (
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {(['none', 'pop', 'slide-up', 'typewriter', 'fade', 'glitch'] as const).map(
                    (anim) => (
                      <button
                        key={anim}
                        onClick={() =>
                          onUpdateTextStyle(selectedClip.id, { animation: anim })
                        }
                        className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
                          selectedClip.textStyle?.animation === anim
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-white/[0.04] text-slate-400 hover:text-white'
                        }`}
                      >
                        {anim}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {selectedClip?.textStyle ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-400 mb-1">Title Copy</label>
                  <input
                    type="text"
                    value={selectedClip.textStyle.content}
                    onChange={(e) =>
                      onUpdateTextStyle(selectedClip.id, { content: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-[#181B26] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
                    placeholder="Enter kinetic title text..."
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Font Size</span>
                    <span className="font-mono-tabular text-slate-200">
                      {selectedClip.textStyle.fontSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="84"
                    value={selectedClip.textStyle.fontSize}
                    onChange={(e) =>
                      onUpdateTextStyle(selectedClip.id, {
                        fontSize: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full studio-slider"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Color</label>
                    <input
                      type="color"
                      value={selectedClip.textStyle.color}
                      onChange={(e) =>
                        onUpdateTextStyle(selectedClip.id, { color: e.target.value })
                      }
                      className="w-9 h-7 rounded cursor-pointer bg-transparent border border-white/10"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Backdrop</label>
                    <button
                      onClick={() =>
                        onUpdateTextStyle(selectedClip.id, {
                          bgEnabled: !selectedClip.textStyle?.bgEnabled,
                        })
                      }
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium ${
                        selectedClip.textStyle.bgEnabled
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-white/[0.06] text-slate-300'
                      }`}
                    >
                      {selectedClip.textStyle.bgEnabled ? 'Banner On' : 'Banner Off'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Select a Text track clip or click &ldquo;Add Kinetic Title at Playhead&rdquo; to customize typography and animations.
              </p>
            )}
          </div>
        )}

        {/* TAB 4: KEYFRAME ANIMATION SYSTEM */}
        {activeTab === 'keyframes' && (
          <div className="space-y-3">
            {selectedClip ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onAddOrUpdateKeyframe}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Diamond className="w-3.5 h-3.5 fill-current" />
                      <span>
                        Add / Update Keyframe @ +
                        {Math.max(0, playhead - selectedClip.startTime).toFixed(2)}s
                      </span>
                    </button>
                  </div>

                  <span className="text-xs text-slate-400">
                    {selectedClip.keyframes.length} active keyframe(s) on clip
                  </span>
                </div>

                {selectedClip.keyframes.length > 0 ? (
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {selectedClip.keyframes
                      .slice()
                      .sort((a, b) => a.timeOffset - b.timeOffset)
                      .map((kf, index) => (
                        <div
                          key={kf.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs shrink-0"
                        >
                          <Diamond className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <div>
                            <div className="font-mono-tabular font-semibold text-slate-200">
                              KF #{index + 1} · +{kf.timeOffset.toFixed(2)}s
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono-tabular">
                              Scale {Math.round(kf.scale * 100)}% · X:{kf.x} Y:{kf.y}
                            </div>
                          </div>
                          <select
                            value={kf.easing}
                            onChange={(e) => {
                              const updated = selectedClip.keyframes.map((item) =>
                                item.id === kf.id
                                  ? { ...item, easing: e.target.value as EasingType }
                                  : item
                              );
                              onUpdateClip(selectedClip.id, { keyframes: updated });
                            }}
                            className="bg-[#181B26] text-[11px] text-slate-200 rounded px-1.5 py-1 border border-white/10"
                          >
                            <option value="linear">Linear</option>
                            <option value="ease-in">Ease In</option>
                            <option value="ease-out">Ease Out</option>
                            <option value="ease-in-out">Ease In-Out</option>
                          </select>
                          <button
                            onClick={() => onRemoveKeyframe(kf.id)}
                            className="text-rose-400 hover:text-rose-300 px-1 text-xs"
                            title="Delete Keyframe"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Position the playhead inside the selected clip, adjust Scale/Position/Rotation, and tap &ldquo;Add / Update Keyframe&rdquo; to interpolate motion.
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400">
                Select any clip on the timeline to animate position, scale, rotation, and opacity keyframes.
              </p>
            )}
          </div>
        )}

        {/* TAB 5: SPEED RAMPING */}
        {activeTab === 'speed' && (
          <div className="space-y-3">
            {selectedClip ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {[0.25, 0.5, 1, 1.5, 2, 4].map((presetSpeed) => (
                      <button
                        key={presetSpeed}
                        onClick={() =>
                          onUpdateClip(selectedClip.id, { speed: presetSpeed })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono-tabular font-semibold transition-colors ${
                          selectedClip.speed === presetSpeed
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]'
                        }`}
                      >
                        {presetSpeed}x
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() =>
                      onUpdateClip(selectedClip.id, {
                        preservePitch: !selectedClip.preservePitch,
                      })
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      selectedClip.preservePitch
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-white/[0.04] text-slate-400 border-white/10'
                    }`}
                  >
                    Pitch Lock: {selectedClip.preservePitch ? 'Active' : 'Off'}
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Fine Speed Multiplier (0.2x Slow-Mo — 4.0x Fast Forward)</span>
                    <span className="font-mono-tabular text-amber-400 font-semibold">
                      {selectedClip.speed.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="4.0"
                    step="0.05"
                    value={selectedClip.speed}
                    onChange={(e) =>
                      onUpdateClip(selectedClip.id, { speed: parseFloat(e.target.value) })
                    }
                    className="w-full studio-slider"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Select a clip to adjust variable playback speed and pitch correction.
              </p>
            )}
          </div>
        )}

        {/* TAB 6: AUDIO MIXER, FADES & STUDIO SFX */}
        {activeTab === 'audio' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onTriggerMediaUpload('audio')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors whitespace-nowrap shrink-0"
                >
                  + Import Audio File
                </button>
                {(['whoosh', 'sub-drop', 'shutter', 'glitch'] as const).map((sfx) => (
                  <button
                    key={sfx}
                    onClick={() => {
                      soundEngine.playOneShotSfx(sfx);
                      onAddSfxClip(sfx);
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] text-slate-200 hover:bg-white/[0.1] capitalize whitespace-nowrap shrink-0"
                  >
                    + SFX: {sfx}
                  </button>
                ))}
              </div>
            </div>

            {selectedClip ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      {selectedClip.muted ? (
                        <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      Clip Gain
                    </span>
                    <span className="font-mono-tabular text-slate-200">
                      {selectedClip.muted ? 'Muted' : `${selectedClip.volume}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedClip.volume}
                    onChange={(e) =>
                      onUpdateClip(selectedClip.id, {
                        volume: parseInt(e.target.value, 10),
                        muted: false,
                      })
                    }
                    className="w-full studio-slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Fade In Envelope</span>
                    <span className="font-mono-tabular text-slate-200">
                      {selectedClip.fadeIn.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3.0"
                    step="0.1"
                    value={selectedClip.fadeIn}
                    onChange={(e) =>
                      onUpdateClip(selectedClip.id, { fadeIn: parseFloat(e.target.value) })
                    }
                    className="w-full studio-slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Fade Out Envelope</span>
                    <span className="font-mono-tabular text-slate-200">
                      {selectedClip.fadeOut.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3.0"
                    step="0.1"
                    value={selectedClip.fadeOut}
                    onChange={(e) =>
                      onUpdateClip(selectedClip.id, { fadeOut: parseFloat(e.target.value) })
                    }
                    className="w-full studio-slider"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Select an audio or video clip to shape gain levels and fade envelopes, or tap an SFX trigger above.
              </p>
            )}
          </div>
        )}

        {/* TAB 7: INTER-CLIP TRANSITIONS */}
        {activeTab === 'transitions' && (
          <div className="space-y-3">
            {selectedClip ? (
              <>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {(
                    [
                      { id: 'none', name: 'Cut (No Transition)' },
                      { id: 'crossfade', name: 'Crossfade Dissolve' },
                      { id: 'wipe-left', name: 'Linear Wipe' },
                      { id: 'zoom-in', name: 'Dynamic Zoom In' },
                      { id: 'whip-pan', name: 'Whip Pan Slide' },
                    ] as { id: TransitionType; name: string }[]
                  ).map((tr) => (
                    <button
                      key={tr.id}
                      onClick={() =>
                        onUpdateClip(selectedClip.id, {
                          transitionIn: {
                            ...selectedClip.transitionIn,
                            type: tr.id,
                          },
                        })
                      }
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                        selectedClip.transitionIn.type === tr.id
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                          : 'bg-white/[0.04] text-slate-300 border-white/10 hover:bg-white/[0.08]'
                      }`}
                    >
                      {tr.name}
                    </button>
                  ))}
                </div>

                <div className="max-w-xs">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Transition Duration</span>
                    <span className="font-mono-tabular text-slate-200">
                      {selectedClip.transitionIn.duration.toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.1"
                    value={selectedClip.transitionIn.duration}
                    onChange={(e) =>
                      onUpdateClip(selectedClip.id, {
                        transitionIn: {
                          ...selectedClip.transitionIn,
                          duration: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full studio-slider"
                  />
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400">
                Select a clip to configure its incoming transition style and timing.
              </p>
            )}
          </div>
        )}

        {/* TAB 8: REAL-TIME VISUAL FX */}
        {activeTab === 'effects' && (
          <div className="space-y-3">
            {selectedClip ? (
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {(
                  [
                    { id: 'none', name: 'Clean Sensor', desc: 'No post FX overlay' },
                    { id: 'chromatic', name: 'Anamorphic RGB Split', desc: 'Chromatic aberration' },
                    { id: 'vhs', name: 'VHS Scanlines', desc: 'Analog tape tracking' },
                    { id: 'film-grain', name: '35mm Kodak Grain', desc: 'Organic celluloid texture' },
                    { id: 'light-leak', name: 'Solar Light Leak', desc: 'Warm optical flare' },
                  ] as { id: VisualEffectType; name: string; desc: string }[]
                ).map((fx) => (
                  <button
                    key={fx.id}
                    onClick={() => onUpdateClip(selectedClip.id, { visualEffect: fx.id })}
                    className={`px-3.5 py-2.5 rounded-xl border text-left transition-all whitespace-nowrap shrink-0 ${
                      selectedClip.visualEffect === fx.id
                        ? 'border-amber-400 bg-amber-500/15 text-white'
                        : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]'
                    }`}
                  >
                    <div className="text-xs font-semibold">{fx.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{fx.desc}</div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Select a clip to apply real-time optical shaders and film texture overlays.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Tab Navigation Bar (Thumb-Zone Optimized >= 44px Hitboxes) */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#0B0C10] border-t border-white/[0.07] overflow-x-auto">
        {DOCK_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`min-h-[46px] min-w-[64px] flex-1 flex flex-col items-center justify-center rounded-lg px-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'text-amber-400 bg-amber-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-medium tracking-tight mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
