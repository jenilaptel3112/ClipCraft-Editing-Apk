import { useRef, useEffect, useCallback, useState } from 'react';
import { TimelineClip, TrackMeta } from '../types/editor';

interface UseMediaPlaybackEngineProps {
  clips: TimelineClip[];
  tracks: TrackMeta[];
  totalDuration: number;
  mediaElements: Map<string, HTMLVideoElement | HTMLImageElement>;
  audioElements: Map<string, HTMLAudioElement>;
  onFrameUpdate?: (currentTime: number) => void;
}

// Global shared AudioContext singleton across the application
let globalAudioCtx: AudioContext | null = null;
let globalMasterGain: GainNode | null = null;
const audioSourceNodes = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();

function getOrCreateAudioContext(): { audioCtx: AudioContext; masterGain: GainNode } | null {
  if (typeof window === 'undefined') return null;

  if (!globalAudioCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return null;

    globalAudioCtx = new AudioCtxClass();
    globalMasterGain = globalAudioCtx.createGain();
    globalMasterGain.connect(globalAudioCtx.destination);
  }

  return { audioCtx: globalAudioCtx, masterGain: globalMasterGain! };
}

export function useMediaPlaybackEngine({
  clips,
  tracks,
  totalDuration,
  mediaElements,
  audioElements,
  onFrameUpdate,
}: UseMediaPlaybackEngineProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const currentTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const isScrubbingRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);
  const lastWallClockRef = useRef<number | null>(null);
  const onFrameUpdateRef = useRef(onFrameUpdate);

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
    const audioGraph = getOrCreateAudioContext();
    if (audioGraph && audioGraph.audioCtx.state === 'suspended') {
      try {
        await audioGraph.audioCtx.resume();
      } catch (err) {
        console.warn('AudioContext resume was prevented:', err);
      }
    }
  }, []);

  // Global one-time touch listener to unlock AudioContext on first user interaction
  useEffect(() => {
    const handleFirstTouch = () => {
      unlockAudioContext();
      window.removeEventListener('touchstart', handleFirstTouch);
      window.removeEventListener('click', handleFirstTouch);
      window.removeEventListener('pointerdown', handleFirstTouch);
    };

    window.addEventListener('touchstart', handleFirstTouch, { passive: true });
    window.addEventListener('click', handleFirstTouch, { passive: true });
    window.addEventListener('pointerdown', handleFirstTouch, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleFirstTouch);
      window.removeEventListener('click', handleFirstTouch);
      window.removeEventListener('pointerdown', handleFirstTouch);
    };
  }, [unlockAudioContext]);

  // ==============================================================
  // 2. Single-Node Audio Routing via WeakMap
  // ==============================================================
  const connectAudioSourceSafe = useCallback((mediaEl: HTMLMediaElement) => {
    const audioGraph = getOrCreateAudioContext();
    if (!audioGraph) return;

    const { audioCtx, masterGain } = audioGraph;

    // Check if source node is already attached to this element to prevent InvalidStateError
    let sourceNode = audioSourceNodes.get(mediaEl);
    if (!sourceNode) {
      try {
        sourceNode = audioCtx.createMediaElementSource(mediaEl);
        sourceNode.connect(masterGain);
        audioSourceNodes.set(mediaEl, sourceNode);
      } catch {
        // If element cannot be connected or already connected elsewhere, ignore safely
      }
    }
  }, []);

  // ==============================================================
  // 3. Decoupled Scrub Muting vs. Playback Unmuting
  // ==============================================================
  const setMasterGainVolume = useCallback((volume: number, rampMs: number = 0) => {
    const audioGraph = getOrCreateAudioContext();
    if (!audioGraph) return;

    const { audioCtx, masterGain } = audioGraph;
    const now = audioCtx.currentTime;
    const safeVol = Math.max(0, Math.min(1, volume));

    if (rampMs > 0) {
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      // Smooth 15ms linear ramp to eliminate speaker pops and clicks
      masterGain.gain.linearRampToValueAtTime(safeVol, now + rampMs / 1000);
    } else {
      masterGain.gain.setValueAtTime(safeVol, now);
    }
  }, []);

  // ==============================================================
  // 4. Hardware Video Decoder Pool & A/V Sync Lock Loop
  // ==============================================================
  const syncHardwarePipeline = useCallback(
    (targetTime: number, playing: boolean, isScrubbing: boolean = false) => {
      isScrubbingRef.current = isScrubbing;

      if (isScrubbing) {
        // Instant ramp gain to 0 to prevent audio screech and decoder buffer lockup
        setMasterGainVolume(0, 0);
      }

      // Identify active video clips in current playhead window
      // Maximum 2 hardware video decoders active at once to protect mobile GPU textures
      let activeDecoderCount = 0;
      let primaryMasterVideo: HTMLVideoElement | null = null;

      clips.forEach((clip) => {
        const isClipActive = targetTime >= clip.startTime && targetTime < clip.startTime + clip.duration;
        const localSourceTime = clip.sourceStartOffset + (targetTime - clip.startTime) * clip.speed;
        const trackMeta = tracks.find((t) => t.id === clip.trackId);
        const isTrackMuted = trackMeta?.muted ?? false;

        // Video Pipeline
        const videoEl = mediaElements.get(clip.id);
        if (videoEl && videoEl instanceof HTMLVideoElement) {
          if (isClipActive && activeDecoderCount < 2) {
            activeDecoderCount++;
            if (!primaryMasterVideo) primaryMasterVideo = videoEl;

            // Enforce mobile attributes
            videoEl.muted = true; // Video element stays muted, audio routes through Web Audio
            videoEl.playbackRate = clip.speed;

            if (isScrubbing || Math.abs(videoEl.currentTime - localSourceTime) > 0.08) {
              const safeTime = Math.max(0, localSourceTime);
              if (isScrubbing && 'fastSeek' in videoEl && typeof (videoEl as any).fastSeek === 'function') {
                try {
                  (videoEl as any).fastSeek(safeTime);
                } catch {
                  if (!videoEl.seeking) videoEl.currentTime = safeTime;
                }
              } else if (!videoEl.seeking || !isScrubbing) {
                videoEl.currentTime = safeTime;
              }
            }

            if (playing && !isScrubbing && videoEl.paused) {
              videoEl.play().catch(() => {});
            } else if ((!playing || isScrubbing) && !videoEl.paused) {
              videoEl.pause();
            }
          } else {
            // Standby video element - kept inert
            if (!videoEl.paused) videoEl.pause();
          }
        }

        // Audio Pipeline
        const audioEl = audioElements.get(clip.id);
        if (audioEl) {
          connectAudioSourceSafe(audioEl);
          audioEl.playbackRate = clip.speed;
          audioEl.muted = isScrubbing || clip.muted || isTrackMuted;
          audioEl.volume = Math.max(0, Math.min(1, clip.volume / 100));

          if (isClipActive) {
            // Check drift against primary video master clock (resync if drift > 45ms)
            const masterClock = primaryMasterVideo ? primaryMasterVideo.currentTime : localSourceTime;
            const drift = Math.abs(audioEl.currentTime - masterClock);
            if (drift > 0.045 || isScrubbing) {
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
      });
    },
    [clips, tracks, mediaElements, audioElements, connectAudioSourceSafe, setMasterGainVolume]
  );

  // ==============================================================
  // 5. Master Timeline Clock & Playback RAF Loop
  // ==============================================================
  useEffect(() => {
    if (!isPlaying) {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      lastWallClockRef.current = null;
      syncHardwarePipeline(currentTimeRef.current, false, false);
      return;
    }

    // Unmute with 15ms smooth ramp when starting playback
    unlockAudioContext();
    setMasterGainVolume(1.0, 15);

    const tick = (now: number) => {
      if (!isPlayingRef.current) return;

      if (lastWallClockRef.current === null) {
        lastWallClockRef.current = now;
      }

      const deltaSec = (now - lastWallClockRef.current) / 1000;
      lastWallClockRef.current = now;

      const nextTime = currentTimeRef.current + deltaSec;

      if (nextTime >= totalDuration) {
        currentTimeRef.current = totalDuration;
        setIsPlaying(false);
        onFrameUpdateRef.current?.(totalDuration);
        syncHardwarePipeline(totalDuration, false, false);
        return;
      }

      currentTimeRef.current = nextTime;
      onFrameUpdateRef.current?.(nextTime);
      syncHardwarePipeline(nextTime, true, false);

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isPlaying, totalDuration, syncHardwarePipeline, unlockAudioContext, setMasterGainVolume]);

  const togglePlay = useCallback(() => {
    unlockAudioContext();
    setIsPlaying((prev) => !prev);
  }, [unlockAudioContext]);

  const seek = useCallback(
    (targetTime: number, isScrubbing: boolean = false) => {
      currentTimeRef.current = Math.max(0, Math.min(totalDuration, targetTime));
      syncHardwarePipeline(currentTimeRef.current, isPlayingRef.current, isScrubbing);
      onFrameUpdateRef.current?.(currentTimeRef.current);

      if (!isScrubbing && isPlayingRef.current) {
        setMasterGainVolume(1.0, 15);
      }
    },
    [totalDuration, syncHardwarePipeline, setMasterGainVolume]
  );

  return {
    isPlaying,
    currentTimeRef,
    togglePlay,
    setIsPlaying,
    seek,
    unlockAudioContext,
    syncHardwarePipeline,
  };
}
