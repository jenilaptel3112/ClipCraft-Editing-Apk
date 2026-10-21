import { useRef, useState, useCallback } from 'react';
import { TimelineClip } from '../types/editor';

interface UseScrubberGestureProps {
  timelineSpan: number;
  pxPerSec: number;
  clips: TimelineClip[];
  onSeek: (time: number, isScrubbing: boolean) => void;
  onSnapFeedback?: (snappedTime: number) => void;
}

export function useScrubberGesture({
  timelineSpan,
  pxPerSec,
  clips,
  onSeek,
  onSnapFeedback,
}: UseScrubberGestureProps) {
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [snappedTimestamp, setSnappedTimestamp] = useState<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Compute magnetic boundaries (in-points, out-points, transitions, zero)
  const getSnapPoints = useCallback((): number[] => {
    const points = [0];
    clips.forEach((clip) => {
      points.push(clip.startTime);
      points.push(clip.startTime + clip.duration);
      if (clip.transitionIn.type !== 'none' && clip.transitionIn.duration > 0) {
        points.push(clip.startTime + clip.transitionIn.duration);
      }
    });
    return Array.from(new Set(points)).sort((a, b) => a - b);
  }, [clips]);

  // Magnetic snap check with 10px threshold
  const applyMagneticSnap = useCallback(
    (rawTime: number): { time: number; didSnap: boolean } => {
      const snapThresholdSec = 10 / pxPerSec;
      const snapPoints = getSnapPoints();

      for (const p of snapPoints) {
        if (Math.abs(rawTime - p) <= snapThresholdSec) {
          return { time: p, didSnap: true };
        }
      }
      return { time: Math.max(0, Math.min(timelineSpan, rawTime)), didSnap: false };
    },
    [pxPerSec, getSnapPoints, timelineSpan]
  );

  const clientXToSeconds = useCallback(
    (clientX: number): number => {
      const container = containerRef.current;
      if (!container) return 0;
      const rect = container.getBoundingClientRect();
      const offsetX = clientX - rect.left + container.scrollLeft;
      return Math.max(0, Math.min(timelineSpan, offsetX / pxPerSec));
    },
    [timelineSpan, pxPerSec]
  );

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // Safe fallback
      }
    }
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).dataset.handle) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      isDraggingRef.current = true;
      setIsScrubbing(true);

      const rawSec = clientXToSeconds(e.clientX);
      const { time, didSnap } = applyMagneticSnap(rawSec);

      if (didSnap) {
        setSnappedTimestamp(time);
        triggerHaptic();
        if (onSnapFeedback) onSnapFeedback(time);
      } else {
        setSnappedTimestamp(null);
      }

      onSeek(+time.toFixed(2), true);
    },
    [clientXToSeconds, applyMagneticSnap, onSeek, onSnapFeedback]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      const rawSec = clientXToSeconds(e.clientX);
      const { time, didSnap } = applyMagneticSnap(rawSec);

      if (didSnap) {
        setSnappedTimestamp(time);
        triggerHaptic();
        if (onSnapFeedback) onSnapFeedback(time);
      } else {
        setSnappedTimestamp(null);
      }

      onSeek(+time.toFixed(2), true);
    },
    [clientXToSeconds, applyMagneticSnap, onSeek, onSnapFeedback]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsScrubbing(false);
      setSnappedTimestamp(null);

      const rawSec = clientXToSeconds(e.clientX);
      const { time } = applyMagneticSnap(rawSec);
      // Final release seek: not scrubbing anymore
      onSeek(+time.toFixed(2), false);
    },
    [clientXToSeconds, applyMagneticSnap, onSeek]
  );

  return {
    containerRef,
    isScrubbing,
    snappedTimestamp,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
