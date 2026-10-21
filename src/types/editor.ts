export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5';
export type FitMode = 'cover' | 'contain' | 'fill';
export type TrackType = 'video' | 'overlay' | 'text' | 'audio';
export type SyntheticSceneType =
  | 'neon-horizon'
  | 'golden-waves'
  | 'cyber-grid'
  | 'aurora-drift'
  | 'prism-bokeh'
  | 'kinetic-badge'
  | 'rec-frame'
  | 'vinyl-spin';

export type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface Keyframe {
  id: string;
  timeOffset: number; // Relative to clip start (0 to clip.duration)
  x: number;          // Normalized offset (-100 to 100%)
  y: number;          // Normalized offset (-100 to 100%)
  scale: number;      // 0.1 to 3.0
  rotation: number;   // -360 to 360 deg
  opacity: number;    // 0 to 1
  easing: EasingType;
}

export interface ColorGrading {
  brightness: number; // 0 to 200 (default 100)
  contrast: number;   // 0 to 200 (default 100)
  saturation: number; // 0 to 200 (default 100)
  exposure: number;   // -50 to 50 (default 0)
  warmth: number;     // -50 to 50 (default 0)
  vignette: number;   // 0 to 100 (default 0)
  blur: number;       // 0 to 20 (default 0)
  lutPreset: string;  // 'none' | 'teal-orange' | 'noir' | 'vintage-80s' | 'cyberpunk' | 'clean-warm' | 'kodak-gold'
}

export type TextAnimationType = 'none' | 'fade' | 'pop' | 'slide-up' | 'typewriter' | 'glitch';

export interface TextStyle {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: '400' | '600' | '700';
  color: string;
  strokeColor: string;
  strokeWidth: number;
  shadowBlur: number;
  bgEnabled: boolean;
  bgColor: string;
  animation: TextAnimationType;
}

export type TransitionType = 'none' | 'crossfade' | 'wipe-left' | 'zoom-in' | 'whip-pan';

export interface TransitionConfig {
  type: TransitionType;
  duration: number; // in seconds, e.g., 0.5s to 1.5s
}

export type VisualEffectType = 'none' | 'chromatic' | 'vhs' | 'film-grain' | 'halftone' | 'light-leak';

export interface TimelineClip {
  id: string;
  trackId: TrackType;
  name: string;
  startTime: number;      // Start position on timeline (seconds)
  duration: number;       // Visible duration on timeline (seconds)
  sourceStartOffset: number; // Trim in-point in media source (seconds)
  sourceMaxDuration: number; // Total available media duration
  mediaType: 'synthetic' | 'video' | 'image' | 'audio' | 'text';
  syntheticScene?: SyntheticSceneType;
  mediaUrl?: string;
  accentColor: string;

  // Transform properties (base values when no keyframes exist)
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;

  // Sub-systems
  colorGrading: ColorGrading;
  keyframes: Keyframe[];
  textStyle?: TextStyle;
  transitionIn: TransitionConfig;
  visualEffect: VisualEffectType;

  // Speed & Audio
  speed: number;          // 0.2 to 4.0
  preservePitch: boolean;
  volume: number;         // 0 to 100
  muted: boolean;
  fadeIn: number;         // seconds
  fadeOut: number;        // seconds
  waveform?: number[];    // normalized 0..1 bars
  beatMarkers?: number[]; // relative timestamps in seconds
  synthAudioPreset?: 'lofi-pulse' | 'cinematic-sub' | 'riser-hit' | 'ambient-pad';
}

export interface TrackMeta {
  id: TrackType;
  label: string;
  shortLabel: string;
  muted: boolean;
  locked: boolean;
  visible: boolean;
}

export type ActiveDockTab =
  | 'edit'
  | 'text'
  | 'audio'
  | 'color'
  | 'speed'
  | 'transitions'
  | 'keyframes'
  | 'effects';

export interface ExportConfig {
  resolution: '720p' | '1080p';
  fps: 30 | 60;
  format: 'webm' | 'mp4';
}
