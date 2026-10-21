import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TimelineClip } from '../types/editor';
import { thumbnailSnatcher, thumbnailLRUCache } from '../utils/mediaWorkerPool';

interface UseVirtualizedTimelineProps {
  scrollLeft: number;
  viewportWidth: number;
  pxPerSec: number;
  totalDuration: number;
  clips: TimelineClip[];
}

export function useVirtualizedTimeline({
  scrollLeft,
  viewportWidth,
  pxPerSec,
  totalDuration,
  clips,
}: UseVirtualizedTimelineProps) {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const requestedThumbnailsRef = useRef<Set<string>>(new Set());

  // Buffer range in pixels (extra 300px on left and right for smooth scroll anticipation)
  const bufferPx = 300;

  // Calculate visible time window
  const visibleStartTime = Math.max(0, (scrollLeft - bufferPx) / pxPerSec);
  const visibleEndTime = Math.min(totalDuration, (scrollLeft + viewportWidth + bufferPx) / pxPerSec);

  // Filter only clips that fall within or overlap the visible window
  const visibleClips = useMemo(() => {
    return clips.filter((clip) => {
      const clipStart = clip.startTime;
      const clipEnd = clip.startTime + clip.duration;
      return clipEnd >= visibleStartTime && clipStart <= visibleEndTime;
    });
  }, [clips, visibleStartTime, visibleEndTime]);

  // Virtual time ruler tick marks: only generate ticks inside visible range to prevent DOM ballooning
  const virtualRulerTicks = useMemo(() => {
    const ticks: { sec: number; x: number; isMajor: boolean }[] = [];
    // Adaptive step: if timeline is very long, step every 1s, 2s, 5s or 10s based on pxPerSec
    const step = pxPerSec >= 40 ? 1 : pxPerSec >= 20 ? 2 : 5;

    const startSec = Math.max(0, Math.floor(visibleStartTime / step) * step);
    const endSec = Math.min(Math.ceil(totalDuration), Math.ceil(visibleEndTime / step) * step + step);

    for (let s = startSec; s <= endSec; s += step) {
      ticks.push({
        sec: s,
        x: s * pxPerSec,
        isMajor: true,
      });
    }
    return ticks;
  }, [visibleStartTime, visibleEndTime, totalDuration, pxPerSec]);

  // Lazy Thumbnail generation: request thumbnails strictly for visible clips
  const requestVisibleThumbnails = useCallback(() => {
    visibleClips.forEach((clip) => {
      if (clip.mediaType !== 'video' || !clip.mediaUrl) return;

      // Sample 1 to 4 thumbnail intervals across the clip duration that are visible
      const intervalSec = Math.max(3, clip.duration / 4);
      const startT = Math.max(clip.startTime, visibleStartTime);
      const endT = Math.min(clip.startTime + clip.duration, visibleEndTime);

      for (let t = startT; t <= endT; t += intervalSec) {
        const localSourceTime = clip.sourceStartOffset + (t - clip.startTime) * clip.speed;
        const key = `${clip.id}_${Math.round(localSourceTime * 2) / 2}`;

        // Check cache first
        const cachedUrl = thumbnailLRUCache.get(key);
        if (cachedUrl) {
          setThumbnails((prev) => (prev[key] === cachedUrl ? prev : { ...prev, [key]: cachedUrl }));
          continue;
        }

        // Avoid duplicate requests
        if (requestedThumbnailsRef.current.has(key)) continue;
        requestedThumbnailsRef.current.add(key);

        thumbnailSnatcher
          .requestThumbnail(clip.mediaUrl, localSourceTime, clip.id)
          .then((url) => {
            if (url) {
              setThumbnails((prev) => ({ ...prev, [key]: url }));
            }
          })
          .catch(() => {});
      }
    });
  }, [visibleClips, visibleStartTime, visibleEndTime]);

  useEffect(() => {
    const timer = setTimeout(() => {
      requestVisibleThumbnails();
    }, 50);
    return () => clearTimeout(timer);
  }, [requestVisibleThumbnails]);

  return {
    visibleStartTime,
    visibleEndTime,
    visibleClips,
    virtualRulerTicks,
    thumbnails,
  };
}
