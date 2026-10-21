import { useRef, useEffect, useCallback } from 'react';
import { TimelineClip, TrackMeta } from '../types/editor';
import { soundEngine } from '../utils/soundEngine';

interface UseTimelinePlaybackProps {
  clips: TimelineClip[];
  tracks: TrackMeta[];
  totalDuration: number;
  isPlaying: boolean;
  mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>;
  audioElements: Map<string, HTMLAudioElement>;
  setIsPlaying: (playing: boolean) => void;
  onFrameUpdate?: (time: number) => void;
}

// Global shared Web Audio AudioContext singleton across the application
let globalAudioCtx: AudioContext | null = null;
let globalMasterGain: GainNode | null = null;
const audioSourceNodes = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

export function getSharedAudioContext(): { audioCtx: AudioContext; masterGain: GainNode } | null {
  if (typeof window === 'undefined') return null;

  if (!globalAudioCtx) {
    const AudioCtxClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return null;

    globalAudioCtx = new AudioCtxClass();
    globalMasterGain = globalAudioCtx.createGain();
    globalMasterGain.connect(globalAudioCtx.destination);
  }

  return { audioCtx: globalAudioCtx, masterGain: globalMasterGain! };
}

export function useTimelinePlayback({
  clips,
  tracks,
  totalDuration,
  isPlaying,
  mediaElements,
  audioElements,
  setIsPlaying,
  onFrameUpdate,
}: UseTimelinePlaybackProps) {
  // Single source of truth for global master time - eliminates React state re-render bottlenecks
  const currentTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const isScrubbingRef = useRef<boolean>(false);
  const lastRafTimeRef = useRef<number | null>(null);
  const onFrameUpdateRef = useRef(onFrameUpdate);

  // Dynamic seek debouncing & active seek lock refs
  const pendingSeekMapRef = useRef<Map<HTMLVideoElement, number>>(new Map());
  const seekingLockMapRef = useRef<WeakSet<HTMLVideoElement>>(new WeakSet());

  useEffect(() => {
    onFrameUpdateRef.current = onFrameUpdate;
  }, [onFrameUpdate]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // ==============================================================
  // 1. AudioContext Lifecycle & User-Gesture Unlocking
  // ==============================================================
  const unlockAudioContext = useCallback(async () => {
    const graph = getSharedAudioContext();
    if (graph && graph.audioCtx.state === 'suspended') {
      try {
        await graph.audioCtx.resume();
      } catch (err) {
        console.warn('AudioContext resume prevented:', err);
      }
    }
  }, []);

  // Global one-time touch listener to unlock AudioContext on first user interaction
  useEffect(() => {
    const handleFirstGesture = () => {
      unlockAudioContext();
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('pointerdown', handleFirstGesture);
    };

    window.addEventListener('touchstart', handleFirstGesture, { passive: true });
    window.addEventListener('click', handleFirstGesture, { passive: true });
    window.addEventListener('pointerdown', handleFirstGesture, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('pointerdown', handleFirstGesture);
    };
  }, [unlockAudioContext]);

  // ==============================================================
  // 2. Single-Node Audio Routing via WeakMap
  // ==============================================================
  const connectAudioSourceSafe = useCallback((mediaEl: HTMLMediaElement) => {
    const graph = getSharedAudioContext();
    if (!graph) return;

    const { audioCtx, masterGain } = graph;

    // Prevent InvalidStateError by reusing cached MediaElementAudioSourceNode
    let sourceNode = audioSourceNodes.get(mediaEl);
    if (!sourceNode) {
      try {
        sourceNode = audioCtx.createMediaElementSource(mediaEl);
        sourceNode.connect(masterGain);
        audioSourceNodes.set(mediaEl, sourceNode);
      } catch {
        // Handled: element might already be connected or detached
      }
    }
  }, []);

  // ==============================================================
  // 3. Decoupled Scrub Muting vs. Playback Unmuting
  // ==============================================================
  const setMasterGainVolume = useCallback((volume: number, rampMs: number = 0) => {
    const graph = getSharedAudioContext();
    if (!graph) return;

    const { audioCtx, masterGain } = graph;
    const now = audioCtx.currentTime;
    const safeVol = Math.max(0, Math.min(1, volume));

    if (rampMs > 0) {
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      // Smooth 15ms linear ramp to eliminate speaker pops and crackles
      masterGain.gain.linearRampToValueAtTime(safeVol, now + rampMs / 1000);
    } else {
      masterGain.gain.setValueAtTime(safeVol, now);
    }
  }, []);

  // ==============================================================
  // 4. Video Seek Throttling with Active Seek Lock & FastSeek
  // ==============================================================
  const dispatchVideoSeek = useCallback(
    (videoEl: HTMLVideoElement, targetTime: number, isScrubbing: boolean) => {
      const safeTime = Math.max(0, targetTime);

      if (videoEl.seeking || seekingLockMapRef.current.has(videoEl)) {
        // Enforce 16ms gate: queue newer seek time while previous hardware decode is underway
        pendingSeekMapRef.current.set(videoEl, safeTime);
        return;
      }

      seekingLockMapRef.current.add(videoEl);

      const onSeeked = () => {
        videoEl.removeEventListener('seeked', onSeeked);
        seekingLockMapRef.current.delete(videoEl);

        const pending = pendingSeekMapRef.current.get(videoEl);
        if (pending !== undefined) {
          pendingSeekMapRef.current.delete(videoEl);
          dispatchVideoSeek(videoEl, pending, isScrubbingRef.current);
        }
      };

      videoEl.addEventListener('seeked', onSeeked, { once: true });

      if (isScrubbing && 'fastSeek' in videoEl && typeof (videoEl as unknown as { fastSeek: (t: number) => void }).fastSeek === 'function') {
        try {
          (videoEl as unknown as { fastSeek: (t: number) => void }).fastSeek(safeTime);
        } catch {
          videoEl.currentTime = safeTime;
        }
      } else {
        videoEl.currentTime = safeTime;
      }
    },
    []
  );

  // ==============================================================
  // 5. Audio-Video Hard Sync (A/V Locking with 40ms drift threshold)
  // ==============================================================
  const syncHardwareMedia = useCallback(
    (targetTime: number, playing: boolean, isScrubbing: boolean = false) => {
      isScrubbingRef.current = isScrubbing;

      if (isScrubbing) {
        // Instant ramp gain to 0 to prevent audio screech and decoder buffer lockup
        setMasterGainVolume(0, 0);
      }

      // Find primary video element if active
      let masterVideoEl: HTMLVideoElement | null = null;
      for (const clip of clips) {
        if (clip.trackId === 'video' && targetTime >= clip.startTime && targetTime < clip.startTime + clip.duration) {
          const el = mediaElements.get(clip.id);
          if (el && el instanceof HTMLVideoElement) {
            masterVideoEl = el;
            break;
          }
        }
      }

      clips.forEach((clip) => {
        const trackMeta = tracks.find((t) => t.id === clip.trackId);
        const isTrackMuted = trackMeta?.muted ?? false;
        const isClipActive =
          targetTime >= clip.startTime && targetTime < clip.startTime + clip.duration;
        const localSourceTime =
          clip.sourceStartOffset + (targetTime - clip.startTime) * clip.speed;

        // Video element sync: decoding video elements MUST strictly stay muted
        // to bypass mobile WebKit/Chromium autoplay blocks and prevent frame drops
        const mediaEl = mediaElements.get(clip.id);
        if (mediaEl && mediaEl instanceof HTMLVideoElement) {
          mediaEl.playbackRate = clip.speed;
          mediaEl.preservesPitch = clip.preservePitch;
          mediaEl.muted = true; // Always muted; audio managed via synchronized audio pipeline

          if (isClipActive) {
            if (isScrubbing || Math.abs(mediaEl.currentTime - localSourceTime) > 0.08) {
              dispatchVideoSeek(mediaEl, localSourceTime, isScrubbing);
            }
            if (playing && !isScrubbing && mediaEl.paused) {
              mediaEl.play().catch(() => {});
            } else if ((!playing || isScrubbing) && !mediaEl.paused) {
              mediaEl.pause();
            }
          } else if (!mediaEl.paused) {
            mediaEl.pause();
          }
        }

        // Audio element sync & Hard Drift Correction
        const audioEl = audioElements.get(clip.id);
        if (audioEl) {
          connectAudioSourceSafe(audioEl);
          audioEl.playbackRate = clip.speed;
          audioEl.preservesPitch = clip.preservePitch;
          // During scrubbing, always mute audio to eliminate scrubbing screech
          audioEl.muted = isScrubbing || clip.muted || isTrackMuted;
          audioEl.volume = Math.max(0, Math.min(1, clip.volume / 100));

          if (isClipActive) {
            // A/V Hard Sync: if audio drifts > 40ms from video clock or calculated timeline, resync
            const masterClock = masterVideoEl ? masterVideoEl.currentTime : localSourceTime;
            const drift = Math.abs(audioEl.currentTime - masterClock);
            if (drift > 0.040 || isScrubbing) {
              audioEl.currentTime = Math.max(0, localSourceTime);
            }

            if (playing && !isScrubbing && audioEl.paused) {
              audioEl.play().catch(() => {});
            } else if ((!playing || isScrubbing) && !audioEl.paused) {
              audioEl.pause();
            }
          } else if (!audioEl.paused) {
            audioEl.pause();
          }
        }

        // Web Audio synth pulses on audio track
        if (
          playing &&
          !isScrubbing &&
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
    [clips, tracks, mediaElements, audioElements, connectAudioSourceSafe, dispatchVideoSeek, setMasterGainVolume]
  );

  // Seek master clock directly with high precision
  const seekTo = useCallback(
    (time: number, isScrubbing: boolean = false) => {
      const clamped = Math.max(0, Math.min(totalDuration, time));
      currentTimeRef.current = clamped;
      syncHardwareMedia(clamped, isPlayingRef.current, isScrubbing);
      if (onFrameUpdateRef.current) {
        onFrameUpdateRef.current(clamped);
      }

      if (!isScrubbing && isPlayingRef.current) {
        // When user finishes scrubbing while playing, smoothly ramp audio back up
        setMasterGainVolume(1.0, 15);
      }
    },
    [totalDuration, syncHardwareMedia, setMasterGainVolume]
  );

  // Dedicated 60fps RequestAnimationFrame loop driven by unified currentTimeRef
  useEffect(() => {
    if (!isPlaying) {
      lastRafTimeRef.current = null;
      syncHardwareMedia(currentTimeRef.current, false, false);
      return;
    }

    // Unmute smoothly with 15ms linear ramp when pressing play
    unlockAudioContext();
    setMasterGainVolume(1.0, 15);

    let rafId: number;

    const tick = (timestamp: number) => {
      if (lastRafTimeRef.current === null) {
        lastRafTimeRef.current = timestamp;
      }
      const deltaSec = (timestamp - lastRafTimeRef.current) / 1000;
      lastRafTimeRef.current = timestamp;

      let nextTime = currentTimeRef.current + deltaSec;

      if (nextTime >= totalDuration) {
        currentTimeRef.current = 0;
        setIsPlaying(false);
        soundEngine.resetBeatTracker();
        syncHardwareMedia(0, false, false);
        if (onFrameUpdateRef.current) {
          onFrameUpdateRef.current(0);
        }
        return;
      }

      currentTimeRef.current = nextTime;
      syncHardwareMedia(nextTime, true, false);

      if (onFrameUpdateRef.current) {
        onFrameUpdateRef.current(nextTime);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, totalDuration, syncHardwareMedia, setIsPlaying, unlockAudioContext, setMasterGainVolume]);

  return {
    currentTimeRef,
    seekTo,
    syncHardwareMedia,
    unlockAudioContext,
  };
}
