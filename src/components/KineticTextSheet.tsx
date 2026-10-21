import React, { useState, useEffect, useRef } from 'react';
import {
  Type,
  Sparkles,
  MoveUp,
  MoveDown,
  Heart,
  Zap,
  Square,
  Sliders,
  Upload,
  Plus,
  Trash2,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Sun,
  Eye,
  Layers,
  Palette,
} from 'lucide-react';
import { BottomDrawer } from './BottomDrawer';
import {
  TimelineClip,
  TextStyle,
  TextInAnimation,
  TextOutAnimation,
  TextLoopAnimation,
  TextPresetStyle,
  TextBackgroundShape,
  TextGradientDirection,
  CustomFontItem,
} from '../types/editor';
import {
  CURATED_FONTS,
  initCustomFonts,
  uploadCustomFontFile,
  deleteCustomFont,
} from '../utils/fontManager';

interface KineticTextSheetProps {
  isOpen: boolean;
  selectedClip: TimelineClip | null;
  onClose: () => void;
  onAddTextClipWithStyle: (presetStyle: TextStyle) => void;
  onUpdateTextStyle?: (style: Partial<TextStyle>) => void;
}

const COLOR_SWATCHES = [
  '#FFFFFF',
  '#F59E0B',
  '#EF4444',
  '#10B981',
  '#06B6D4',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#F43F5E',
  '#0B0C10',
];

export const KineticTextSheet: React.FC<KineticTextSheetProps> = ({
  isOpen,
  selectedClip,
  onClose,
  onAddTextClipWithStyle,
  onUpdateTextStyle,
}) => {
  const [activeTab, setActiveTab] = useState<'style' | 'animation' | 'fonts'>('style');
  const [animationSubTab, setAnimationSubTab] = useState<'in' | 'out' | 'loop'>('in');
  const [inputText, setInputText] = useState('CREATIVE TITLE');
  const [customFonts, setCustomFonts] = useState<CustomFontItem[]>([]);
  const [isUploadingFont, setIsUploadingFont] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditingSelectedText = selectedClip?.trackId === 'text' && !!selectedClip.textStyle;

  // Load custom fonts from IndexedDB on open
  useEffect(() => {
    if (isOpen) {
      initCustomFonts().then(setCustomFonts);
    }
  }, [isOpen]);

  // Sync inputText if selected clip changes
  useEffect(() => {
    if (selectedClip?.textStyle?.content) {
      setInputText(selectedClip.textStyle.content);
    }
  }, [selectedClip?.id, selectedClip?.textStyle?.content]);

  const currentStyle: TextStyle = selectedClip?.textStyle || {
    content: inputText,
    fontFamily: 'Bebas Neue',
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
    opacity: 1,
    gradientEnabled: false,
    gradientStart: '#F59E0B',
    gradientEnd: '#EF4444',
    gradientDirection: '90deg',
    bgEnabled: false,
    bgShape: 'none',
    bgColor: '#F59E0B',
    bgOpacity: 0.9,
    bgRadius: 10,
    bgPaddingX: 16,
    bgPaddingY: 8,
    bgPadding: 12,
    letterSpacing: 2,
    lineHeight: 1.2,
    textAlign: 'center',
    strokeColor: '#000000',
    strokeWidth: 3,
    shadowBlur: 16,
    shadowDistance: 3,
    shadowOffsetX: 0,
    shadowOffsetY: 4,
    shadowColor: 'rgba(0,0,0,0.85)',
    shadowOpacity: 0.85,
    glowMode: false,
    inAnimation: 'spring-pop',
    inDuration: 0.5,
    outAnimation: 'none',
    outDuration: 0.4,
    loopAnimation: 'none',
    presetStyle: 'bouncy-modern',
  };

  // Immediate update helper
  const handleUpdate = (updates: Partial<TextStyle>) => {
    if (isEditingSelectedText && onUpdateTextStyle) {
      onUpdateTextStyle(updates);
    }
  };

  // Text content change
  const handleTextContentChange = (val: string) => {
    setInputText(val);
    handleUpdate({ content: val });
  };

  // Handle uploading custom font file
  const handleFontFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFont(true);
    try {
      const item = await uploadCustomFontFile(file);
      if (item) {
        setCustomFonts((prev) => [item, ...prev]);
        handleUpdate({ fontFamily: item.name });
      }
    } catch (err) {
      console.error('Font upload failed:', err);
    } finally {
      setIsUploadingFont(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle deleting custom font
  const handleDeleteFont = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteCustomFont(id);
    setCustomFonts((prev) => prev.filter((f) => f.id !== id));
  };

  // Apply viral preset
  const handleApplyPreset = (preset: TextPresetStyle) => {
    let updatedStyle: Partial<TextStyle> = { presetStyle: preset };

    if (preset === 'karaoke-active') {
      updatedStyle = {
        presetStyle: 'karaoke-active',
        fontFamily: 'Bebas Neue',
        fontSize: 44,
        fontWeight: '700',
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 4,
        bgEnabled: false,
        bgShape: 'none',
        inAnimation: 'spring-pop',
        inDuration: 0.45,
        loopAnimation: 'none',
      };
    } else if (preset === 'bouncy-modern') {
      updatedStyle = {
        presetStyle: 'bouncy-modern',
        fontFamily: 'Montserrat',
        fontSize: 34,
        fontWeight: '700',
        color: '#0B0C10',
        strokeWidth: 0,
        bgEnabled: true,
        bgShape: 'rounded-pill',
        bgColor: '#F59E0B',
        bgRadius: 20,
        bgPaddingX: 18,
        bgPaddingY: 8,
        inAnimation: 'slide-blur',
        inDuration: 0.5,
        loopAnimation: 'float',
      };
    } else if (preset === 'bold-stroke') {
      updatedStyle = {
        presetStyle: 'bold-stroke',
        fontFamily: 'Anton',
        fontSize: 46,
        fontWeight: '700',
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 6,
        shadowBlur: 20,
        bgEnabled: false,
        bgShape: 'none',
        inAnimation: 'spring-pop',
        loopAnimation: 'pulse',
      };
    } else if (preset === 'minimal') {
      updatedStyle = {
        presetStyle: 'minimal',
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 28,
        fontWeight: '600',
        color: '#FFFFFF',
        strokeWidth: 0,
        shadowBlur: 0,
        bgEnabled: false,
        bgShape: 'none',
        inAnimation: 'fade',
        loopAnimation: 'none',
      };
    }

    handleUpdate(updatedStyle);
  };

  return (
    <BottomDrawer
      isOpen={isOpen}
      title="Pro Typography Suite"
      onClose={onClose}
      onReset={() =>
        handleUpdate({
          color: '#FFFFFF',
          strokeWidth: 0,
          shadowBlur: 0,
          bgEnabled: false,
          inAnimation: 'none',
          outAnimation: 'none',
          loopAnimation: 'none',
        })
      }
    >
      <div className="space-y-4">
        {/* Live Text String Input Header */}
        <div className="space-y-1.5 bg-[#12141C] p-3 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">Text Content:</span>
            {!isEditingSelectedText && (
              <span className="text-[10px] text-amber-400 font-semibold">New Layer</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => handleTextContentChange(e.target.value)}
              placeholder="Type your viral headline..."
              className="flex-1 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white font-semibold text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
            />
            {!isEditingSelectedText && (
              <button
                onClick={() =>
                  onAddTextClipWithStyle({
                    ...currentStyle,
                    content: inputText.trim() || 'NEW TEXT',
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Layer</span>
              </button>
            )}
          </div>
        </div>

        {/* 3-Tab Bottom Sheet Selector */}
        <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/10 rounded-2xl">
          <button
            onClick={() => setActiveTab('style')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'style'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Style</span>
          </button>
          <button
            onClick={() => setActiveTab('animation')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'animation'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Animation</span>
          </button>
          <button
            onClick={() => setActiveTab('fonts')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'fonts'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Fonts</span>
          </button>
        </div>

        {/* ===================== TAB 1: GRANULAR STYLING ===================== */}
        {activeTab === 'style' && (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {/* 1. Color & Fill */}
            <div className="p-3 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                1. Color & Fill
              </span>

              {/* Solid Color Swatches */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Solid Color:</span>
                  <span className="font-mono text-amber-300 font-bold">{currentStyle.color}</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {COLOR_SWATCHES.map((c) => (
                    <button
                      key={c}
                      onClick={() => handleUpdate({ color: c, gradientEnabled: false })}
                      className={`w-6 h-6 rounded-full shrink-0 border transition-all ${
                        currentStyle.color === c && !currentStyle.gradientEnabled
                          ? 'border-amber-400 scale-110 shadow-md'
                          : 'border-white/20'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={currentStyle.color.startsWith('#') ? currentStyle.color : '#FFFFFF'}
                    onChange={(e) => handleUpdate({ color: e.target.value, gradientEnabled: false })}
                    className="w-6 h-6 rounded-full cursor-pointer bg-transparent border-0"
                    title="Custom color"
                  />
                </div>
              </div>

              {/* Linear Gradient Fill Toggle */}
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300 font-semibold">Linear Gradient Fill:</span>
                  <button
                    onClick={() => handleUpdate({ gradientEnabled: !currentStyle.gradientEnabled })}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      currentStyle.gradientEnabled
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-white/[0.06] text-slate-400 hover:text-white'
                    }`}
                  >
                    {currentStyle.gradientEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {currentStyle.gradientEnabled && (
                  <div className="space-y-2 bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06]">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400">Start Color:</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={currentStyle.gradientStart || '#F59E0B'}
                            onChange={(e) => handleUpdate({ gradientStart: e.target.value })}
                            className="w-5 h-5 rounded cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-slate-300">
                            {currentStyle.gradientStart || '#F59E0B'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400">End Color:</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={currentStyle.gradientEnd || '#EF4444'}
                            onChange={(e) => handleUpdate({ gradientEnd: e.target.value })}
                            className="w-5 h-5 rounded cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-slate-300">
                            {currentStyle.gradientEnd || '#EF4444'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Gradient Direction */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400">Direction:</span>
                      {(['90deg', '180deg', '45deg'] as TextGradientDirection[]).map((dir) => (
                        <button
                          key={dir}
                          onClick={() => handleUpdate({ gradientDirection: dir })}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            currentStyle.gradientDirection === dir
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                              : 'bg-white/[0.04] text-slate-400'
                          }`}
                        >
                          {dir === '90deg' ? 'Horizontal' : dir === '180deg' ? 'Vertical' : 'Diagonal'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Text Opacity Slider */}
              <div className="pt-2 border-t border-white/[0.06] space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Text Opacity:</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {Math.round((currentStyle.opacity ?? 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={currentStyle.opacity ?? 1}
                  onChange={(e) => handleUpdate({ opacity: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer h-1.5"
                />
              </div>
            </div>

            {/* 2. Text Background / Pill Box */}
            <div className="p-3 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                2. Text Background / Pill Box
              </span>

              {/* Shape Toggle */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Background Shape:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: 'none', label: 'None' },
                      { id: 'rounded-pill', label: 'Pill' },
                      { id: 'sharp-box', label: 'Box' },
                      { id: 'underline-highlight', label: 'Underline' },
                    ] as { id: TextBackgroundShape; label: string }[]
                  ).map((shape) => (
                    <button
                      key={shape.id}
                      onClick={() =>
                        handleUpdate({
                          bgShape: shape.id,
                          bgEnabled: shape.id !== 'none',
                        })
                      }
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                        (currentStyle.bgShape === shape.id) || (!currentStyle.bgShape && shape.id === (currentStyle.bgEnabled ? 'rounded-pill' : 'none'))
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-white/[0.04] text-slate-300 hover:text-white border border-white/10'
                      }`}
                    >
                      {shape.label}
                    </button>
                  ))}
                </div>
              </div>

              {currentStyle.bgEnabled && currentStyle.bgShape !== 'none' && (
                <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
                  {/* Background Color & Opacity */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400">Bg Color:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={currentStyle.bgColor || '#F59E0B'}
                          onChange={(e) => handleUpdate({ bgColor: e.target.value })}
                          className="w-5 h-5 rounded cursor-pointer"
                        />
                        <span className="text-[10px] font-mono text-slate-300">
                          {currentStyle.bgColor || '#F59E0B'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Bg Opacity:</span>
                        <span className="font-mono text-amber-300 font-bold">
                          {Math.round((currentStyle.bgOpacity ?? 0.9) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={currentStyle.bgOpacity ?? 0.9}
                        onChange={(e) => handleUpdate({ bgOpacity: Number(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer h-1.5"
                      />
                    </div>
                  </div>

                  {/* Padding X & Y */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Pad X:</span>
                        <span className="font-mono text-amber-300 font-bold">
                          {currentStyle.bgPaddingX ?? 16}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="40"
                        step="1"
                        value={currentStyle.bgPaddingX ?? 16}
                        onChange={(e) => handleUpdate({ bgPaddingX: Number(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer h-1.5"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Pad Y:</span>
                        <span className="font-mono text-amber-300 font-bold">
                          {currentStyle.bgPaddingY ?? 8}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="30"
                        step="1"
                        value={currentStyle.bgPaddingY ?? 8}
                        onChange={(e) => handleUpdate({ bgPaddingY: Number(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer h-1.5"
                      />
                    </div>
                  </div>

                  {/* Corner Radius Slider */}
                  {currentStyle.bgShape !== 'sharp-box' && currentStyle.bgShape !== 'underline-highlight' && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Corner Radius:</span>
                        <span className="font-mono text-amber-300 font-bold">
                          {currentStyle.bgRadius ?? 10}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="32"
                        step="1"
                        value={currentStyle.bgRadius ?? 10}
                        onChange={(e) => handleUpdate({ bgRadius: Number(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer h-1.5"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Typography Spacing & Metrics */}
            <div className="p-3 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                3. Spacing & Text Alignment
              </span>

              {/* Letter Spacing Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Letter Spacing (Tracking):</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {currentStyle.letterSpacing ?? 0}px
                  </span>
                </div>
                <input
                  type="range"
                  min="-5"
                  max="20"
                  step="0.5"
                  value={currentStyle.letterSpacing ?? 0}
                  onChange={(e) => handleUpdate({ letterSpacing: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer h-1.5"
                />
              </div>

              {/* Line Height Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Line Height (Leading):</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {(currentStyle.lineHeight ?? 1.2).toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="2.5"
                  step="0.1"
                  value={currentStyle.lineHeight ?? 1.2}
                  onChange={(e) => handleUpdate({ lineHeight: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer h-1.5"
                />
              </div>

              {/* Text Alignment */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">Alignment:</span>
                <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10">
                  {(
                    [
                      { id: 'left', icon: <AlignLeft className="w-3.5 h-3.5" /> },
                      { id: 'center', icon: <AlignCenter className="w-3.5 h-3.5" /> },
                      { id: 'right', icon: <AlignRight className="w-3.5 h-3.5" /> },
                      { id: 'justify', icon: <AlignJustify className="w-3.5 h-3.5" /> },
                    ] as const
                  ).map((align) => (
                    <button
                      key={align.id}
                      onClick={() => handleUpdate({ textAlign: align.id })}
                      className={`p-1.5 rounded-lg transition-all ${
                        (currentStyle.textAlign || 'center') === align.id
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {align.icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Stroke & Shadow Controls */}
            <div className="p-3 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                4. Stroke & Drop Shadow / Glow
              </span>

              {/* Stroke Controls */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Stroke Thickness:</span>
                    <input
                      type="color"
                      value={currentStyle.strokeColor.startsWith('#') ? currentStyle.strokeColor : '#000000'}
                      onChange={(e) => handleUpdate({ strokeColor: e.target.value })}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                  </div>
                  <span className="font-mono text-amber-300 font-bold">{currentStyle.strokeWidth}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="1"
                  value={currentStyle.strokeWidth}
                  onChange={(e) => handleUpdate({ strokeWidth: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer h-1.5"
                />
              </div>

              {/* Glow Mode Toggle */}
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-300 font-semibold block">Screen Glow Mode:</span>
                  <span className="text-[9px] text-slate-500">Zero offset with high radiant bloom</span>
                </div>
                <button
                  onClick={() => handleUpdate({ glowMode: !currentStyle.glowMode })}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    currentStyle.glowMode
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-white/[0.06] text-slate-400 hover:text-white'
                  }`}
                >
                  {currentStyle.glowMode ? 'Active' : 'Off'}
                </button>
              </div>

              {/* Shadow Controls */}
              <div className="space-y-2 pt-1 border-t border-white/[0.06]">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Shadow Blur Radius:</span>
                    <input
                      type="color"
                      value={currentStyle.shadowColor.startsWith('#') ? currentStyle.shadowColor : '#000000'}
                      onChange={(e) => handleUpdate({ shadowColor: e.target.value })}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                  </div>
                  <span className="font-mono text-amber-300 font-bold">{currentStyle.shadowBlur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  value={currentStyle.shadowBlur}
                  onChange={(e) => handleUpdate({ shadowBlur: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer h-1.5"
                />

                {!currentStyle.glowMode && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Offset X:</span>
                        <span className="font-mono text-amber-300 font-bold">
                          {currentStyle.shadowOffsetX ?? 0}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-20"
                        max="20"
                        step="1"
                        value={currentStyle.shadowOffsetX ?? 0}
                        onChange={(e) => handleUpdate({ shadowOffsetX: Number(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer h-1.5"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Offset Y:</span>
                        <span className="font-mono text-amber-300 font-bold">
                          {currentStyle.shadowOffsetY ?? 4}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-20"
                        max="20"
                        step="1"
                        value={currentStyle.shadowOffsetY ?? 4}
                        onChange={(e) => handleUpdate({ shadowOffsetY: Number(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer h-1.5"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: ANIMATION & PRESETS ===================== */}
        {activeTab === 'animation' && (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {/* Quick Viral Presets Shelf */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300">Viral Typography Presets:</span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'karaoke-active', name: 'Karaoke Active', desc: 'Word-by-word dynamic gold highlight' },
                    { id: 'bouncy-modern', name: 'Bouncy Pill', desc: 'Floating rounded capsule with spring' },
                    { id: 'bold-stroke', name: 'Bold Stroke', desc: 'Heavy outline with pulse beat' },
                    { id: 'minimal', name: 'Clean Minimal', desc: 'Crisp editorial look with linear fade' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleApplyPreset(p.id)}
                    className={`p-2.5 rounded-2xl border text-left transition-all ${
                      currentStyle.presetStyle === p.id
                        ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-md'
                        : 'bg-white/[0.04] border-white/10 hover:border-white/20 text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold">{p.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Segmented Operational Sub-Mode: In / Out / Loop */}
            <div className="p-3 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Kinetic Animations
                </span>
                <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/10">
                  {(['in', 'out', 'loop'] as const).map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setAnimationSubTab(sub)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                        animationSubTab === sub
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-mode 1: IN ANIMATIONS */}
              {animationSubTab === 'in' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: 'typewriter', name: 'Typewriter', desc: 'Char-by-char reveal' },
                        { id: 'spring-pop', name: 'Spring Pop', desc: 'Elastic bounce (0-115-100%)' },
                        { id: 'slide-blur', name: 'Slide & Blur', desc: 'Upward slide with motion blur' },
                        { id: 'fade', name: 'Fade In', desc: 'Smooth cubic ramp' },
                        { id: 'none', name: 'None', desc: 'Instant cut' },
                      ] as { id: TextInAnimation; name: string; desc: string }[]
                    ).map((anim) => (
                      <button
                        key={anim.id}
                        onClick={() => handleUpdate({ inAnimation: anim.id })}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          currentStyle.inAnimation === anim.id
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                            : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-semibold">{anim.name}</div>
                        <div className="text-[10px] text-slate-400">{anim.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* In Duration Slider */}
                  {currentStyle.inAnimation !== 'none' && (
                    <div className="space-y-1 pt-2 border-t border-white/[0.06]">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Entrance Speed / Duration:</span>
                        <span className="font-mono text-amber-300 font-bold">
                          {(currentStyle.inDuration ?? 0.5).toFixed(2)}s
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="2.0"
                        step="0.05"
                        value={currentStyle.inDuration ?? 0.5}
                        onChange={(e) => handleUpdate({ inDuration: Number(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer h-1.5"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Sub-mode 2: OUT ANIMATIONS */}
              {animationSubTab === 'out' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: 'slide-down', name: 'Slide Down', desc: 'Downwards smooth exit' },
                        { id: 'zoom-out', name: 'Zoom Fade Out', desc: 'Centric scale-down decay' },
                        { id: 'glitch-wipe', name: 'Glitch Wipe', desc: 'RGB jitter dissolve' },
                        { id: 'shrink-drop', name: 'Shrink Drop', desc: 'Rapid velocity shrink' },
                        { id: 'none', name: 'None', desc: 'Instant cut' },
                      ] as { id: TextOutAnimation; name: string; desc: string }[]
                    ).map((anim) => (
                      <button
                        key={anim.id}
                        onClick={() => handleUpdate({ outAnimation: anim.id })}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          currentStyle.outAnimation === anim.id
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                            : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-semibold">{anim.name}</div>
                        <div className="text-[10px] text-slate-400">{anim.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* Out Duration Slider */}
                  {currentStyle.outAnimation !== 'none' && (
                    <div className="space-y-1 pt-2 border-t border-white/[0.06]">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Exit Duration:</span>
                        <span className="font-mono text-amber-300 font-bold">
                          {(currentStyle.outDuration ?? 0.4).toFixed(2)}s
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="2.0"
                        step="0.05"
                        value={currentStyle.outDuration ?? 0.4}
                        onChange={(e) => handleUpdate({ outDuration: Number(e.target.value) })}
                        className="w-full accent-amber-500 cursor-pointer h-1.5"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Sub-mode 3: LOOP ANIMATIONS */}
              {animationSubTab === 'loop' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: 'heartbeat', name: 'Pulse / Heartbeat', desc: 'Rhythmic systolic expansion' },
                        { id: 'float', name: 'Floating Bob', desc: 'Continuous sinusoidal hover' },
                        { id: 'breathing', name: 'Subtle Breathing', desc: 'Gentle organic scale' },
                        { id: 'karaoke-wave', name: 'Karaoke Wave', desc: 'Harmonic wave oscillation' },
                        { id: 'none', name: 'None', desc: 'Stationary position' },
                      ] as { id: TextLoopAnimation; name: string; desc: string }[]
                    ).map((anim) => (
                      <button
                        key={anim.id}
                        onClick={() => handleUpdate({ loopAnimation: anim.id })}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          currentStyle.loopAnimation === anim.id
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                            : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-semibold">{anim.name}</div>
                        <div className="text-[10px] text-slate-400">{anim.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 3: CUSTOM FONT IMPORTER & FONTS ===================== */}
        {activeTab === 'fonts' && (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {/* Custom Font Upload Button */}
            <div className="bg-[#12141C] p-3 rounded-2xl border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Import Custom Fonts</h4>
                  <p className="text-[10px] text-slate-400">
                    Supports .ttf, .otf, .woff, and .woff2 font files
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingFont}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingFont ? 'Loading...' : '+ Upload Font'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  onChange={handleFontFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* My Uploaded Fonts Section */}
            {customFonts.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300">My Uploaded Fonts ({customFonts.length}):</span>
                <div className="grid grid-cols-2 gap-2">
                  {customFonts.map((f) => {
                    const isSelected = currentStyle.fontFamily === f.name;
                    return (
                      <div
                        key={f.id}
                        onClick={() => handleUpdate({ fontFamily: f.name })}
                        className={`p-2.5 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                            : 'bg-white/[0.04] border-white/10 hover:border-white/20 text-slate-200'
                        }`}
                      >
                        <div className="truncate pr-1">
                          <div className="text-xs font-bold truncate" style={{ fontFamily: `"${f.name}", sans-serif` }}>
                            {f.name}
                          </div>
                          <span className="text-[9px] text-slate-400 uppercase">{f.format} font</span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteFont(f.id, e)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete font"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Built-in Curated Display Fonts */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300">Curated Display Fonts:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CURATED_FONTS.map((font) => {
                  const isSelected = currentStyle.fontFamily === font.id;
                  return (
                    <button
                      key={font.id}
                      onClick={() => handleUpdate({ fontFamily: font.id })}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-md'
                          : 'bg-white/[0.04] border-white/10 hover:border-white/20 text-slate-200'
                      }`}
                    >
                      <div>
                        <div
                          className="text-base font-bold leading-tight"
                          style={{ fontFamily: `"${font.id}", sans-serif` }}
                        >
                          {font.sample}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {font.name} · <span className="text-slate-500">{font.category}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </BottomDrawer>
  );
};
