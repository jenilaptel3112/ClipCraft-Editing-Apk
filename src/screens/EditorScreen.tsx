import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Undo2,
  Redo2,
  Download,
  ArrowLeft,
  Settings,
  X,
  Film,
} from 'lucide-react';
import { useMediaImporter } from '../hooks/useMediaImporter';
import { proxyManager } from '../utils/proxyManager';
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
  VideoEffectConfig,
  BrushType,
  DrawingStroke,
  Keyframe,
  ProjectSettings,
} from '../types/editor';
import {
  INITIAL_CLIPS,
  INITIAL_TRACKS,
  DEFAULT_COLOR_GRADING,
  createDefaultProjectSettings,
} from '../utils/presets';
import { useTimelinePlayback } from '../hooks/useTimelinePlayback';
import { OptimizedPreviewPlayer } from '../components/OptimizedPreviewPlayer';
import { TimelineView } from '../components/TimelineView';
import { ContextualDock } from '../components/ContextualDock';
import { KineticTextSheet } from '../components/KineticTextSheet';
import { VideoEffectsSheet } from '../components/VideoEffectsSheet';
import { FilterDrawer } from '../components/FilterDrawer';
import { SpeedDrawer } from '../components/SpeedDrawer';
import { VolumeDrawer } from '../components/VolumeDrawer';
import { FormatDrawer, AudioDrawer, EffectsDrawer } from '../components/QuickDrawers';
import { ProExportSettingsDrawer } from '../components/ProExportSettingsDrawer';
import { Transform3DDrawer } from '../components/Transform3DDrawer';
import { VectorDrawingDrawer } from '../components/VectorDrawingDrawer';
import { ProjectSettingsModal } from '../components/ProjectSettingsModal';
import { useProject } from '../context/ProjectContext';

interface HistorySnapshot {
  clips: TimelineClip[];
  tracks: TrackMeta[];
}

interface EditorScreenProps {
  onTriggerExport: (canvas: HTMLCanvasElement, duration: number) => void;
}

export const EditorScreen: React.FC<EditorScreenProps> = ({ onTriggerExport }) => {
  const {
    activeProject,
    updateActiveProject,
    updateActiveProjectSettings,
    setCurrentScreen,
  } = useProject();

  const [projectSettings, setProjectSettings] = useState<ProjectSettings>(() => {
    return (
      activeProject?.settings ||
      createDefaultProjectSettings(
        activeProject?.id,
        activeProject?.title,
        activeProject?.aspectRatio || '9:16'
      )
    );
  });

  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState<boolean>(false);
  const { toastNotice, clearToast, importMediaFile } = useMediaImporter();

  // Viewport & Aspect Ratio State from active project
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    activeProject?.aspectRatio || '9:16'
  );
  const [fitMode, setFitMode] = useState<FitMode>(
    activeProject?.fitMode || 'cover'
  );

  // Sync when activeProject settings updates
  useEffect(() => {
    if (activeProject?.settings) {
      setProjectSettings(activeProject.settings);
      setAspectRatio(activeProject.settings.aspectRatio);
    }
  }, [activeProject?.settings]);

  const handleSaveProjectSettings = useCallback(
    (newSettings: ProjectSettings) => {
      setProjectSettings(newSettings);
      setAspectRatio(newSettings.aspectRatio);
      updateActiveProjectSettings(newSettings);
    },
    [updateActiveProjectSettings]
  );

  // Timeline Clips & Track Metadata
  const [clips, setClips] = useState<TimelineClip[]>(
    activeProject?.clips || INITIAL_CLIPS
  );
  const [tracks, setTracks] = useState<TrackMeta[]>(
    activeProject?.tracks || INITIAL_TRACKS
  );

  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<HistorySnapshot[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isDraftScrubbing, setIsDraftScrubbing] = useState<boolean>(false);

  // Drawers
  const [isTextDrawerOpen, setIsTextDrawerOpen] = useState<boolean>(false);
  const [isVideoEffectsDrawerOpen, setIsVideoEffectsDrawerOpen] = useState<boolean>(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);
  const [isSpeedDrawerOpen, setIsSpeedDrawerOpen] = useState<boolean>(false);
  const [isVolumeDrawerOpen, setIsVolumeDrawerOpen] = useState<boolean>(false);
  const [isFormatDrawerOpen, setIsFormatDrawerOpen] = useState<boolean>(false);
  const [isAudioDrawerOpen, setIsAudioDrawerOpen] = useState<boolean>(false);
  const [isEffectsDrawerOpen, setIsEffectsDrawerOpen] = useState<boolean>(false);
  const [isExportDrawerOpen, setIsExportDrawerOpen] = useState<boolean>(false);
  const [isTransform3DDrawerOpen, setIsTransform3DDrawerOpen] = useState<boolean>(false);
  const [isDrawingDrawerOpen, setIsDrawingDrawerOpen] = useState<boolean>(false);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [activeBrush, setActiveBrush] = useState<BrushType>('pen');
  const [brushColor, setBrushColor] = useState<string>('#F59E0B');
  const [brushWidth, setBrushWidth] = useState<number>(6);
  const [brushOpacity, setBrushOpacity] = useState<number>(1);
  const [brushCap, setBrushCap] = useState<'round' | 'square'>('round');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaElementsRef = useRef<Map<string, HTMLVideoElement | HTMLImageElement>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTypeRef = useRef<'video' | 'audio'>('video');

  const renderTriggerRef = useRef<((time: number, isDraft?: boolean) => void) | null>(null);
  const scrubberTriggerRef = useRef<((time: number) => void) | null>(null);

  // Auto-Save project state hook to localStorage whenever clips, tracks, or aspectRatio change
  useEffect(() => {
    if (!activeProject) return;
    const maxEnd = clips.length > 0 ? Math.max(...clips.map((c) => c.startTime + c.duration)) : 10;
    updateActiveProject({
      clips,
      tracks,
      aspectRatio,
      fitMode,
      duration: +maxEnd.toFixed(1),
    });
  }, [clips, tracks, aspectRatio, fitMode, updateActiveProject, activeProject]);

  const totalDuration = useMemo(() => {
    if (clips.length === 0) return 8;
    const maxEnd = Math.max(...clips.map((c) => c.startTime + c.duration));
    return Math.max(4, +maxEnd.toFixed(2));
  }, [clips]);

  const selectedClip = useMemo(
    () => clips.find((c) => c.id === selectedClipId) || null,
    [clips, selectedClipId]
  );

  const { currentTimeRef, seekTo } = useTimelinePlayback({
    clips,
    tracks,
    totalDuration,
    isPlaying,
    mediaElements: mediaElementsRef.current,
    audioElements: audioElementsRef.current,
    setIsPlaying,
    onFrameUpdate: (time) => {
      if (renderTriggerRef.current) {
        renderTriggerRef.current(time, isDraftScrubbing);
      }
      if (scrubberTriggerRef.current) {
        scrubberTriggerRef.current(time);
      }
    },
  });

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

  const handleSeek = useCallback(
    (time: number, isScrubbing: boolean) => {
      setIsDraftScrubbing(isScrubbing);
      seekTo(time, isScrubbing);
      if (renderTriggerRef.current) {
        renderTriggerRef.current(time, isScrubbing);
      }
    },
    [seekTo]
  );

  const handleSplitClip = useCallback(() => {
    if (!selectedClip) return;
    const currentT = currentTimeRef.current;
    if (
      currentT <= selectedClip.startTime + 0.2 ||
      currentT >= selectedClip.startTime + selectedClip.duration - 0.2
    ) {
      return;
    }

    const firstDuration = +(currentT - selectedClip.startTime).toFixed(2);
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
      startTime: +currentT.toFixed(2),
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
  }, [selectedClip, currentTimeRef, clips, commitHistory]);

  const handleDeleteClip = useCallback(() => {
    if (!selectedClipId) return;
    const clipToDelete = clips.find((c) => c.id === selectedClipId);

    if (clipToDelete?.mediaUrl && clipToDelete.mediaUrl.startsWith('blob:')) {
      URL.revokeObjectURL(clipToDelete.mediaUrl);
    }

    mediaElementsRef.current.delete(selectedClipId);
    audioElementsRef.current.delete(selectedClipId);

    const nextClips = clips.filter((c) => c.id !== selectedClipId);
    commitHistory(nextClips);
    setSelectedClipId(null);
  }, [selectedClipId, clips, commitHistory]);

  const handleUpdateClip = useCallback(
    (clipId: string, updates: Partial<TimelineClip>) => {
      setClips((prev) =>
        prev.map((c) => (c.id === clipId ? { ...c, ...updates } : c))
      );
    },
    []
  );

  const handleAddNullLayer = useCallback(() => {
    const id = `null-${Date.now()}`;
    const newClip: TimelineClip = {
      id,
      trackId: 'overlay',
      name: 'Null Anchor',
      startTime: +currentTimeRef.current.toFixed(2),
      duration: 6.0,
      sourceStartOffset: 0,
      sourceMaxDuration: 60,
      mediaType: 'null',
      is3D: true,
      accentColor: '#06B6D4',
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      rotation: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      opacity: 1,
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      keyframes: [],
      transitionIn: { type: 'none', duration: 0 },
      activeEffects: [],
      speed: 1,
      preservePitch: true,
      volume: 100,
      muted: true,
      fadeIn: 0,
      fadeOut: 0,
    };
    commitHistory([...clips, newClip]);
    setSelectedClipId(id);
    setIsTransform3DDrawerOpen(true);
  }, [currentTimeRef, clips, commitHistory]);

  const handleAddCameraLayer = useCallback(() => {
    const id = `cam-${Date.now()}`;
    const newClip: TimelineClip = {
      id,
      trackId: 'overlay',
      name: '3D Camera',
      startTime: +currentTimeRef.current.toFixed(2),
      duration: 8.0,
      sourceStartOffset: 0,
      sourceMaxDuration: 60,
      mediaType: 'camera',
      is3D: true,
      cameraFov: 50,
      cameraTarget: [0, 0, 0],
      cameraRoll: 0,
      cameraPreset: 'front',
      cameraDofEnabled: false,
      accentColor: '#A855F7',
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      rotation: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      opacity: 1,
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      keyframes: [],
      transitionIn: { type: 'none', duration: 0 },
      activeEffects: [],
      speed: 1,
      preservePitch: true,
      volume: 100,
      muted: true,
      fadeIn: 0,
      fadeOut: 0,
    };
    commitHistory([...clips, newClip]);
    setSelectedClipId(id);
    setIsTransform3DDrawerOpen(true);
  }, [currentTimeRef, clips, commitHistory]);

  const handleStartDrawing = useCallback(() => {
    if (selectedClip && selectedClip.mediaType === 'drawing') {
      setIsDrawingDrawerOpen(true);
      setIsDrawingMode(true);
      return;
    }
    const id = `draw-${Date.now()}`;
    const newClip: TimelineClip = {
      id,
      trackId: 'overlay',
      name: 'Vector Drawing',
      startTime: +currentTimeRef.current.toFixed(2),
      duration: 6.0,
      sourceStartOffset: 0,
      sourceMaxDuration: 60,
      mediaType: 'drawing',
      accentColor: '#F59E0B',
      drawingData: {
        strokes: [],
        startTrim: 0,
        endTrim: 100,
      },
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      keyframes: [],
      transitionIn: { type: 'none', duration: 0 },
      activeEffects: [],
      speed: 1,
      preservePitch: true,
      volume: 100,
      muted: true,
      fadeIn: 0,
      fadeOut: 0,
    };
    commitHistory([...clips, newClip]);
    setSelectedClipId(id);
    setIsDrawingDrawerOpen(true);
    setIsDrawingMode(true);
  }, [selectedClip, currentTimeRef, clips, commitHistory]);

  const handleAddDrawingStroke = useCallback((stroke: DrawingStroke) => {
    if (!selectedClipId) return;
    setClips((prev) =>
      prev.map((c) => {
        if (c.id === selectedClipId && c.mediaType === 'drawing') {
          const prevStrokes = c.drawingData?.strokes || [];
          return {
            ...c,
            drawingData: {
              strokes: [...prevStrokes, stroke],
              startTrim: c.drawingData?.startTrim ?? 0,
              endTrim: c.drawingData?.endTrim ?? 100,
            },
          };
        }
        return c;
      })
    );
  }, [selectedClipId]);

  const handleUndoStroke = useCallback(() => {
    if (!selectedClipId) return;
    setClips((prev) =>
      prev.map((c) => {
        if (c.id === selectedClipId && c.mediaType === 'drawing' && c.drawingData) {
          return {
            ...c,
            drawingData: {
              ...c.drawingData,
              strokes: c.drawingData.strokes.slice(0, -1),
            },
          };
        }
        return c;
      })
    );
  }, [selectedClipId]);

  const handleClearDrawing = useCallback(() => {
    if (!selectedClipId) return;
    setClips((prev) =>
      prev.map((c) => {
        if (c.id === selectedClipId && c.mediaType === 'drawing' && c.drawingData) {
          return {
            ...c,
            drawingData: {
              ...c.drawingData,
              strokes: [],
            },
          };
        }
        return c;
      })
    );
  }, [selectedClipId]);

  const handleUpdateTrimPaths = useCallback((startTrim: number, endTrim: number) => {
    if (!selectedClipId) return;
    setClips((prev) =>
      prev.map((c) => {
        if (c.id === selectedClipId && c.mediaType === 'drawing' && c.drawingData) {
          return {
            ...c,
            drawingData: {
              ...c.drawingData,
              startTrim,
              endTrim,
            },
          };
        }
        return c;
      })
    );
  }, [selectedClipId]);

  const handleAddKeyframe = useCallback((clipId: string, keyframe: Keyframe) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id === clipId) {
          const filtered = c.keyframes.filter((k) => Math.abs(k.timeOffset - keyframe.timeOffset) > 0.05);
          return {
            ...c,
            keyframes: [...filtered, keyframe].sort((a, b) => a.timeOffset - b.timeOffset),
          };
        }
        return c;
      })
    );
  }, []);

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

  const handleUpdateVideoEffects = useCallback(
    (clipId: string, effects: VideoEffectConfig[]) => {
      setClips((prev) =>
        prev.map((c) => (c.id === clipId ? { ...c, activeEffects: effects } : c))
      );
    },
    []
  );

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

  const handleAddTextWithPreset = useCallback(
    (style: TextStyle) => {
      const newId = `clip-text-${Date.now()}`;
      const newClip: TimelineClip = {
        id: newId,
        trackId: 'text',
        name: `Title: ${style.content.slice(0, 14)}`,
        startTime: +currentTimeRef.current.toFixed(2),
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
        textStyle: style,
        transitionIn: { type: 'none', duration: 0.3 },
        activeEffects: [],
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
    [currentTimeRef, clips, commitHistory]
  );

  const handleAddSfxClip = useCallback(
    (sfxType: 'whoosh' | 'sub-drop' | 'shutter' | 'glitch') => {
      const newId = `clip-sfx-${Date.now()}`;
      const newClip: TimelineClip = {
        id: newId,
        trackId: 'audio',
        name: `SFX_${sfxType.toUpperCase()}.wav`,
        startTime: +currentTimeRef.current.toFixed(2),
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
        activeEffects: [],
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
    [currentTimeRef, clips, commitHistory]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const clipId = `clip-upload-${Date.now()}`;
    const result = await importMediaFile(file);
    if (!result) return;

    const targetTrack = result.mediaType === 'audio' ? 'audio' : 'video';

    if (result.mediaType === 'image') {
      const img = new Image();
      img.src = result.objectUrl;
      mediaElementsRef.current.set(clipId, img);
    } else if (result.mediaType === 'video') {
      const video = document.createElement('video');
      video.src = result.objectUrl;
      video.crossOrigin = 'anonymous';
      video.playsInline = true;
      video.preload = 'metadata'; // Never load full 2-hour file into memory
      mediaElementsRef.current.set(clipId, video);
      proxyManager.registerMedia(clipId, file, result.objectUrl, result.width, result.height);
      proxyManager.registerOriginalElement(clipId, video);
    } else {
      const audio = new Audio(result.objectUrl);
      audio.preload = 'metadata';
      audioElementsRef.current.set(clipId, audio);
    }

    // Default clip length: for very long files, give a comfortable 60s working slice or full duration
    const clipDuration = Math.min(result.duration, 60);

    const newClip: TimelineClip = {
      id: clipId,
      sourceId: clipId,
      isLongDuration: result.isLongDuration,
      trackId: targetTrack,
      name: file.name,
      startTime: +currentTimeRef.current.toFixed(2),
      duration: clipDuration,
      sourceStartOffset: 0,
      sourceMaxDuration: result.duration,
      mediaType: result.mediaType,
      mediaUrl: result.objectUrl,
      accentColor: targetTrack === 'audio' ? '#10B981' : '#3B82F6',
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      colorGrading: { ...DEFAULT_COLOR_GRADING },
      keyframes: [],
      transitionIn: { type: 'crossfade', duration: 0.5 },
      activeEffects: [],
      speed: 1,
      preservePitch: true,
      volume: 85,
      muted: false,
      fadeIn: 0.2,
      fadeOut: 0.2,
      waveform: result.waveform,
    };

    commitHistory([...clips, newClip]);
    setSelectedClipId(clipId);
    e.target.value = '';
  };

  const handleExportClick = () => {
    setIsExportDrawerOpen(true);
  };

  return (
    <div className="flex flex-col w-full h-dvh bg-[#0B0C10] text-slate-100 overflow-hidden select-none">
      <input
        ref={fileInputRef}
        type="file"
        accept={uploadTypeRef.current === 'audio' ? 'audio/*' : 'video/*,image/*'}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Toast Notice Banner for Large File Ingestion & Memory Safeguards */}
      {toastNotice && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 max-w-sm w-11/12 bg-[#12141C]/95 border border-amber-500/40 text-white p-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Film className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h5 className="text-xs font-bold text-amber-300 truncate">{toastNotice.title}</h5>
              <p className="text-[11px] text-slate-300 leading-tight">{toastNotice.message}</p>
            </div>
          </div>
          <button
            onClick={clearToast}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP BAR: Back arrow to Dashboard, Project Title, Settings Button, Aspect Ratio and Export */}
      <header className="flex items-center justify-between px-3 py-2 bg-[#0F1118] border-b border-white/[0.08] shrink-0 z-20">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => setCurrentScreen('DASHBOARD_SCREEN')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white bg-white/[0.04] active:scale-95 transition-all shrink-0 cursor-pointer"
            title="Save & Exit to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Project Title Button: Opens Project Settings Modal */}
          <button
            onClick={() => setIsProjectSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/[0.06] active:scale-95 transition-all text-left cursor-pointer min-w-0"
            title="Configure Project Settings"
          >
            <span className="font-display font-bold text-sm text-white truncate max-w-[100px] sm:max-w-[150px]">
              {projectSettings.name || activeProject?.title || 'ClipCraft'}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono-tabular font-extrabold text-amber-400 shrink-0">
              {projectSettings.aspectRatio}
            </span>
          </button>

          {/* Project Settings Gear Button */}
          <button
            onClick={() => setIsProjectSettingsOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 transition-all shrink-0 cursor-pointer border border-amber-500/20"
            title="Project Settings (Canvas, FPS, Audio)"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-0.5 ml-1">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-30 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white disabled:opacity-30 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Aspect Ratio Switcher */}
          <div className="hidden xs:flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-xl border border-white/[0.06]">
            {(['9:16', '16:9', '1:1'] as AspectRatio[]).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setAspectRatio(r);
                  handleSaveProjectSettings({ ...projectSettings, aspectRatio: r });
                }}
                className={`px-2 py-1 rounded-lg text-xs font-mono-tabular font-bold transition-all cursor-pointer ${
                  aspectRatio === r
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Prominent Export Button */}
          <button
            onClick={handleExportClick}
            className="min-h-[38px] px-3.5 sm:px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* Video Preview Monitor */}
      <OptimizedPreviewPlayer
        canvasRef={canvasRef}
        currentTimeRef={currentTimeRef}
        totalDuration={totalDuration}
        isPlaying={isPlaying}
        aspectRatio={aspectRatio}
        fitMode={fitMode}
        clips={clips}
        tracks={tracks}
        mediaElements={mediaElementsRef.current}
        selectedClipId={selectedClipId}
        customDimensions={projectSettings.customDimensions}
        resolutionTier={projectSettings.resolutionTier}
        backgroundColor={projectSettings.backgroundColor}
        backgroundBlurFallback={projectSettings.backgroundBlurFallback}
        timecodeDisplay={projectSettings.timecodeDisplay}
        frameRate={projectSettings.frameRate}
        isDraftScrubbing={isDraftScrubbing}
        isDrawingMode={isDrawingMode}
        activeBrush={activeBrush}
        brushColor={brushColor}
        brushWidth={brushWidth}
        brushOpacity={brushOpacity}
        brushCap={brushCap}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onUpdateClipTransform={handleUpdateClip}
        onAddDrawingStroke={handleAddDrawingStroke}
        registerRenderTrigger={(trigger) => {
          renderTriggerRef.current = trigger;
        }}
      />

      {/* Multi-Track Timeline with Fixed-Center Playhead */}
      <TimelineView
        clips={clips}
        totalDuration={totalDuration}
        selectedClipId={selectedClipId}
        isPlaying={isPlaying}
        currentTime={currentTimeRef.current}
        timecodeDisplay={projectSettings.timecodeDisplay}
        frameRate={projectSettings.frameRate}
        onSelectClip={setSelectedClipId}
        onSeek={handleSeek}
        onUpdateClipTiming={handleUpdateClipTiming}
        registerScrubberTrigger={(trigger) => {
          scrubberTriggerRef.current = trigger;
        }}
      />

      {/* Contextual Dock */}
      <ContextualDock
        selectedClip={selectedClip}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onDeselectClip={() => {
          setSelectedClipId(null);
          setIsDrawingMode(false);
        }}
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
        onOpenVideoEffectsDrawer={() => setIsVideoEffectsDrawerOpen(true)}
        onOpenTransform3DDrawer={() => setIsTransform3DDrawerOpen(true)}
        onOpenDrawingDrawer={handleStartDrawing}
        onDeleteClip={handleDeleteClip}
      />

      {/* Effects Sheet */}
      <VideoEffectsSheet
        isOpen={isVideoEffectsDrawerOpen}
        selectedClip={selectedClip}
        onClose={() => setIsVideoEffectsDrawerOpen(false)}
        onUpdateEffects={handleUpdateVideoEffects}
      />

      {/* Kinetic Text Sheet */}
      <KineticTextSheet
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
          if (selectedClipId) handleUpdateClip(selectedClipId, { activeEffects: [{ id: 'eff-1', type: effect as any, intensity: 50, speed: 1, glow: 50, blur: 10 }] });
        }}
        onApplyTransition={(transition: TransitionType) => {
          if (selectedClipId)
            handleUpdateClip(selectedClipId, {
               transitionIn: { type: transition, duration: 0.5 },
             });
        }}
      />

      <ProExportSettingsDrawer
        isOpen={isExportDrawerOpen}
        totalDuration={totalDuration}
        aspectRatio={aspectRatio}
        onClose={() => setIsExportDrawerOpen(false)}
        onStartExport={(_config) => {
          setIsExportDrawerOpen(false);
          if (canvasRef.current) {
            onTriggerExport(canvasRef.current, totalDuration);
          }
        }}
      />

      {/* 3D Spatial Transform & Parenting Drawer */}
      <Transform3DDrawer
        isOpen={isTransform3DDrawerOpen}
        selectedClip={selectedClip}
        allClips={clips}
        currentTime={currentTimeRef.current}
        onClose={() => setIsTransform3DDrawerOpen(false)}
        onUpdateTransform={handleUpdateClip}
        onAddKeyframe={handleAddKeyframe}
        onAddNullLayer={handleAddNullLayer}
        onAddCameraLayer={handleAddCameraLayer}
      />

      {/* Vector Drawing & Brush Tool Drawer */}
      <VectorDrawingDrawer
        isOpen={isDrawingDrawerOpen}
        selectedClip={selectedClip}
        activeBrush={activeBrush}
        brushColor={brushColor}
        brushWidth={brushWidth}
        brushOpacity={brushOpacity}
        brushCap={brushCap}
        onClose={() => {
          setIsDrawingDrawerOpen(false);
          setIsDrawingMode(false);
        }}
        onSelectBrush={setActiveBrush}
        onChangeColor={setBrushColor}
        onChangeWidth={setBrushWidth}
        onChangeOpacity={setBrushOpacity}
        onChangeCap={setBrushCap}
        onUndoStroke={handleUndoStroke}
        onClearDrawing={handleClearDrawing}
        onUpdateTrimPaths={handleUpdateTrimPaths}
      />

      {/* Project Settings Modal: Mid-Edit Access */}
      <ProjectSettingsModal
        isOpen={isProjectSettingsOpen}
        initialSettings={projectSettings}
        onClose={() => setIsProjectSettingsOpen(false)}
        onSave={handleSaveProjectSettings}
      />
    </div>
  );
};
