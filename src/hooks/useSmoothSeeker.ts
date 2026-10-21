import { useRef, useCallback, useEffect } from 'react';

interface SeekTargetElement {
  currentTime: number;
  seeking?: boolean;
  fastSeek?: (time: number) => void;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

interface UseSmoothSeekerOptions {
  onExactSeekComplete?: (time: number) => void;
}

export function useSmoothSeeker(options?: UseSmoothSeekerOptions) {
  const pendingSeekTimeRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const activeVideoRef = useRef<SeekTargetElement | null>(null);
  const isSeekingLockedRef = useRef<boolean>(false);

  // Setup 'seeked' listener to process pending throttled seeks
  const registerMediaSeekListener = useCallback((videoElement: SeekTargetElement | null) => {
    if (activeVideoRef.current && activeVideoRef.current.removeEventListener) {
      activeVideoRef.current.removeEventListener('seeked', handleSeeked);
    }

    activeVideoRef.current = videoElement;

    if (videoElement && videoElement.addEventListener) {
      videoElement.addEventListener('seeked', handleSeeked);
    }
  }, []);

  const handleSeeked = useCallback(() => {
    isSeekingLockedRef.current = false;
    if (pendingSeekTimeRef.current !== null && activeVideoRef.current) {
      const nextTime = pendingSeekTimeRef.current;
      pendingSeekTimeRef.current = null;
      performSeek(activeVideoRef.current, nextTime, true);
    }
  }, []);

  const performSeek = (element: SeekTargetElement, targetTime: number, isScrubbing: boolean) => {
    const safeTime = Math.max(0, targetTime);

    if (isScrubbing) {
      // Keyframe-aware fast seek for interactive high-frequency scrubbing
      if (typeof element.fastSeek === 'function') {
        try {
          element.fastSeek(safeTime);
          return;
        } catch {
          // Fall back to currentTime
        }
      }
      element.currentTime = safeTime;
    } else {
      // Frame-exact seek when scrubber is released or on static drop-in
      element.currentTime = safeTime;
      options?.onExactSeekComplete?.(safeTime);
    }
  };

  /**
   * Smoothly dispatches a seek request to a video element.
   * If element is already seeking, queues in pendingSeekTimeRef to prevent browser decoder thread freeze.
   */
  const smoothSeek = useCallback(
    (element: SeekTargetElement, targetTime: number, isScrubbing: boolean) => {
      activeVideoRef.current = element;

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        // Active seek lock check
        if (element.seeking || isSeekingLockedRef.current) {
          pendingSeekTimeRef.current = targetTime;
          return;
        }

        isSeekingLockedRef.current = true;
        performSeek(element, targetTime, isScrubbing);
      });
    },
    []
  );

  /**
   * Finalizes seek when user ends touch / drag gesture, forcing frame-exact alignment
   */
  const finalizeSeek = useCallback((element: SeekTargetElement, targetTime: number) => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    pendingSeekTimeRef.current = null;
    isSeekingLockedRef.current = false;
    performSeek(element, targetTime, false);
  }, []);

  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (activeVideoRef.current?.removeEventListener) {
        activeVideoRef.current.removeEventListener('seeked', handleSeeked);
      }
    };
  }, [handleSeeked]);

  return {
    smoothSeek,
    finalizeSeek,
    registerMediaSeekListener,
  };
}
