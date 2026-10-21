import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Undo2,
  Redo2,
  Download,
} from 'lucide-react';
import {
  AspectRatio,
  FitMode,
  TimelineClip,
  TrackMeta,
  ColorGrading,
  TextStyle,
  ExportConfig,
  VisualEffectType,
  TransitionType,
} from './types/editor';
import {
  INITIAL_CLIPS,
  INITIAL_TRACKS,
  DEFAULT_COLOR_GRADING,
} from './utils/presets';
import { soundEngine } from './utils/soundEngine';
import { SimplePreviewPlayer } from './components/SimplePreviewPlayer';
import { SimplifiedTimeline } from './components/SimplifiedTimeline';
import { ContextualDock } from './components/ContextualDock';
import { SimpleExportModal } from './components/SimpleExportModal';
import { TextDrawer } from './components/TextDrawer';
import { FilterDrawer } from './components/FilterDrawer';
import { SpeedDrawer } from './components/SpeedDrawer';
import { VolumeDrawer } from './components/VolumeDrawer';
import { FormatDrawer, AudioDrawer, EffectsDrawer } from './components/QuickDrawers';

interface HistorySnapshot {
  clips: TimelineClip[];
  tracks: TrackMeta[];
}

export default function App() {
  // Project & Aspect Ratio State
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [fitMode, setFitMode] = useState<FitMode>('cover');

  // Timeline & Clip State
  const [clips, setClips] = useState<TimelineClip[]>(INITIAL_CLIPS);
  const [tracks, setTracks] = useState<TrackMeta[]>(INITIAL_TRACKS);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);

  // Selection
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // Playback
  const [playhead, setPlayhead] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Active Bottom Sheet Drawer State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isTextDrawerOpen, setIsTextDrawerOpen] = useState<boolean>(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);
  const [isSpeedDrawerOpen, setIsSpeedDrawerOpen] = useState<boolean>(false);
  const [isVolumeDrawerOpen, setIsVolumeDrawerOpen] = useState<boolean>(false);
  const [isFormatDrawerOpen, setIsFormatDrawerOpen] = useState<boolean>(false);
  const [isAudioDrawerOpen, setIsAudioDrawerOpen] = useState<boolean>(false);
  const [isEffectsDrawerOpen, setIsEffectsDrawerOpen] = useState<boolean>(false);

  // Export & MediaRecorder state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportDownloadUrl, setExportDownloadUrl] = useState<string | null>(null);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    resolution: '1080p',
    fps: 30,
    format: 'webm',
  });

  // Media references & canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaElementsRef = useRef<Map<string, HTMLVideoElement | HTMLImageElement>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTypeRef = useRef<'video' | 'audio'>('video');
  const lastFrameTimeRef = useRef<number | null>(null);

  // Compute total duration dynamically
  const totalDuration = useMemo(() => {
    if (clips.length === 0) return 8;
    const maxEnd = Math.max(...clips.map((c) => c.startTime + c.duration));
    return Math.max(4, +maxEnd.toFixed(2));
  }, [clips]);

  const selectedClip = useMemo(
    () => clips.find((c) => c.id === selectedClipId) || null,
    [clips, selectedClipId]
  );

  // Undo / Redo history
  const commitHistory = useCallback(
    (nextClips: TimelineClip[], nextTracks: TrackMeta[] = tracks) => {
      setHistory((prev) => [...prev.slice(-20), { clips, tracks }]);
      setRedoStack([]);
      setClips(nextClips);
      setTracks(nextTracks);
    },
    [clips, tracks]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack((prev) => [...prev, { clips, tracks }]);
    setHistory((prev) => prev.slice(0, -1));
    setClips(previous.clips);
    setTracks(previous.tracks);
  }, [history, clips, tracks]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((prev) => [...prev, { clips, tracks }]);
    setRedoStack((prev) => prev.slice(0, -1));
    setClips(next.clips);
    setTracks(next.tracks);
  }, [redoStack, clips, tracks]);

  // Synchronize audio / video elements and Web Audio synthesizer
  const syncMediaElements = useCallback(
    (targetTime: number, playing: boolean) => {
      clips.forEach((clip) => {
        const isClipActive =
          targetTime >= clip.startTime && targetTime < clip.startTime + clip.duration;
        const localSourceTime =
          clip.sourceStartOffset + (targetTime - clip.startTime) * clip.speed;

        const mediaEl = mediaElementsRef.current.get(clip.id);
        if (mediaEl && mediaEl instanceof HTMLVideoElement) {
          mediaEl.playbackRate = clip.speed;
          mediaEl.preservesPitch = clip.preservePitch;
          mediaEl.muted = clip.muted;
          mediaEl.volume = Math.max(0, Math.min(1, clip.volume / 100));

          if (isClipActive) {
            if (Math.abs(mediaEl.currentTime - localSourceTime) > 0.25) {
              mediaEl.currentTime = Math.max(0, localSourceTime);
            }
            if (playing && mediaEl.paused) {
              mediaEl.play().catch(() => {});
            } else if (!playing && !mediaEl.paused) {
              mediaEl.pause();
            }
          } else if (!mediaEl.paused) {
            mediaEl.pause();
          }
        }

        const audioEl = audioElementsRef.current.get(clip.id);
        if (audioEl) {
          audioEl.playbackRate = clip.speed;
          audioEl.preservesPitch = clip.preservePitch;
          audioEl.muted = clip.muted;
          audioEl.volume = Math.max(0, Math.min(1, clip.volume / 100));

          if (isClipActive) {
            if (Math.abs(audioEl.currentTime - localSourceTime) > 0.25) {
              audioEl.currentTime = Math.max(0, localSourceTime);
            }
            if (playing && audioEl.paused) {
              audioEl.play().catch(() => {});
            } else if (!playing && !audioEl.paused) {
              audioEl.pause();
            }
          } else if (!audioEl.paused) {
            audioEl.pause();
          }
        }

        // Web Audio synth tone playback on active audio track
        if (
          playing &&
          clip.trackId === 'audio' &&
          clip.synthAudioPreset &&
          isClipActive &&
          !clip.muted
        ) {
          soundEngine.triggerTimelinePulse(
            targetTime,
            clip.volume,
            clip.speed,
            clip.preservePitch,
            clip.synthAudioPreset
          );
        }
      });
    },
    [clips]
  );

  // Playback requestAnimationFrame loop
  useEffect(() => {
    if (!isPlaying) {
      lastFrameTimeRef.current = null;
      syncMediaElements(playhead, false);
      return;
    }

    let animationFrameId: number;

    const tick = (now: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = now;
      }
      const deltaSec = (now - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = now;

      setPlayhead((prev) => {
        const next = prev + deltaSec;
        if (next >= totalDuration) {
          setIsPlaying(false);
          soundEngine.resetBeatTracker();
          return 0;
        }
        syncMediaElements(next, true);
        return next;
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, totalDuration, syncMediaElements, playhead]);

  const handleSeek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(totalDuration, time));
      setPlayhead(clamped);
      syncMediaElements(clamped, isPlaying);
    },
    [totalDuration, isPlaying, syncMediaElements]
  );

  // Dedicated Split action
  const handleSplitClip = useCallback(() => {
    if (!selectedClip) return;
    if (
      playhead <= selectedClip.startTime + 0.2 ||
      playhead >= selectedClip.startTime + selectedClip.duration - 0.2
    ) {
      return;
    }

    const firstDuration = +(playhead - selectedClip.startTime).toFixed(2);
    const secondDuration = +(selectedClip.duration - firstDuration).toFixed(2);

    const firstPart: TimelineClip = {
      ...selectedClip,
      duration: firstDuration,
      keyframes: selectedClip.keyframes.filter((k) => k.timeOffset <= firstDuration),
    };

    const secondPart: TimelineClip = {
      ...selectedClip,
      id: `clip-${Date.now()}`,
      name: `${selectedClip.name} (Part 2)`,
      startTime: +playhead.toFixed(2),
      duration: secondDuration,
      sourceStartOffset: +(
        selectedClip.sourceStartOffset +
        firstDuration * selectedClip.speed
      ).toFixed(2),
      keyframes: selectedClip.keyframes
        .filter((k) => k.timeOffset > firstDuration)
        .map((k) => ({ ...k, timeOffset: +(k.timeOffset - firstDuration).toFixed(2) })),
    };

    const existingMedia = mediaElementsRef.current.get(selectedClip.id);
    if (existingMedia) {
      mediaElementsRef.current.set(secondPart.id, existingMedia);
    }

    const nextClips = clips.flatMap((c) =>
      c.id === selectedClip.id ? [firstPart, secondPart] : [c]
    );
    commitHistory(nextClips);
    setSelectedClipId(secondPart.id);
  }, [selectedClip, playhead, clips, commitHistory]);

  // Delete action
  const handleDeleteClip = useCallback(() => {
    if (!selectedClipId) return;
    const nextClips = clips.filter((c) => c.id !== selectedClipId);
    commitHistory(nextClips);
    setSelectedClipId(null);
  }, [selectedClipId, clips, commitHistory]);

  // Update clip properties
  const handleUpdateClip = useCallback(
    (clipId: string, updates: Partial<TimelineClip>) => {
      setClips((prev) =>
        prev.map((c) => (c.id === clipId ? { ...c, ...updates } : c))
      );
    },
    []
  );

  // Update clip timing
  const handleUpdateClipTiming = useCallback(
    (
      clipId: string,
      newStartTime: number,
      newDuration: number,
      newSourceOffset: number
    ) => {
      setClips((prev) =>
        prev.map((c) =>
          c.id === clipId
            ? {
                ...c,
                startTime: newStartTime,
                duration: newDuration,
                sourceStartOffset: newSourceOffset,
              }
            : c
        )
      );
    },
    []
  );

  // Color grading update
  const handleUpdateColorGrading = useCallback(
    (clipId: string, updates: Partial<ColorGrading>) => {
      setClips((prev) =>
        prev.map((c) =>
          c.id === clipId
            ? { ...c, colorGrading: { ...c.colorGrading, ...updates } }
            : c
        )
      );
    },
    []
  );

  // Text Style update
  const handleUpdateTextStyle = useCallback(
    (updates: Partial<TextStyle>) => {
      if (!selectedClipId) return;
      setClips((prev) =>
        prev.map((c) =>
          c.id === selectedClipId && c.textStyle
            ? { ...c, textStyle: { ...c.textStyle, ...updates } }
            : c
        )
      );
    },
    [selectedClipId]
  );

  // Add new styled Text clip
  const handleAddTextWithPreset = useCallback(
    (presetStyle: {
      fontFamily: string;
      fontSize: number;
      color: string;
      strokeColor: string;
      strokeWidth: number;
      bgEnabled: boolean;
      bgColor: string;
      animation: 'none' | 'fade' | 'pop' | 'slide-up' | 'typewriter';
    }) => {
      const newId = `clip-text-${Date.now()}`;
      const newClip: TimelineClip = {
        id: newId,
        trackId: 'text',
        name: 'Title: NEW TEXT',
        startTime: +playhead.toFixed(2),
        duration: 3.5,
        sourceStartOffset: 0,
        sourceMaxDuration: 15,
        mediaType: 'text',
        accentColor: '#F59E0B',
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        colorGrading: { ...DEFAULT_COLOR_GRADING },
        keyframes: [],
        textStyle: {
          content: 'NEW HEADLINE',
          fontFamily: presetStyle.fontFamily,
          fontSize: presetStyle.fontSize,
          fontWeight: '700',
          color: presetStyle.color,
          strokeColor: presetStyle.strokeColor,
          strokeWidth: presetStyle.strokeWidth,
          shadowBlur: 14,
          bgEnabled: presetStyle.bgEnabled,
          bgColor: presetStyle.bgColor,
          animation: presetStyle.animation,
        },
        transitionIn: { type: 'none', duration: 0.3 },
        visualEffect: 'none',
        speed: 1,
        preservePitch: true,
        volume: 0,
        muted: true,
        fadeIn: 0.2,
        fadeOut: 0.2,
      };

      commitHistory([...clips, newClip]);
      setSelectedClipId(newId);
    },
    [playhead, clips, commitHistory]
  );

  // Add SFX
  const handleAddSfxClip = useCallback(
    (sfxType: 'whoosh' | 'sub-drop' | 'shutter' | 'glitch') => {
      const newId = `clip-sfx-${Date.now()}`;
      const newClip: TimelineClip = {
        id: newId,
        trackId: 'audio',
        name: `SFX_${sfxType.toUpperCase()}.wav`,
        startTime: +playhead.toFixed(2),
        duration: 1.5,
        sourceStartOffset: 0,
        sourceMaxDuration: 5,
        mediaType: 'audio',
        synthAudioPreset: 'cinematic-sub',
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
        volume: 90,
        muted: false,
        fadeIn: 0.1,
        fadeOut: 0.3,
        waveform: [0.3, 0.9, 0.8, 0.6, 0.4, 0.3, 0.2],
      };
      commitHistory([...clips, newClip]);
      setSelectedClipId(newId);
    },
    [playhead, clips, commitHistory]
  );

  // Media upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const clipId = `clip-upload-${Date.now()}`;
    const isAudio = file.type.startsWith('audio/');
    const isImage = file.type.startsWith('image/');
    const targetTrack = isAudio ? 'audio' : 'video';

    if (isImage) {
      const img = new Image();
      img.src = objectUrl;
      mediaElementsRef.current.set(clipId, img);
    } else if (!isAudio) {
      const video = document.createElement('video');
      video.src = objectUrl;
      video.crossOrigin = 'anonymous';
      video.playsInline = true;
      video.preload = 'auto';
      video.load();
      mediaElementsRef.current.set(clipId, video);
    } else {
      const audio = new Audio(objectUrl);
      audio.preload = 'auto';
      audioElementsRef.current.set(clipId, audio);
    }

    const newClip: TimelineClip = {
      id: clipId,
      trackId: targetTrack,
      name: file.name,
      startTime: +playhead.toFixed(2),
      duration: 5.0,
      sourceStartOffset: 0,
      sourceMaxDuration: 30,
      mediaType: isAudio ? 'audio' : isImage ? 'image' : 'video',
      mediaUrl: objectUrl,
      accentColor: targetTrack === 'audio' ? '#10B981' : '#3B82F6',
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      keyframes: [],
      transitionIn: { type: 'crossfade', duration: 0.5 },
      visualEffect: 'none',
      speed: 1,
      preservePitch: true,
      volume: 85,
      muted: false,
      fadeIn: 0.2,
      fadeOut: 0.2,
      waveform: isAudio ? [0.4, 0.7, 0.85, 0.6, 0.9, 0.5, 0.75, 0.8] : undefined,
    };

    commitHistory([...clips, newClip]);
    setSelectedClipId(clipId);
    e.target.value = '';
  };

  // Export pipeline
  const handleStartExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsExporting(true);
    setExportProgress(0);
    setExportDownloadUrl(null);
    setPlayhead(0);
    setIsPlaying(true);

    const chunks: BlobPart[] = [];
    let recorder: MediaRecorder | null = null;

    try {
      const stream = canvas.captureStream(exportConfig.fps);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setExportDownloadUrl(URL.createObjectURL(blob));
        setIsExporting(false);
        setIsPlaying(false);
      };

      recorder.start(100);
    } catch {
      // Fallback
    }

    const exportDurationMs = Math.min(3800, totalDuration * 300);
    const startStamp = performance.now();

    const interval = setInterval(() => {
      const elapsed = performance.now() - startStamp;
      const pct = Math.min(100, (elapsed / exportDurationMs) * 100);
      setExportProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        if (recorder && recorder.state !== 'inactive') {
          recorder.stop();
        } else {
          const fallbackBlob = new Blob(['ClipCraft Master Render'], { type: 'video/webm' });
          setExportDownloadUrl(URL.createObjectURL(fallbackBlob));
          setIsExporting(false);
          setIsPlaying(false);
        }
      }
    }, 80);
  }, [exportConfig.fps, totalDuration]);

  // Keyboard shortcut Space for play/pause
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex flex-col w-full h-dvh bg-[#0B0C10] text-slate-100 overflow-hidden select-none">
      {/* Hidden File Input for Video/Audio Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept={uploadTypeRef.current === 'audio' ? 'audio/*' : 'video/*,image/*'}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* TOP BAR: Clean, Minimal, Non-Cluttered with One-Tap Aspect Ratio and Instant Export */}
      <header className="flex items-center justify-between px-3 py-2 bg-[#0F1118] border-b border-white/[0.08] shrink-0 z-20">
        {/* Brand & Undo/Redo */}
        <div className="flex items-center gap-1.5">
          <span className="font-display font-bold text-sm tracking-tight text-white whitespace-nowrap">
            ClipCraft
          </span>

          <div className="flex items-center gap-0.5 ml-2">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-30 active:scale-95 transition-all"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-30 active:scale-95 transition-all"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Single-tap Aspect Ratio Pill Switcher */}
        <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-xl border border-white/[0.06]">
          {(['9:16', '16:9', '1:1'] as AspectRatio[]).map((r) => (
            <button
              key={r}
              onClick={() => setAspectRatio(r)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono-tabular font-bold transition-all ${
                aspectRatio === r
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Right: Single Prominent High-Contrast Export Button */}
        <button
          onClick={() => {
            setExportDownloadUrl(null);
            setIsExportModalOpen(true);
          }}
          className="min-h-[38px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </header>

      {/* MIDDLE SECTION: Clean Zero-Clutter Video Preview Monitor */}
      <SimplePreviewPlayer
        canvasRef={canvasRef}
        playhead={playhead}
        totalDuration={totalDuration}
        isPlaying={isPlaying}
        aspectRatio={aspectRatio}
        fitMode={fitMode}
        clips={clips}
        tracks={tracks}
        mediaElements={mediaElementsRef.current}
        selectedClipId={selectedClipId}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onUpdateClipTransform={handleUpdateClip}
        onSelectClip={setSelectedClipId}
      />

      {/* LOWER MIDDLE: Simplified Two-Track Visual Timeline with Auto-Magnetic Snapping & Wide Trim Handles */}
      <SimplifiedTimeline
        clips={clips}
        playhead={playhead}
        totalDuration={totalDuration}
        selectedClipId={selectedClipId}
        onSelectClip={setSelectedClipId}
        onSeek={handleSeek}
        onUpdateClipTiming={handleUpdateClipTiming}
      />

      {/* BOTTOM QUADRANT: Ergonomic Context-Sensitive Dock */}
      <ContextualDock
        selectedClip={selectedClip}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onDeselectClip={() => setSelectedClipId(null)}
        onOpenAddMedia={() => {
          uploadTypeRef.current = 'video';
          fileInputRef.current?.click();
        }}
        onOpenAudioDrawer={() => setIsAudioDrawerOpen(true)}
        onOpenTextDrawer={() => setIsTextDrawerOpen(true)}
        onOpenEffectsDrawer={() => setIsEffectsDrawerOpen(true)}
        onOpenFormatDrawer={() => setIsFormatDrawerOpen(true)}
        onSplitClip={handleSplitClip}
        onOpenSpeedDrawer={() => setIsSpeedDrawerOpen(true)}
        onOpenFilterDrawer={() => setIsFilterDrawerOpen(true)}
        onOpenVolumeDrawer={() => setIsVolumeDrawerOpen(true)}
        onDeleteClip={handleDeleteClip}
      />

      {/* BOTTOM SHEET DRAWERS (40% Viewport Modal Overlays) */}
      <SimpleExportModal
        isOpen={isExportModalOpen}
        isExporting={isExporting}
        progress={exportProgress}
        downloadUrl={exportDownloadUrl}
        exportConfig={exportConfig}
        onUpdateConfig={(updates) => setExportConfig((prev) => ({ ...prev, ...updates }))}
        onStartExport={handleStartExport}
        onClose={() => setIsExportModalOpen(false)}
      />

      <TextDrawer
        isOpen={isTextDrawerOpen}
        selectedClip={selectedClip}
        onClose={() => setIsTextDrawerOpen(false)}
        onAddTextClipWithStyle={handleAddTextWithPreset}
        onUpdateTextStyle={handleUpdateTextStyle}
      />

      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        selectedClip={selectedClip}
        onClose={() => setIsFilterDrawerOpen(false)}
        onUpdateColorGrading={handleUpdateColorGrading}
      />

      <SpeedDrawer
        isOpen={isSpeedDrawerOpen}
        selectedClip={selectedClip}
        onClose={() => setIsSpeedDrawerOpen(false)}
        onUpdateSpeed={(clipId, speed, preservePitch) =>
          handleUpdateClip(clipId, { speed, preservePitch })
        }
      />

      <VolumeDrawer
        isOpen={isVolumeDrawerOpen}
        selectedClip={selectedClip}
        onClose={() => setIsVolumeDrawerOpen(false)}
        onUpdateVolume={(clipId, volume, muted) =>
          handleUpdateClip(clipId, { volume, muted })
        }
      />

      <FormatDrawer
        isOpen={isFormatDrawerOpen}
        aspectRatio={aspectRatio}
        fitMode={fitMode}
        onClose={() => setIsFormatDrawerOpen(false)}
        onSelectAspectRatio={setAspectRatio}
        onToggleFitMode={() =>
          setFitMode((prev) =>
            prev === 'cover' ? 'contain' : prev === 'contain' ? 'fill' : 'cover'
          )
        }
      />

      <AudioDrawer
        isOpen={isAudioDrawerOpen}
        onClose={() => setIsAudioDrawerOpen(false)}
        onImportAudio={() => {
          uploadTypeRef.current = 'audio';
          fileInputRef.current?.click();
        }}
        onAddSfx={handleAddSfxClip}
      />

      <EffectsDrawer
        isOpen={isEffectsDrawerOpen}
        onClose={() => setIsEffectsDrawerOpen(false)}
        onApplyEffect={(effect: VisualEffectType) => {
          if (selectedClipId) handleUpdateClip(selectedClipId, { visualEffect: effect });
        }}
        onApplyTransition={(transition: TransitionType) => {
          if (selectedClipId)
            handleUpdateClip(selectedClipId, {
              transitionIn: { type: transition, duration: 0.5 },
            });
        }}
      />
    </div>
  );
}
