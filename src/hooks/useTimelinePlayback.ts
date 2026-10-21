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
  const lastRafTimeRef = useRef<number | null>(null);
  const onFrameUpdateRef = useRef(onFrameUpdate);

  useEffect(() => {
    onFrameUpdateRef.current = onFrameUpdate;
  }, [onFrameUpdate]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Audio-Video Hard Sync (A/V Locking with 40ms drift threshold)
  const syncHardwareMedia = useCallback(
    (targetTime: number, playing: boolean, isScrubbing: boolean = false) => {
      // Find master primary video element if active
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

        // Video element sync
        const mediaEl = mediaElements.get(clip.id);
        if (mediaEl && mediaEl instanceof HTMLVideoElement) {
          mediaEl.playbackRate = clip.speed;
          mediaEl.preservesPitch = clip.preservePitch;
          mediaEl.muted = clip.muted || isTrackMuted;
          mediaEl.volume = Math.max(0, Math.min(1, clip.volume / 100));

          if (isClipActive) {
            if (isScrubbing || Math.abs(mediaEl.currentTime - localSourceTime) > 0.08) {
              mediaEl.currentTime = Math.max(0, localSourceTime);
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
    [clips, tracks, mediaElements, audioElements]
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
    },
    [totalDuration, syncHardwareMedia]
  );

  // Dedicated 60fps RequestAnimationFrame loop driven by unified currentTimeRef
  useEffect(() => {
    if (!isPlaying) {
      lastRafTimeRef.current = null;
      syncHardwareMedia(currentTimeRef.current, false, false);
      return;
    }

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
  }, [isPlaying, totalDuration, syncHardwareMedia, setIsPlaying]);

  return {
    currentTimeRef,
    seekTo,
    syncHardwareMedia,
  };
}
