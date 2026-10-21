import React, { useState } from 'react';
import {
  Type,
  Sparkles,
  MoveUp,
  MoveDown,
  Heart,
  Zap,
  Square,
  Sliders,
} from 'lucide-react';
import { BottomDrawer } from './BottomDrawer';
import {
  TimelineClip,
  TextStyle,
  TextInAnimation,
  TextOutAnimation,
  TextLoopAnimation,
  TextPresetStyle,
} from '../types/editor';

interface KineticTextSheetProps {
  isOpen: boolean;
  selectedClip: TimelineClip | null;
  onClose: () => void;
  onAddTextClipWithStyle: (presetStyle: TextStyle) => void;
  onUpdateTextStyle?: (style: Partial<TextStyle>) => void;
}

const FONT_FAMILIES = [
  { id: 'Bricolage Grotesque', name: 'Impact Bold' },
  { id: 'Plus Jakarta Sans', name: 'Clean Sans' },
  { id: 'Cinzel', name: 'Cinematic Serif' },
  { id: 'JetBrains Mono', name: 'Typewriter' },
];

export const KineticTextSheet: React.FC<KineticTextSheetProps> = ({
  isOpen,
  selectedClip,
  onClose,
  onAddTextClipWithStyle,
  onUpdateTextStyle,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'style' | 'animation'>('presets');
  const [inputText, setInputText] = useState('VIRAL SUBTITLE TITLE');

  const isEditingSelectedText = selectedClip?.trackId === 'text' && selectedClip.textStyle;
  const currentStyle: TextStyle = selectedClip?.textStyle || {
    content: inputText,
    fontFamily: 'Bricolage Grotesque',
    fontSize: 38,
    fontWeight: '700',
    color: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 3,
    shadowBlur: 14,
    shadowDistance: 3,
    shadowColor: 'rgba(0,0,0,0.85)',
    bgEnabled: false,
    bgColor: '#F59E0B',
    bgRadius: 8,
    bgPadding: 8,
    inAnimation: 'pop-bounce',
    outAnimation: 'none',
    loopAnimation: 'none',
    presetStyle: 'karaoke-active',
  };

  const handleApplyPreset = (preset: TextPresetStyle) => {
    let updatedStyle: Partial<TextStyle> = { presetStyle: preset };

    if (preset === 'karaoke-active') {
      updatedStyle = {
        presetStyle: 'karaoke-active',
        fontFamily: 'Bricolage Grotesque',
        fontSize: 40,
        fontWeight: '800',
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 4,
        bgEnabled: false,
        inAnimation: 'pop-bounce',
        loopAnimation: 'none',
      };
    } else if (preset === 'bouncy-modern') {
      updatedStyle = {
        presetStyle: 'bouncy-modern',
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 32,
        fontWeight: '700',
        color: '#0B0C10',
        strokeColor: '#000000',
        strokeWidth: 0,
        bgEnabled: true,
        bgColor: '#F59E0B',
        bgRadius: 10,
        bgPadding: 10,
        inAnimation: 'slide-up',
        loopAnimation: 'float',
      };
    } else if (preset === 'bold-stroke') {
      updatedStyle = {
        presetStyle: 'bold-stroke',
        fontFamily: 'Bricolage Grotesque',
        fontSize: 44,
        fontWeight: '800',
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 5,
        shadowBlur: 18,
        bgEnabled: false,
        inAnimation: 'pop-bounce',
        loopAnimation: 'heartbeat',
      };
    } else if (preset === 'minimal') {
      updatedStyle = {
        presetStyle: 'minimal',
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 30,
        fontWeight: '600',
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 0,
        bgEnabled: false,
        shadowBlur: 8,
        inAnimation: 'fade',
        loopAnimation: 'none',
      };
    }

    if (isEditingSelectedText && onUpdateTextStyle) {
      onUpdateTextStyle(updatedStyle);
    } else {
      onAddTextClipWithStyle({
        ...currentStyle,
        ...updatedStyle,
        content: inputText,
      });
      onClose();
    }
  };

  return (
    <BottomDrawer isOpen={isOpen} title="Kinetic Typography & Captions" onClose={onClose}>
      <div className="space-y-4">
        {/* Input text content */}
        <div>
          <label className="text-[11px] font-semibold text-slate-400 block mb-1">
            Caption / Title Copy
          </label>
          <input
            type="text"
            value={isEditingSelectedText ? currentStyle.content : inputText}
            onChange={(e) => {
              if (isEditingSelectedText && onUpdateTextStyle) {
                onUpdateTextStyle({ content: e.target.value });
              } else {
                setInputText(e.target.value);
              }
            }}
            placeholder="Type your title text..."
            className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-xl border border-white/[0.06]">
          {(
            [
              { id: 'presets', label: 'Viral Presets' },
              { id: 'style', label: 'Font & Styling' },
              { id: 'animation', label: 'In / Out / Loop' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: VIRAL PRESETS (Karaoke, Bouncy Modern, Bold Stroke, Minimal) */}
        {activeTab === 'presets' && (
          <div className="grid grid-cols-2 gap-2.5">
            {/* Preset 1: Word-by-word Karaoke */}
            <button
              onClick={() => handleApplyPreset('karaoke-active')}
              className={`p-3 rounded-2xl border text-left transition-all h-24 flex flex-col justify-between ${
                currentStyle.presetStyle === 'karaoke-active'
                  ? 'bg-amber-500/20 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                  : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400">Karaoke Shorts</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-white">
                  WORD <span className="text-amber-400 animate-pulse">HIGHLIGHT</span>
                </div>
                <div className="text-[10px] text-slate-400">Active word scale & amber color</div>
              </div>
            </button>

            {/* Preset 2: Bouncy Modern */}
            <button
              onClick={() => handleApplyPreset('bouncy-modern')}
              className={`p-3 rounded-2xl border text-left transition-all h-24 flex flex-col justify-between ${
                currentStyle.presetStyle === 'bouncy-modern'
                  ? 'bg-amber-500/20 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                  : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400">Bouncy Pill</span>
                <Square className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              </div>
              <div>
                <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-xs font-bold">
                  YELLOW PILL
                </span>
                <div className="text-[10px] text-slate-400 mt-1">High-contrast backdrop box</div>
              </div>
            </button>

            {/* Preset 3: Bold Stroke Impact */}
            <button
              onClick={() => handleApplyPreset('bold-stroke')}
              className={`p-3 rounded-2xl border text-left transition-all h-24 flex flex-col justify-between ${
                currentStyle.presetStyle === 'bold-stroke'
                  ? 'bg-amber-500/20 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                  : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400">Bold Stroke</span>
                <Type className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <div
                  className="text-sm font-extrabold text-white"
                  style={{ textShadow: '0 0 4px #000, 2px 2px 0 #000' }}
                >
                  IMPACT POP
                </div>
                <div className="text-[10px] text-slate-400">Thick border & shadow drop</div>
              </div>
            </button>

            {/* Preset 4: Minimal Clean */}
            <button
              onClick={() => handleApplyPreset('minimal')}
              className={`p-3 rounded-2xl border text-left transition-all h-24 flex flex-col justify-between ${
                currentStyle.presetStyle === 'minimal'
                  ? 'bg-amber-500/20 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                  : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300">Clean Minimal</span>
                <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div>
                <div className="text-xs font-medium text-white tracking-widest uppercase">
                  Cinematic
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Smooth fade & clean sans</div>
              </div>
            </button>
          </div>
        )}

        {/* TAB 2: FONT & VISUAL STYLING */}
        {activeTab === 'style' && (
          <div className="space-y-3.5">
            {/* Font Family Picker */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">Font Style</label>
              <div className="grid grid-cols-2 gap-2">
                {FONT_FAMILIES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      if (onUpdateTextStyle) onUpdateTextStyle({ fontFamily: f.id });
                    }}
                    className={`p-2 rounded-xl text-xs font-semibold border transition-all ${
                      currentStyle.fontFamily === f.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-white/[0.04] border-white/10 text-slate-300'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Color & Border Stroke Width */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Fill Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={currentStyle.color}
                    onChange={(e) => {
                      if (onUpdateTextStyle) onUpdateTextStyle({ color: e.target.value });
                    }}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border border-white/10"
                  />
                  <span className="font-mono-tabular text-xs text-white">{currentStyle.color}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Border Stroke</span>
                  <span className="font-mono-tabular text-amber-400 font-semibold">
                    {currentStyle.strokeWidth}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="8"
                  value={currentStyle.strokeWidth}
                  onChange={(e) => {
                    if (onUpdateTextStyle)
                      onUpdateTextStyle({ strokeWidth: parseInt(e.target.value, 10) });
                  }}
                  className="w-full studio-slider h-2.5"
                />
              </div>
            </div>

            {/* Background Pill Box Toggle & Corner Radius */}
            <div className="p-3 bg-black/40 rounded-2xl border border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Background Pill Box</span>
                <button
                  onClick={() => {
                    if (onUpdateTextStyle)
                      onUpdateTextStyle({ bgEnabled: !currentStyle.bgEnabled });
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    currentStyle.bgEnabled
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-white/[0.06] text-slate-400'
                  }`}
                >
                  {currentStyle.bgEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {currentStyle.bgEnabled && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Box Color</label>
                    <input
                      type="color"
                      value={currentStyle.bgColor}
                      onChange={(e) => {
                        if (onUpdateTextStyle) onUpdateTextStyle({ bgColor: e.target.value });
                      }}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border border-white/10"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Corner Radius</span>
                      <span className="font-mono-tabular text-amber-400">
                        {currentStyle.bgRadius || 8}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="20"
                      value={currentStyle.bgRadius || 8}
                      onChange={(e) => {
                        if (onUpdateTextStyle)
                          onUpdateTextStyle({ bgRadius: parseInt(e.target.value, 10) });
                      }}
                      className="w-full studio-slider h-2"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: IN / OUT & LOOP ANIMATIONS */}
        {activeTab === 'animation' && (
          <div className="space-y-3.5">
            {/* In Animations */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5 flex items-center gap-1">
                <MoveUp className="w-3.5 h-3.5 text-amber-400" />
                <span>In Animation</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'pop-bounce', label: 'Spring Bounce' },
                    { id: 'typewriter', label: 'Typewriter' },
                    { id: 'slide-up', label: 'Slide Up' },
                    { id: 'fade', label: 'Smooth Fade' },
                  ] as { id: TextInAnimation; label: string }[]
                ).map((anim) => (
                  <button
                    key={anim.id}
                    onClick={() => {
                      if (onUpdateTextStyle) onUpdateTextStyle({ inAnimation: anim.id });
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      currentStyle.inAnimation === anim.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-white/[0.04] border-white/10 text-slate-300'
                    }`}
                  >
                    {anim.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Out Animations */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5 flex items-center gap-1">
                <MoveDown className="w-3.5 h-3.5 text-sky-400" />
                <span>Out Animation</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'none', label: 'None' },
                    { id: 'slide-down', label: 'Slide Down' },
                    { id: 'zoom-out', label: 'Zoom Out Fade' },
                    { id: 'glitch-dissolve', label: 'Glitch Dissolve' },
                  ] as { id: TextOutAnimation; label: string }[]
                ).map((anim) => (
                  <button
                    key={anim.id}
                    onClick={() => {
                      if (onUpdateTextStyle) onUpdateTextStyle({ outAnimation: anim.id });
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      currentStyle.outAnimation === anim.id
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                        : 'bg-white/[0.04] border-white/10 text-slate-300'
                    }`}
                  >
                    {anim.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Loop Animations */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span>Loop Motion</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'none', label: 'Static' },
                    { id: 'heartbeat', label: 'Heartbeat Pulse' },
                    { id: 'float', label: 'Subtle Float' },
                    { id: 'neon-flicker', label: 'Neon Flicker' },
                  ] as { id: TextLoopAnimation; label: string }[]
                ).map((anim) => (
                  <button
                    key={anim.id}
                    onClick={() => {
                      if (onUpdateTextStyle) onUpdateTextStyle({ loopAnimation: anim.id });
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      currentStyle.loopAnimation === anim.id
                        ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                        : 'bg-white/[0.04] border-white/10 text-slate-300'
                    }`}
                  >
                    {anim.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Button if inserting new text */}
        {!isEditingSelectedText && (
          <button
            onClick={() => {
              onAddTextClipWithStyle({
                ...currentStyle,
                content: inputText,
              });
              onClose();
            }}
            className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow"
          >
            <Type className="w-4 h-4" />
            <span>Insert Kinetic Title at Playhead</span>
          </button>
        )}
      </div>
    </BottomDrawer>
  );
};
