export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5' | '21:9' | '4:3' | 'custom';
export type ResolutionTier = '720p' | '1080p' | '1440p' | '4k';
export type ProjectFrameRate = 24 | 25 | 30 | 50 | 60;
export type ProjectSampleRate = 44100 | 48000;
export type TimecodeDisplayMode = 'frames' | 'hmsf' | 'compact';

export interface ProjectSettings {
  id: string;
  name: string;
  createdAt: number;
  lastModified: number;
  // Spatial Dimensions
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:5' | '21:9' | '4:3' | 'custom';
  customDimensions?: { width: number; height: number };
  resolutionTier: '720p' | '1080p' | '1440p' | '4k';
  // Temporal & Audio Settings
  frameRate: 24 | 25 | 30 | 50 | 60;
  sampleRate: 44100 | 48000;
  // Background & Compositing
  backgroundColor: string; // Hex color for canvas letterboxing
  backgroundBlurFallback: boolean; // Auto-blur duplicate background for mismatched aspect ratios
  timecodeDisplay: 'frames' | 'hmsf' | 'compact';
}

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
  z?: number;         // 3D Z offset
  scale: number;      // 0.1 to 3.0
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  rotation: number;   // -360 to 360 deg
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  opacity: number;    // 0 to 1
  easing: EasingType;
  fov?: number;       // Camera FOV
  startTrim?: number; // Vector drawing trim
  endTrim?: number;
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

// Custom FX Lab Types
export type CustomFxNodeType =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue'
  | 'invert'
  | 'sepia'
  | 'camera-shake'
  | 'rgb-split'
  | 'lens-distortion'
  | 'film-grain'
  | 'white-strobe'
  | 'edge-glow'
  | 'vignette';

export interface CustomFxNode {
  id: string;
  type: CustomFxNodeType;
  enabled: boolean;
  params: Record<string, number>;
}

export interface CustomFxPreset {
  id: string;
  name: string;
  masterIntensity: number; // 0 to 100
  thumbnail?: string;
  nodes: CustomFxNode[];
  createdAt: number;
}

// Video Effects
export type VideoEffectType =
  | 'none'
  | 'camera-shake'
  | 'slow-zoom'
  | 'edge-glow'
  | 'rgb-split'
  | 'chromatic'
  | 'vhs'
  | 'light-leak'
  | 'white-strobe'
  | 'film-grain'
  | 'lens-blur'
  | 'bw-pop'
  | 'custom-compound';

export type VisualEffectType = VideoEffectType;

export type ActiveDockTab =
  | 'split'
  | 'color'
  | 'text'
  | 'keyframes'
  | 'speed'
  | 'audio'
  | 'transitions'
  | 'effects'
  | 'edit';

export interface VideoEffectConfig {
  id: string;
  type: VideoEffectType;
  intensity: number; // 0 to 100 (default 50)
  speed: number;     // 0.5 to 3.0 (default 1.0)
  glow: number;      // 0 to 100 (default 50)
  blur: number;      // 0 to 30 (default 10)
  customPreset?: CustomFxPreset;
}

// Pro Typography Suite: Animations, Backgrounds, Metrics & Fonts
export type TextBackgroundShape = 'none' | 'rounded-pill' | 'sharp-box' | 'underline-highlight';
export type TextGradientDirection = '90deg' | '180deg' | '45deg';
export type TextInAnimation = 'none' | 'typewriter' | 'pop-bounce' | 'spring-pop' | 'slide-up' | 'slide-blur' | 'fade';
export type TextOutAnimation = 'none' | 'slide-down' | 'zoom-out' | 'glitch-dissolve' | 'glitch-wipe' | 'shrink-drop';
export type TextLoopAnimation = 'none' | 'heartbeat' | 'pulse' | 'float' | 'neon-flicker' | 'breathing' | 'karaoke-wave';
export type TextPresetStyle = 'none' | 'karaoke-active' | 'bouncy-modern' | 'minimal' | 'bold-stroke';

export interface TextStyle {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: '400' | '600' | '700' | '800';
  color: string;
  opacity?: number; // 0 to 1

  // Gradient Fill
  gradientEnabled?: boolean;
  gradientStart?: string;
  gradientEnd?: string;
  gradientDirection?: TextGradientDirection;

  // Background / Pill Box
  bgEnabled: boolean;
  bgShape?: TextBackgroundShape;
  bgColor: string;
  bgOpacity?: number; // 0 to 1
  bgRadius: number; // corner radius in px
  bgPaddingX?: number; // horizontal padding in px
  bgPaddingY?: number; // vertical padding in px
  bgPadding: number; // legacy fallback

  // Spacing & Metrics
  letterSpacing?: number; // -5 to +20 px
  lineHeight?: number;    // 0.8 to 2.5 multiplier
  textAlign?: 'left' | 'center' | 'right' | 'justify';

  // Stroke & Outline
  strokeColor: string;
  strokeWidth: number; // 0 to 15px

  // Shadow & Glow
  shadowBlur: number;
  shadowDistance: number;
  shadowOffsetX?: number; // -20 to +20px
  shadowOffsetY?: number; // -20 to +20px
  shadowColor: string;
  shadowOpacity?: number; // 0 to 1
  glowMode?: boolean;     // high blur radius, screen blend mode

  // Animations
  inAnimation: TextInAnimation;
  inDuration?: number;   // 0.1s to 2.0s
  outAnimation: TextOutAnimation;
  outDuration?: number;  // 0.1s to 2.0s
  loopAnimation: TextLoopAnimation;
  presetStyle: TextPresetStyle;
  animation?: string;
}

export interface CustomFontItem {
  id: string;
  name: string;
  fileName: string;
  format: string;
  uploadedAt: number;
}

export type TransitionType = 'none' | 'crossfade' | 'wipe-left' | 'zoom-in' | 'whip-pan';

export interface TransitionConfig {
  type: TransitionType;
  duration: number; // in seconds, e.g., 0.5s to 1.5s
}

// 4K Smart Proxy & Raw Master Media Record
export interface MediaProxyRecord {
  clipId: string;
  is4K: boolean;
  originalWidth: number;
  originalHeight: number;
  originalFile?: File;
  originalUrl: string; // Master Full-Res 4K source (for offline rendering)
  proxyUrl: string;    // 720p/1080p proxy preview source (for smooth canvas timeline)
}

// Vector Drawing & Brush Data
export interface DrawingPoint {
  x: number;
  y: number;
  pressure?: number;
}

export type BrushType = 'pen' | 'marker' | 'neon' | 'eraser';

export interface DrawingStroke {
  id: string;
  points: DrawingPoint[];
  color: string;
  width: number;
  opacity: number;
  brushType: BrushType;
  cap: 'round' | 'square';
}

export interface DrawingData {
  strokes: DrawingStroke[];
  startTrim: number; // 0 to 100%
  endTrim: number;   // 0 to 100%
}

export type GizmoMode = 'translate' | 'rotate' | 'scale' | null;

export interface TimelineClip {
  id: string;
  trackId: TrackType;
  name: string;
  startTime: number;      // Start position on timeline (seconds)
  duration: number;       // Visible duration on timeline (seconds)
  sourceId?: string;       // Master long file source reference for virtual sub-clipping
  isLongDuration?: boolean; // Flagged if file duration > 300s
  sourceStartOffset: number; // Trim in-point in media source (seconds)
  sourceMaxDuration: number; // Total available media duration
  mediaType: 'synthetic' | 'video' | 'image' | 'audio' | 'text' | 'null' | 'camera' | 'drawing';
  syntheticScene?: SyntheticSceneType;
  mediaUrl?: string;      // Current active preview url
  originalMediaUrl?: string; // High-Res 4K Master URL
  is4KSource?: boolean;
  accentColor: string;

  // 2D & 3D Transform properties
  x: number;
  y: number;
  z?: number;             // 3D Depth (-1000 to 1000)
  scale: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  rotation: number;       // 2D rotation & 3D rotateZ (deg)
  rotateX?: number;       // 3D X-tilt (deg)
  rotateY?: number;       // 3D Y-pan (deg)
  rotateZ?: number;       // 3D Z-roll (deg)
  anchorX?: number;       // 3D Pivot coordinate (-100 to 100%)
  anchorY?: number;
  anchorZ?: number;
  opacity: number;

  // 3D Mode & Parenting
  is3D?: boolean;
  parentId?: string | null;

  // Camera 3D controls (When mediaType === 'camera')
  cameraFov?: number;
  cameraTarget?: [number, number, number];
  cameraRoll?: number;
  cameraPreset?: 'front' | 'top' | 'isometric' | 'orbit' | 'custom';
  cameraDofEnabled?: boolean;
  cameraAperture?: number;
  cameraFocusDistance?: number;
  cameraBokehRadius?: number;

  // Vector Drawing Data (When mediaType === 'drawing')
  drawingData?: DrawingData;

  // Sub-systems
  colorGrading: ColorGrading;
  keyframes: Keyframe[];
  textStyle?: TextStyle;
  transitionIn: TransitionConfig;

  // Stacked video effects (up to 2 simultaneous effects)
  activeEffects: VideoEffectConfig[];
  visualEffect?: VideoEffectType;

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

// Pro-Grade Export Suite Configuration
export type ExportResolution = '4K' | '2K' | '1080p' | '720p';
export type ExportFps = 24 | 30 | 60;
export type ExportQualityPreset = 'low' | 'standard' | 'high';
export type ExportContainerFormat = 'mp4' | 'webm';

export interface ProExportConfig {
  resolution: ExportResolution;
  fps: ExportFps;
  qualityPreset: ExportQualityPreset;
  bitrateMbps: number; // dynamic slider: 8-80 Mbps
  format: ExportContainerFormat;
  codec: string;
}

export type ExportConfig = ProExportConfig;

export interface ExportProgressState {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  statusText: string;
  estimatedSecondsRemaining: number;
}

// Screen Architecture
export type AppScreen =
  | 'DASHBOARD_SCREEN'
  | 'MEDIA_PICKER_MODAL'
  | 'EDITOR_SCREEN'
  | 'EXPORT_SCREEN';

// Project metadata and state persistence
export interface ProjectData {
  id: string;
  title: string;
  createdAt: number;
  modifiedAt: number;
  aspectRatio: AspectRatio;
  fitMode: FitMode;
  thumbnailGradient?: string;
  thumbnailUrl?: string;
  duration: number;
  clips: TimelineClip[];
  tracks: TrackMeta[];
  settings: ProjectSettings;
}
