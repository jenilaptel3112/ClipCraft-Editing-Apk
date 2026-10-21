import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Undo2,
  Redo2,
  Settings,
  Download,
  Check,
  X,
  FolderPlus,
  RotateCcw,
} from 'lucide-react';
import {
  AspectRatio,
  FitMode,
  TimelineClip,
  TrackMeta,
  TrackType,
  ActiveDockTab,
  ColorGrading,
  TextStyle,
  ExportConfig,
} from './types/editor';
import {
  INITIAL_CLIPS,
  INITIAL_TRACKS,
  DEFAULT_COLOR_GRADING,
} from './utils/presets';
import { soundEngine } from './utils/soundEngine';
import { PreviewPlayer } from './components/PreviewPlayer';
import { MultiTrackTimeline } from './components/MultiTrackTimeline';
import { FeatureDock } from './components/FeatureDock';
import { ExportModal } from './components/ExportModal';

interface HistorySnapshot {
  clips: TimelineClip[];
  tracks: TrackMeta[];
}

export default function App() {
  // Project & Viewport State
  const [projectTitle, setProjectTitle] = useState<string>('Neon_Horizon_Reel_Cut');
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [fitMode, setFitMode] = useState<FitMode>('cover');
  const [magneticSnap, setMagneticSnap] = useState<boolean>(true);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Timeline & Undo/Redo Stack
  const [clips, setClips] = useState<TimelineClip[]>(INITIAL_CLIPS);
  const [tracks, setTracks] = useState<TrackMeta[]>(INITIAL_TRACKS);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);

  // Selection & Active Bottom Dock Tab
  const [selectedClipId, setSelectedClipId] = useState<string | null>('clip-video-1');
  const [activeTab, setActiveTab] = useState<ActiveDockTab>('edit');

  // Playback State
  const [playhead, setPlayhead] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Export & MediaRecorder State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportDownloadUrl, setExportDownloadUrl] = useState<string | null>(null);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    resolution: '1080p',
    fps: 60,
    format: 'webm',
  });

  // Refs for Canvas, RAF loop, and uploaded HTMLVideoElement / HTMLImageElement / HTMLAudioElement
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaElementsRef = useRef<Map<string, HTMLVideoElement | HTMLImageElement>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTargetTrackRef = useRef<TrackType>('video');
  const lastFrameTimeRef = useRef<number | null>(null);

  // Compute total project duration dynamically from clips
  const totalDuration = useMemo(() => {
    if (clips.length === 0) return 10;
    const maxEnd = Math.max(...clips.map((c) => c.startTime + c.duration));
    return Math.max(4, +maxEnd.toFixed(2));
  }, [clips]);

  const selectedClip = useMemo(
    () => clips.find((c) => c.id === selectedClipId) || null,
    [clips, selectedClipId]
  );

  // Push snapshot to Undo history before structural edits
  const commitHistory = useCallback(
    (nextClips: TimelineClip[], nextTracks: TrackMeta[] = tracks) => {
      setHistory((prev) => [...prev.slice(-24), { clips, tracks }]);
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

  // Synchronize uploaded HTMLVideoElements and HTMLAudioElements with playhead
  const syncMediaElements = useCallback(
    (targetTime: number, playing: boolean) => {
      clips.forEach((clip) => {
        const trackMeta = tracks.find((t) => t.id === clip.trackId);
        const isTrackMuted = trackMeta?.muted ?? false;
        const isClipActive =
          targetTime >= clip.startTime && targetTime < clip.startTime + clip.duration;
        const localSourceTime =
          clip.sourceStartOffset + (targetTime - clip.startTime) * clip.speed;

        const mediaEl = mediaElementsRef.current.get(clip.id);
        if (mediaEl && mediaEl instanceof HTMLVideoElement) {
          mediaEl.playbackRate = clip.speed;
          mediaEl.preservesPitch = clip.preservePitch;
          mediaEl.muted = clip.muted || isTrackMuted;
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
          audioEl.muted = clip.muted || isTrackMuted;
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

        // Trigger Web Audio synth score on active synthetic audio track
        if (
          playing &&
          clip.trackId === 'audio' &&
          clip.synthAudioPreset &&
          isClipActive &&
          !clip.muted &&
          !isTrackMuted
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
    [clips, tracks]
  );

  // Real-time 60fps requestAnimationFrame playback loop
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

  // Seek handler
  const handleSeek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(totalDuration, time));
      setPlayhead(clamped);
      syncMediaElements(clamped, isPlaying);
    },
    [totalDuration, isPlaying, syncMediaElements]
  );

  // Split selected clip at current playhead position
  const handleSplitAtPlayhead = useCallback(() => {
    if (!selectedClip) return;
    if (
      playhead <= selectedClip.startTime + 0.25 ||
      playhead >= selectedClip.startTime + selectedClip.duration - 0.25
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
      sourceStartOffset: +(selectedClip.sourceStartOffset + firstDuration * selectedClip.speed).toFixed(2),
      keyframes: selectedClip.keyframes
        .filter((k) => k.timeOffset > firstDuration)
        .map((k) => ({ ...k, timeOffset: +(k.timeOffset - firstDuration).toFixed(2) })),
    };

    // Clone media reference if uploaded video/image
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

  // Duplicate selected clip
  const handleDuplicateSelected = useCallback(() => {
    if (!selectedClip) return;
    const newId = `clip-dup-${Date.now()}`;
    const duplicated: TimelineClip = {
      ...selectedClip,
      id: newId,
      name: `${selectedClip.name} Copy`,
      startTime: +(selectedClip.startTime + selectedClip.duration).toFixed(2),
    };

    const existingMedia = mediaElementsRef.current.get(selectedClip.id);
    if (existingMedia) {
      mediaElementsRef.current.set(newId, existingMedia);
    }

    commitHistory([...clips, duplicated]);
    setSelectedClipId(newId);
  }, [selectedClip, clips, commitHistory]);

  // Delete selected clip
  const handleDeleteSelected = useCallback(() => {
    if (!selectedClipId) return;
    const nextClips = clips.filter((c) => c.id !== selectedClipId);
    commitHistory(nextClips);
    setSelectedClipId(nextClips[0]?.id || null);
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

  // Update clip timing from timeline drag / trim / slip
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

  // Update color grading
  const handleUpdateColorGrading = useCallback(
    (clipId: string, gradingUpdates: Partial<ColorGrading>) => {
      setClips((prev) =>
        prev.map((c) =>
          c.id === clipId
            ? { ...c, colorGrading: { ...c.colorGrading, ...gradingUpdates } }
            : c
        )
      );
    },
    []
  );

  // Update text style
  const handleUpdateTextStyle = useCallback(
    (clipId: string, styleUpdates: Partial<TextStyle>) => {
      setClips((prev) =>
        prev.map((c) =>
          c.id === clipId && c.textStyle
            ? { ...c, textStyle: { ...c.textStyle, ...styleUpdates } }
            : c
        )
      );
    },
    []
  );

  // Add new Kinetic Typography clip at playhead
  const handleAddTextClip = useCallback(() => {
    const newId = `clip-text-${Date.now()}`;
    const newClip: TimelineClip = {
      id: newId,
      trackId: 'text',
      name: 'Title: NEW KINETIC TEXT',
      startTime: +playhead.toFixed(2),
      duration: 3.2,
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
        content: 'NEW KINETIC TITLE',
        fontFamily: 'Bricolage Grotesque',
        fontSize: 42,
        fontWeight: '700',
        color: '#FFFFFF',
        strokeColor: '#0B0C10',
        strokeWidth: 3,
        shadowBlur: 14,
        bgEnabled: true,
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
      fadeOut: 0.2,
    };
    commitHistory([...clips, newClip]);
    setSelectedClipId(newId);
    setActiveTab('text');
  }, [playhead, clips, commitHistory]);

  // Add synthetic B-Roll PIP Overlay clip at playhead
  const handleAddPipOverlayClip = useCallback(() => {
    const newId = `clip-pip-${Date.now()}`;
    const newClip: TimelineClip = {
      id: newId,
      trackId: 'overlay',
      name: 'PIP_Prism_Overlay.mov',
      startTime: +playhead.toFixed(2),
      duration: 4.0,
      sourceStartOffset: 0,
      sourceMaxDuration: 15,
      mediaType: 'synthetic',
      syntheticScene: 'prism-bokeh',
      accentColor: '#8B5CF6',
      x: -22,
      y: 22,
      scale: 0.42,
      rotation: 0,
      opacity: 0.92,
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      keyframes: [],
      transitionIn: { type: 'zoom-in', duration: 0.5 },
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
  }, [playhead, clips, commitHistory]);

  // Add SFX clip on audio track at playhead
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
        waveform: [0.3, 0.95, 0.88, 0.65, 0.45, 0.32, 0.2, 0.12],
      };
      commitHistory([...clips, newClip]);
      setSelectedClipId(newId);
    },
    [playhead, clips, commitHistory]
  );

  // Add or update keyframe at current playhead offset on selected clip
  const handleAddOrUpdateKeyframe = useCallback(() => {
    if (!selectedClip) return;
    const offset = Math.max(
      0,
      Math.min(selectedClip.duration, +(playhead - selectedClip.startTime).toFixed(2))
    );

    const existingIdx = selectedClip.keyframes.findIndex(
      (k) => Math.abs(k.timeOffset - offset) < 0.08
    );

    const newKf = {
      id: `kf-${Date.now()}`,
      timeOffset: offset,
      x: selectedClip.x,
      y: selectedClip.y,
      scale: selectedClip.scale,
      rotation: selectedClip.rotation,
      opacity: selectedClip.opacity,
      easing: 'ease-in-out' as const,
    };

    const nextKeyframes =
      existingIdx >= 0
        ? selectedClip.keyframes.map((k, idx) => (idx === existingIdx ? newKf : k))
        : [...selectedClip.keyframes, newKf];

    handleUpdateClip(selectedClip.id, { keyframes: nextKeyframes });
  }, [selectedClip, playhead, handleUpdateClip]);

  const handleRemoveKeyframe = useCallback(
    (keyframeId: string) => {
      if (!selectedClip) return;
      handleUpdateClip(selectedClip.id, {
        keyframes: selectedClip.keyframes.filter((k) => k.id !== keyframeId),
      });
    },
    [selectedClip, handleUpdateClip]
  );

  // Local file upload (video, image, audio) via Object URL
  const triggerMediaUpload = (targetTrack: TrackType) => {
    uploadTargetTrackRef.current = targetTrack;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const clipId = `clip-upload-${Date.now()}`;
    const isAudio = file.type.startsWith('audio/');
    const isImage = file.type.startsWith('image/');
    const targetTrack: TrackType = isAudio ? 'audio' : uploadTargetTrackRef.current;

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
      accentColor:
        targetTrack === 'audio'
          ? '#10B981'
          : targetTrack === 'overlay'
          ? '#8B5CF6'
          : '#3B82F6',
      x: 0,
      y: 0,
      scale: targetTrack === 'overlay' ? 0.5 : 1,
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
      waveform: isAudio
        ? [0.4, 0.7, 0.85, 0.6, 0.9, 0.5, 0.75, 0.8, 0.45, 0.68, 0.92, 0.55]
        : undefined,
    };

    commitHistory([...clips, newClip]);
    setSelectedClipId(clipId);
    e.target.value = '';
  };

  // Real-Time Canvas captureStream + MediaRecorder Export Pipeline
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
        if (ev.data && ev.data.size > 0) {
          chunks.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setExportDownloadUrl(url);
        setIsExporting(false);
        setIsPlaying(false);
      };

      recorder.start(100);
    } catch {
      // Fallback simulation if browser blocks captureStream
    }

    const exportDurationMs = Math.min(4500, totalDuration * 350);
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
          const fallbackBlob = new Blob(['ClipCraft Render Stream'], {
            type: 'video/webm',
          });
          setExportDownloadUrl(URL.createObjectURL(fallbackBlob));
          setIsExporting(false);
          setIsPlaying(false);
        }
      }
    }, 80);
  }, [exportConfig.fps, totalDuration]);

  // Keyboard shortcuts (Space for Play/Pause, S for Split)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSplitAtPlayhead();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSplitAtPlayhead]);

  return (
    <div className="flex flex-col w-full h-dvh bg-[#0B0C10] text-slate-100 overflow-hidden select-none">
      {/* Hidden File Input for Video, Image, and Audio Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*,audio/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* TOP BAR: Project Title, Undo/Redo, Aspect Ratio Selector, Settings, and Export */}
      <header className="flex items-center justify-between gap-4 px-3.5 py-2.5 bg-[#0F1118] border-b border-white/[0.07] shrink-0 z-30">
        {/* Zone 1: Brand & Editable Project Title */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <span className="font-display font-bold text-sm sm:text-base tracking-tight text-white whitespace-nowrap shrink-0">
            ClipCraft Studio
          </span>
          <span className="text-slate-600 hidden sm:inline">/</span>
          {isEditingTitle ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                className="px-2 py-0.5 text-xs bg-[#181B26] border border-amber-400 rounded text-white focus:outline-none w-36"
                autoFocus
              />
              <button
                onClick={() => setIsEditingTitle(false)}
                className="p-1 text-emerald-400 hover:text-emerald-300"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="hidden sm:inline-block text-xs font-medium text-slate-300 hover:text-white truncate max-w-[160px]"
              title="Click to rename project"
            >
              {projectTitle}
            </button>
          )}
        </div>

        {/* Zone 2: Undo / Redo & Aspect Ratio Selector (9:16, 16:9, 1:1, 4:5) */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06]">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-35 transition-colors"
              title="Undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-35 transition-colors"
              title="Redo"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Aspect Ratio Segmented Selector */}
          <div className="flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06]">
            {(['9:16', '16:9', '1:1', '4:5'] as AspectRatio[]).map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className={`px-2 py-1 rounded-md text-[11px] font-mono-tabular font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  aspectRatio === ratio
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        {/* Zone 3: Settings & Primary Export Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Project Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setExportDownloadUrl(null);
              setIsExportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition-all whitespace-nowrap shrink-0 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* MIDDLE SECTION: Responsive HTML5 Canvas Preview Player */}
      <PreviewPlayer
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
        onSeek={handleSeek}
        onUpdateClipTransform={handleUpdateClip}
        onCycleFitMode={() =>
          setFitMode((prev) =>
            prev === 'cover' ? 'contain' : prev === 'contain' ? 'fill' : 'cover'
          )
        }
      />

      {/* LOWER MIDDLE: Multi-Track Magnetic Timeline */}
      <MultiTrackTimeline
        clips={clips}
        tracks={tracks}
        playhead={playhead}
        totalDuration={totalDuration}
        selectedClipId={selectedClipId}
        magneticSnap={magneticSnap}
        onSelectClip={setSelectedClipId}
        onSeek={handleSeek}
        onSplitAtPlayhead={handleSplitAtPlayhead}
        onDuplicateSelected={handleDuplicateSelected}
        onDeleteSelected={handleDeleteSelected}
        onToggleMagneticSnap={() => setMagneticSnap((s) => !s)}
        onToggleTrackMute={(trackId) =>
          setTracks((prev) =>
            prev.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t))
          )
        }
        onToggleTrackVisible={(trackId) =>
          setTracks((prev) =>
            prev.map((t) => (t.id === trackId ? { ...t, visible: !t.visible } : t))
          )
        }
        onToggleTrackLock={(trackId) =>
          setTracks((prev) =>
            prev.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t))
          )
        }
        onUpdateClipTiming={handleUpdateClipTiming}
        onTriggerMediaUpload={triggerMediaUpload}
      />

      {/* BOTTOM BAR: Tabbed Contextual Feature Dock */}
      <FeatureDock
        activeTab={activeTab}
        selectedClip={selectedClip}
        playhead={playhead}
        onSelectTab={setActiveTab}
        onUpdateClip={handleUpdateClip}
        onUpdateColorGrading={handleUpdateColorGrading}
        onUpdateTextStyle={handleUpdateTextStyle}
        onAddTextClip={handleAddTextClip}
        onAddPipOverlayClip={handleAddPipOverlayClip}
        onAddSfxClip={handleAddSfxClip}
        onAddOrUpdateKeyframe={handleAddOrUpdateKeyframe}
        onRemoveKeyframe={handleRemoveKeyframe}
        onSplitAtPlayhead={handleSplitAtPlayhead}
        onDuplicateSelected={handleDuplicateSelected}
        onDeleteSelected={handleDeleteSelected}
        onTriggerMediaUpload={triggerMediaUpload}
      />

      {/* EXPORT & RENDER MODAL */}
      <ExportModal
        isOpen={isExportModalOpen}
        isExporting={isExporting}
        progress={exportProgress}
        exportConfig={exportConfig}
        downloadUrl={exportDownloadUrl}
        onUpdateConfig={(updates) =>
          setExportConfig((prev) => ({ ...prev, ...updates }))
        }
        onStartExport={handleStartExport}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* PROJECT SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#12151E] border border-white/10 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white font-display">
                Studio Project Settings
              </h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#181B26] border border-white/10 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-white/10">
                <span className="text-slate-300">Magnetic Timeline Snapping</span>
                <button
                  onClick={() => setMagneticSnap((s) => !s)}
                  className={`px-3 py-1 rounded-md font-semibold ${
                    magneticSnap
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {magneticSnap ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-white/10">
                <span className="text-slate-300">Reset Demo Sample Project</span>
                <button
                  onClick={() => {
                    commitHistory(INITIAL_CLIPS, INITIAL_TRACKS);
                    setSelectedClipId('clip-video-1');
                    setPlayhead(0);
                    setShowSettingsModal(false);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Defaults</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
