import { TimelineClip, TrackMeta, ColorGrading, EasingType, Keyframe } from '../types/editor';

export const DEFAULT_COLOR_GRADING: ColorGrading = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  exposure: 0,
  warmth: 0,
  vignette: 0,
  blur: 0,
  lutPreset: 'none',
};

export const LUT_PRESETS: {
  id: string;
  name: string;
  subtitle: string;
  swatch: string;
  grading: Partial<ColorGrading>;
}[] = [
  {
    id: 'none',
    name: 'Neutral Rec.709',
    subtitle: 'Unmodified sensor profile',
    swatch: 'from-slate-600 to-slate-800',
    grading: { brightness: 100, contrast: 100, saturation: 100, exposure: 0, warmth: 0, vignette: 0 },
  },
  {
    id: 'teal-orange',
    name: 'Moody Teal & Orange',
    subtitle: 'Anamorphic blockbuster grade',
    swatch: 'from-teal-500 to-amber-500',
    grading: { brightness: 98, contrast: 124, saturation: 118, exposure: -4, warmth: -15, vignette: 35 },
  },
  {
    id: 'noir',
    name: 'Silver Halide B&W',
    subtitle: 'High-contrast monochrome grain',
    swatch: 'from-zinc-200 to-zinc-900',
    grading: { brightness: 104, contrast: 145, saturation: 0, exposure: -5, warmth: 0, vignette: 45 },
  },
  {
    id: 'vintage-80s',
    name: 'VHS 1984 Halation',
    subtitle: 'Faded blacks & warm amber highlights',
    swatch: 'from-amber-400 to-rose-700',
    grading: { brightness: 108, contrast: 88, saturation: 82, exposure: 8, warmth: 28, vignette: 25 },
  },
  {
    id: 'cyberpunk',
    name: 'Night City Neon',
    subtitle: 'Hyper-saturated cyan & magenta push',
    swatch: 'from-fuchsia-500 to-cyan-400',
    grading: { brightness: 96, contrast: 132, saturation: 155, exposure: -2, warmth: -25, vignette: 40 },
  },
  {
    id: 'clean-warm',
    name: 'Golden Hour Film',
    subtitle: 'Luminous skin tones & soft roll-off',
    swatch: 'from-orange-300 to-amber-600',
    grading: { brightness: 106, contrast: 108, saturation: 112, exposure: 6, warmth: 22, vignette: 12 },
  },
];

export const INITIAL_TRACKS: TrackMeta[] = [
  { id: 'text', label: 'Text & Kinetic Titles', shortLabel: 'TEXT', muted: false, locked: false, visible: true },
  { id: 'overlay', label: 'PIP & B-Roll Overlay', shortLabel: 'PIP', muted: false, locked: false, visible: true },
  { id: 'video', label: 'Main Video Track', shortLabel: 'MAIN', muted: false, locked: false, visible: true },
  { id: 'audio', label: 'Audio & BGM Score', shortLabel: 'AUDIO', muted: false, locked: false, visible: true },
];

export const INITIAL_CLIPS: TimelineClip[] = [
  // Main Video Track Clips
  {
    id: 'clip-video-1',
    trackId: 'video',
    name: '01_Synthwave_Horizon.mp4',
    startTime: 0,
    duration: 4.5,
    sourceStartOffset: 0,
    sourceMaxDuration: 15,
    mediaType: 'synthetic',
    syntheticScene: 'neon-horizon',
    accentColor: '#3B82F6',
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    colorGrading: { ...DEFAULT_COLOR_GRADING, lutPreset: 'teal-orange', contrast: 115, vignette: 20 },
    keyframes: [
      { id: 'kf-v1-1', timeOffset: 0, x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1, easing: 'ease-out' },
      { id: 'kf-v1-2', timeOffset: 4.2, x: 0, y: -4, scale: 1.12, rotation: 0, opacity: 1, easing: 'ease-in-out' },
    ],
    transitionIn: { type: 'none', duration: 0.5 },
    visualEffect: 'none',
    speed: 1,
    preservePitch: true,
    volume: 85,
    muted: false,
    fadeIn: 0.3,
    fadeOut: 0,
  },
  {
    id: 'clip-video-2',
    trackId: 'video',
    name: '02_Solar_Ocean_Aerial.mp4',
    startTime: 4.5,
    duration: 4.5,
    sourceStartOffset: 1.0,
    sourceMaxDuration: 15,
    mediaType: 'synthetic',
    syntheticScene: 'golden-waves',
    accentColor: '#2563EB',
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    colorGrading: { ...DEFAULT_COLOR_GRADING, lutPreset: 'clean-warm', warmth: 18, saturation: 115 },
    keyframes: [],
    transitionIn: { type: 'crossfade', duration: 0.8 },
    visualEffect: 'film-grain',
    speed: 1,
    preservePitch: true,
    volume: 80,
    muted: false,
    fadeIn: 0,
    fadeOut: 0,
  },
  {
    id: 'clip-video-3',
    trackId: 'video',
    name: '03_Aurora_Prism_Sequence.mp4',
    startTime: 9.0,
    duration: 4.0,
    sourceStartOffset: 0,
    sourceMaxDuration: 15,
    mediaType: 'synthetic',
    syntheticScene: 'aurora-drift',
    accentColor: '#1D4ED8',
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    colorGrading: { ...DEFAULT_COLOR_GRADING, contrast: 118, saturation: 125, vignette: 30 },
    keyframes: [
      { id: 'kf-v3-1', timeOffset: 0.2, x: 0, y: 0, scale: 1.15, rotation: -2, opacity: 1, easing: 'ease-out' },
      { id: 'kf-v3-2', timeOffset: 3.8, x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1, easing: 'ease-in-out' },
    ],
    transitionIn: { type: 'zoom-in', duration: 0.7 },
    visualEffect: 'chromatic',
    speed: 1,
    preservePitch: true,
    volume: 85,
    muted: false,
    fadeIn: 0,
    fadeOut: 0.8,
  },

  // Overlay / PIP Track Clips
  {
    id: 'clip-pip-1',
    trackId: 'overlay',
    name: 'Viewfinder_HUD_Frame.mov',
    startTime: 0.4,
    duration: 5.2,
    sourceStartOffset: 0,
    sourceMaxDuration: 15,
    mediaType: 'synthetic',
    syntheticScene: 'rec-frame',
    accentColor: '#8B5CF6',
    x: 0,
    y: 0,
    scale: 0.94,
    rotation: 0,
    opacity: 0.85,
    colorGrading: { ...DEFAULT_COLOR_GRADING },
    keyframes: [],
    transitionIn: { type: 'crossfade', duration: 0.4 },
    visualEffect: 'none',
    speed: 1,
    preservePitch: true,
    volume: 0,
    muted: true,
    fadeIn: 0.2,
    fadeOut: 0.3,
  },
  {
    id: 'clip-pip-2',
    trackId: 'overlay',
    name: 'PIP_Bokeh_Light_Leak.mov',
    startTime: 6.2,
    duration: 5.5,
    sourceStartOffset: 0,
    sourceMaxDuration: 15,
    mediaType: 'synthetic',
    syntheticScene: 'prism-bokeh',
    accentColor: '#7C3AED',
    x: 24,
    y: -26,
    scale: 0.38,
    rotation: -4,
    opacity: 0.92,
    colorGrading: { ...DEFAULT_COLOR_GRADING },
    keyframes: [
      { id: 'kf-pip-1', timeOffset: 0, x: 24, y: -26, scale: 0.36, rotation: -4, opacity: 0.9, easing: 'ease-in-out' },
      { id: 'kf-pip-2', timeOffset: 5.0, x: 20, y: -22, scale: 0.42, rotation: 3, opacity: 0.95, easing: 'ease-in-out' },
    ],
    transitionIn: { type: 'zoom-in', duration: 0.5 },
    visualEffect: 'none',
    speed: 1,
    preservePitch: true,
    volume: 0,
    muted: true,
    fadeIn: 0.3,
    fadeOut: 0.3,
  },

  // Kinetic Typography Track Clips
  {
    id: 'clip-text-1',
    trackId: 'text',
    name: 'Title: BEYOND HORIZON',
    startTime: 0.5,
    duration: 3.6,
    sourceStartOffset: 0,
    sourceMaxDuration: 15,
    mediaType: 'text',
    accentColor: '#F59E0B',
    x: 0,
    y: -12,
    scale: 1,
    rotation: 0,
    opacity: 1,
    colorGrading: { ...DEFAULT_COLOR_GRADING },
    keyframes: [],
    textStyle: {
      content: 'BEYOND THE HORIZON',
      fontFamily: 'Bricolage Grotesque',
      fontSize: 44,
      fontWeight: '700',
      color: '#FFFFFF',
      strokeColor: '#0B0C10',
      strokeWidth: 3,
      shadowBlur: 18,
      bgEnabled: false,
      bgColor: '#F59E0B',
      animation: 'pop',
    },
    transitionIn: { type: 'none', duration: 0.3 },
    visualEffect: 'none',
    speed: 1,
    preservePitch: true,
    volume: 0,
    muted: true,
    fadeIn: 0.2,
    fadeOut: 0.3,
  },
  {
    id: 'clip-text-2',
    trackId: 'text',
    name: 'Subtitle: GOLDEN HOUR CUT',
    startTime: 4.8,
    duration: 3.8,
    sourceStartOffset: 0,
    sourceMaxDuration: 15,
    mediaType: 'text',
    accentColor: '#D97706',
    x: 0,
    y: 26,
    scale: 1,
    rotation: 0,
    opacity: 1,
    colorGrading: { ...DEFAULT_COLOR_GRADING },
    keyframes: [],
    textStyle: {
      content: 'SHOT IN 4K ANAMORPHIC',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 28,
      fontWeight: '700',
      color: '#0B0C10',
      strokeColor: '#000000',
      strokeWidth: 0,
      shadowBlur: 10,
      bgEnabled: true,
      bgColor: '#F59E0B',
      animation: 'slide-up',
    },
    transitionIn: { type: 'none', duration: 0.3 },
    visualEffect: 'none',
    speed: 1,
    preservePitch: true,
    volume: 0,
    muted: true,
    fadeIn: 0.2,
    fadeOut: 0.3,
  },
  {
    id: 'clip-text-3',
    trackId: 'text',
    name: 'Title: CLIPCRAFT STUDIO',
    startTime: 9.2,
    duration: 3.5,
    sourceStartOffset: 0,
    sourceMaxDuration: 15,
    mediaType: 'text',
    accentColor: '#F59E0B',
    x: 0,
    y: 0,
    scale: 1.05,
    rotation: 0,
    opacity: 1,
    colorGrading: { ...DEFAULT_COLOR_GRADING },
    keyframes: [],
    textStyle: {
      content: 'CLIPCRAFT STUDIO',
      fontFamily: 'Bricolage Grotesque',
      fontSize: 48,
      fontWeight: '700',
      color: '#38BDF8',
      strokeColor: '#0F172A',
      strokeWidth: 4,
      shadowBlur: 24,
      bgEnabled: false,
      bgColor: '#0F172A',
      animation: 'typewriter',
    },
    transitionIn: { type: 'none', duration: 0.3 },
    visualEffect: 'none',
    speed: 1,
    preservePitch: true,
    volume: 0,
    muted: true,
    fadeIn: 0.2,
    fadeOut: 0.4,
  },

  // Audio / BGM Track
  {
    id: 'clip-audio-1',
    trackId: 'audio',
    name: 'Midnight_Analog_Pulse_120BPM.wav',
    startTime: 0,
    duration: 13.0,
    sourceStartOffset: 0,
    sourceMaxDuration: 30,
    mediaType: 'audio',
    synthAudioPreset: 'lofi-pulse',
    accentColor: '#10B981',
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    colorGrading: { ...DEFAULT_COLOR_GRADING },
    keyframes: [],
    transitionIn: { type: 'none', duration: 0 },
    visualEffect: 'none',
    speed: 1,
    preservePitch: true,
    volume: 78,
    muted: false,
    fadeIn: 0.8,
    fadeOut: 1.4,
    waveform: [
      0.25, 0.45, 0.72, 0.9, 0.52, 0.38, 0.84, 0.95, 0.61, 0.42, 0.78, 0.88,
      0.34, 0.67, 0.92, 0.76, 0.49, 0.81, 0.98, 0.64, 0.44, 0.73, 0.89, 0.55,
      0.39, 0.77, 0.93, 0.68, 0.51, 0.85, 0.94, 0.59, 0.41, 0.79, 0.87, 0.48,
      0.62, 0.91, 0.74, 0.46, 0.83, 0.96, 0.58, 0.37, 0.69, 0.82, 0.45, 0.28,
    ],
    beatMarkers: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5],
  },
];

// Easing interpolation helper
export function applyEasing(t: number, easing: EasingType): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (easing) {
    case 'ease-in':
      return clamped * clamped;
    case 'ease-out':
      return clamped * (2 - clamped);
    case 'ease-in-out':
      return clamped < 0.5 ? 2 * clamped * clamped : -1 + (4 - 2 * clamped) * clamped;
    case 'linear':
    default:
      return clamped;
  }
}

// Compute interpolated transform for a clip at a given timeline playhead timestamp
export function getInterpolatedTransform(
  clip: TimelineClip,
  playheadTime: number
): { x: number; y: number; scale: number; rotation: number; opacity: number } {
  const localTime = Math.max(0, Math.min(clip.duration, playheadTime - clip.startTime));

  if (!clip.keyframes || clip.keyframes.length === 0) {
    return {
      x: clip.x,
      y: clip.y,
      scale: clip.scale,
      rotation: clip.rotation,
      opacity: clip.opacity,
    };
  }

  const sorted: Keyframe[] = [...clip.keyframes].sort((a, b) => a.timeOffset - b.timeOffset);

  if (localTime <= sorted[0].timeOffset) {
    const first = sorted[0];
    return {
      x: first.x,
      y: first.y,
      scale: first.scale,
      rotation: first.rotation,
      opacity: first.opacity,
    };
  }

  const last = sorted[sorted.length - 1];
  if (localTime >= last.timeOffset) {
    return {
      x: last.x,
      y: last.y,
      scale: last.scale,
      rotation: last.rotation,
      opacity: last.opacity,
    };
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const k1 = sorted[i];
    const k2 = sorted[i + 1];
    if (localTime >= k1.timeOffset && localTime <= k2.timeOffset) {
      const span = Math.max(0.0001, k2.timeOffset - k1.timeOffset);
      const rawProgress = (localTime - k1.timeOffset) / span;
      const p = applyEasing(rawProgress, k2.easing);
      return {
        x: k1.x + (k2.x - k1.x) * p,
        y: k1.y + (k2.y - k1.y) * p,
        scale: k1.scale + (k2.scale - k1.scale) * p,
        rotation: k1.rotation + (k2.rotation - k1.rotation) * p,
        opacity: k1.opacity + (k2.opacity - k1.opacity) * p,
      };
    }
  }

  return {
    x: clip.x,
    y: clip.y,
    scale: clip.scale,
    rotation: clip.rotation,
    opacity: clip.opacity,
  };
}

// Format seconds to SMPTE / millisecond format MM:SS.ms
export function formatTimestamp(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.floor((safe % 1) * 100);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}
