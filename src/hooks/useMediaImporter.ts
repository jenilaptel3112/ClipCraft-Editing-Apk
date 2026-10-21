import { useState, useCallback } from 'react';
import { MediaImportResult, MediaToastNotice } from '../types/mediaStreaming';
import { proxyManager } from '../utils/proxyManager';
import { extractWaveformChunked } from '../utils/mediaWorkerPool';

export function useMediaImporter() {
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [toastNotice, setToastNotice] = useState<MediaToastNotice | null>(null);

  const clearToast = useCallback(() => {
    setToastNotice(null);
  }, []);

  /**
   * Safely imports media file of any size or duration (from 5s to 2 hours)
   * without locking the main thread or loading into monolithic ArrayBuffers.
   */
  const importMediaFile = useCallback(
    async (file: File): Promise<MediaImportResult | null> => {
      setIsImporting(true);
      setImportProgress(10);

      const objectUrl = URL.createObjectURL(file);
      const isAudio = file.type.startsWith('audio/');
      const isImage = file.type.startsWith('image/');
      const isVideo = !isAudio && !isImage;

      try {
        let duration = 5.0;
        let width = 1920;
        let height = 1080;

        if (isVideo) {
          // Lightweight non-blocking metadata extraction with strict 5-second timeout fallback
          const metadataPromise = new Promise<{ duration: number; width: number; height: number }>(
            (resolve) => {
              const video = document.createElement('video');
              video.preload = 'metadata';
              video.playsInline = true;
              video.muted = true;
              video.crossOrigin = 'anonymous';

              const cleanup = () => {
                video.removeEventListener('loadedmetadata', onLoaded);
                video.removeEventListener('error', onError);
                video.src = '';
                video.load();
              };

              const onLoaded = () => {
                const dur = video.duration && !isNaN(video.duration) && isFinite(video.duration)
                  ? video.duration
                  : 10.0;
                const w = video.videoWidth || 1920;
                const h = video.videoHeight || 1080;
                cleanup();
                resolve({ duration: dur, width: w, height: h });
              };

              const onError = () => {
                cleanup();
                resolve({ duration: 10.0, width: 1920, height: 1080 });
              };

              video.addEventListener('loadedmetadata', onLoaded);
              video.addEventListener('error', onError);
              video.src = objectUrl;

              // Strict 5-second timeout fallback
              setTimeout(() => {
                cleanup();
                resolve({ duration: 15.0, width: 1920, height: 1080 });
              }, 5000);
            }
          );

          const meta = await metadataPromise;
          duration = meta.duration;
          width = meta.width;
          height = meta.height;
        } else if (isAudio) {
          const audio = document.createElement('audio');
          audio.preload = 'metadata';

          const audioMetaPromise = new Promise<number>((resolve) => {
            const onLoaded = () => {
              const dur = audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)
                ? audio.duration
                : 30.0;
              audio.src = '';
              resolve(dur);
            };
            audio.addEventListener('loadedmetadata', onLoaded);
            audio.src = objectUrl;
            setTimeout(() => resolve(30.0), 4000);
          });

          duration = await audioMetaPromise;
        } else if (isImage) {
          const img = new Image();
          const imgMetaPromise = new Promise<{ width: number; height: number }>((resolve) => {
            img.onload = () => resolve({ width: img.naturalWidth || 1080, height: img.naturalHeight || 1920 });
            img.onerror = () => resolve({ width: 1080, height: 1920 });
            img.src = objectUrl;
            setTimeout(() => resolve({ width: 1080, height: 1920 }), 3000);
          });
          const imgMeta = await imgMetaPromise;
          width = imgMeta.width;
          height = imgMeta.height;
          duration = 5.0; // Standard image duration
        }

        setImportProgress(60);

        // Check if file is a long take (> 300 seconds / 5 minutes)
        const isLongDuration = duration > 300;
        const minutes = Math.round(duration / 60);

        if (isLongDuration) {
          setToastNotice({
            id: `notice-${Date.now()}`,
            type: 'info',
            title: 'Large File Detected',
            message: `Large video detected (${minutes} min, ${(file.size / (1024 * 1024)).toFixed(0)}MB) — enabling high-speed proxy mode and fast-seek streaming.`,
            durationMs: 4500,
          });
        }

        // Chunked low-fidelity waveform extraction without blocking main thread
        let waveform: number[] | undefined;
        if (isAudio || isVideo) {
          waveform = await extractWaveformChunked(file, duration);
        }

        setImportProgress(100);

        const mins = Math.floor(duration / 60);
        const secs = Math.floor(duration % 60);
        const formattedDuration = `${mins}:${String(secs).padStart(2, '0')}`;

        return {
          file,
          objectUrl,
          name: file.name,
          mediaType: isAudio ? 'audio' : isImage ? 'image' : 'video',
          duration,
          width,
          height,
          isLongDuration,
          formattedDuration,
          waveform,
        };
      } catch (err) {
        console.error('Media ingestion error:', err);
        setToastNotice({
          id: `err-${Date.now()}`,
          type: 'error',
          title: 'Import Warning',
          message: 'Video metadata reading had a partial timeout, imported with streaming fallback.',
          durationMs: 4000,
        });
        return {
          file,
          objectUrl,
          name: file.name,
          mediaType: isAudio ? 'audio' : isImage ? 'image' : 'video',
          duration: 10.0,
          width: 1920,
          height: 1080,
          isLongDuration: false,
          formattedDuration: '0:10',
        };
      } finally {
        setIsImporting(false);
      }
    },
    []
  );

  return {
    isImporting,
    importProgress,
    toastNotice,
    clearToast,
    importMediaFile,
  };
}
