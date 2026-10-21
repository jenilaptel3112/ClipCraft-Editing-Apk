import React, { useState } from 'react';
import { Type } from 'lucide-react';
import { BottomDrawer } from './BottomDrawer';
import { TimelineClip, TextStyle } from '../types/editor';

interface TextDrawerProps {
  isOpen: boolean;
  selectedClip: TimelineClip | null;
  onClose: () => void;
  onAddTextClipWithStyle: (presetStyle: {
    fontFamily: string;
    fontSize: number;
    color: string;
    strokeColor: string;
    strokeWidth: number;
    bgEnabled: boolean;
    bgColor: string;
    animation: 'none' | 'fade' | 'pop' | 'slide-up' | 'typewriter';
  }) => void;
  onUpdateTextStyle?: (style: Partial<TextStyle>) => void;
}

const TEXT_PRESETS = [
  {
    id: 'minimal',
    name: 'Minimal Clean',
    previewText: 'MINIMAL',
    style: {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 34,
      color: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 0,
      bgEnabled: false,
      bgColor: '#000000',
      animation: 'fade' as const,
    },
  },
  {
    id: 'neon',
    name: 'Vibrant Neon',
    previewText: 'NEON POP',
    style: {
      fontFamily: 'Bricolage Grotesque',
      fontSize: 44,
      color: '#38BDF8',
      strokeColor: '#0F172A',
      strokeWidth: 3,
      bgEnabled: false,
      bgColor: '#000000',
      animation: 'pop' as const,
    },
  },
  {
    id: 'subtitle',
    name: 'Yellow Subtitle',
    previewText: 'CAPTION PILL',
    style: {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 28,
      color: '#0B0C10',
      strokeColor: '#000000',
      strokeWidth: 0,
      bgEnabled: true,
      bgColor: '#F59E0B',
      animation: 'slide-up' as const,
    },
  },
  {
    id: 'bold-stroke',
    name: 'Bold Kinetic',
    previewText: 'BOLD STROKE',
    style: {
      fontFamily: 'Bricolage Grotesque',
      fontSize: 48,
      color: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 4,
      bgEnabled: false,
      bgColor: '#000000',
      animation: 'typewriter' as const,
    },
  },
];

export const TextDrawer: React.FC<TextDrawerProps> = ({
  isOpen,
  selectedClip,
  onClose,
  onAddTextClipWithStyle,
  onUpdateTextStyle,
}) => {
  const [inputText, setInputText] = useState('New Title');

  const isEditingSelectedText = selectedClip?.trackId === 'text' && selectedClip.textStyle;

  return (
    <BottomDrawer isOpen={isOpen} title="Text & Stickers" onClose={onClose}>
      <div className="space-y-4">
        {/* If editing selected text */}
        {isEditingSelectedText && onUpdateTextStyle ? (
          <div className="space-y-3">
            <label className="text-xs text-slate-300 font-medium block">Text Content</label>
            <input
              type="text"
              value={selectedClip.textStyle?.content || ''}
              onChange={(e) => onUpdateTextStyle({ content: e.target.value })}
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
            />

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Font Size</span>
                <span className="font-mono-tabular text-white">{selectedClip.textStyle?.fontSize}px</span>
              </div>
              <input
                type="range"
                min="20"
                max="72"
                value={selectedClip.textStyle?.fontSize || 36}
                onChange={(e) => onUpdateTextStyle({ fontSize: parseInt(e.target.value, 10) })}
                className="w-full studio-slider"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1">Title Text</label>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter headline..."
              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>
        )}

        {/* Popular Style Presets */}
        <div>
          <label className="text-xs text-slate-400 block mb-2">Tap a Style Preset</label>
          <div className="grid grid-cols-2 gap-2.5">
            {TEXT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  if (isEditingSelectedText && onUpdateTextStyle) {
                    onUpdateTextStyle({
                      fontFamily: preset.style.fontFamily,
                      fontSize: preset.style.fontSize,
                      color: preset.style.color,
                      strokeColor: preset.style.strokeColor,
                      strokeWidth: preset.style.strokeWidth,
                      bgEnabled: preset.style.bgEnabled,
                      bgColor: preset.style.bgColor,
                      animation: preset.style.animation,
                    });
                  } else {
                    onAddTextClipWithStyle({
                      ...preset.style,
                    });
                  }
                  onClose();
                }}
                className="p-3 bg-white/[0.04] hover:bg-white/[0.08] active:scale-96 border border-white/10 rounded-2xl text-left transition-all flex flex-col justify-between h-20"
              >
                <span className="text-[11px] text-slate-400 font-medium">{preset.name}</span>
                <span className="text-sm font-bold text-amber-400 tracking-tight">
                  {preset.previewText}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </BottomDrawer>
  );
};
