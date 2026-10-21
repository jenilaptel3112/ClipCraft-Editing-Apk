import { useCallback, useRef } from 'react';

export interface SafeMediaMetadata {
  file: File;
  objectUrl: string;
  name: string;
  mediaType: 'video' | 'image' | 'audio';
  duration: number;
  width: number;
  height: number;
  isLongDuration: boolean;
  videoElement?: HTMLVideoElement;
  audioElement?: HTMLAudioElement;
  imageElement?: HTMLImageElement;
}

export function useSafeVideoLoader() {
  const objectUrlsRef = useRef<Set<string>>(new Set());

  // Track and create managed Object URL
  const createManagedUrl = useCallback((file: File): string => {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.add(url);
    return url;
  }, []);

  const revokeManagedUrl = useCallback((url: string) => {
    if (objectUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  }, []);

  const revokeAllManagedUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    objectUrlsRef.current.clear();
  }, []);

  /**
   * Safe asynchronous loader for any video file on mobile WebKit and Chromium.
   * Enforces critical mobile video attributes, double metadata/canplay lock,
   * texture awakening handshake, and structured error diagnostics.
   */
  const loadVideoFile = useCallback(
    (file: File): Promise<SafeMediaMetadata> => {
      return new Promise((resolve, reject) => {
        const objectUrl = createManagedUrl(file);

        // 1. Critical Mobile Video Attributes
        const video = document.createElement('video');
        video.playsInline = true;
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true; // Mandatory on mobile to bypass autoplay restriction
        video.preload = 'auto';
        video.crossOrigin = 'anonymous';

        let isResolved = false;
        let metadataLoaded = false;
        let canPlayFired = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const checkAndResolve = async () => {
          if (isResolved) return;
          if (metadataLoaded && canPlayFired) {
            isResolved = true;
            if (timeoutId) clearTimeout(timeoutId);

            // 3. Mobile Video Texture Awakening Handshake:
            // Mobile WebKit / Chromium often keep the video texture black until
            // an explicit play -> pause or tiny seek (0.001s) triggers the hardware decoder pipeline.
            try {
              video.currentTime = 0.001;
              const playPromise = video.play();
              if (playPromise !== undefined) {
                await playPromise.then(() => video.pause()).catch(() => {
                  // Muted play failure fallback
                });
              }
            } catch {
              // Ignore mobile autoplay restrictions
            }

            const dur = video.duration && !isNaN(video.duration) && isFinite(video.duration)
              ? video.duration
              : 5.0;
            const w = video.videoWidth > 0 ? video.videoWidth : 1920;
            const h = video.videoHeight > 0 ? video.videoHeight : 1080;

            resolve({
              file,
              objectUrl,
              name: file.name,
              mediaType: 'video',
              duration: dur,
              width: w,
              height: h,
              isLongDuration: dur > 300,
              videoElement: video,
            });
          }
        };

        const handleMetadata = () => {
          metadataLoaded = true;
          checkAndResolve();
        };

        const handleCanPlay = () => {
          canPlayFired = true;
          checkAndResolve();
        };

        const handleError = () => {
          if (isResolved) return;
          isResolved = true;
          if (timeoutId) clearTimeout(timeoutId);

          let errorMsg = 'Failed to load video file.';
          if (video.error) {
            if (video.error.code === 3) {
              errorMsg = 'Media decode error: codec not supported by hardware decoder.';
            } else if (video.error.code === 4) {
              errorMsg = 'Media format not supported by browser.';
            }
          }
          console.warn(`Video loader warning: ${errorMsg}`, video.error);

          // Return safe fallback so editor never crashes or leaves user stuck
          resolve({
            file,
            objectUrl,
            name: file.name,
            mediaType: 'video',
            duration: 10.0,
            width: 1920,
            height: 1080,
            isLongDuration: false,
            videoElement: video,
          });
        };

        video.addEventListener('loadedmetadata', handleMetadata, { once: true });
        video.addEventListener('canplay', handleCanPlay, { once: true });
        video.addEventListener('error', handleError, { once: true });

        video.src = objectUrl;
        video.load();

        // 6-second timeout fallback to prevent hanging on corrupt or slow files
        timeoutId = setTimeout(() => {
          if (!isResolved) {
            metadataLoaded = true;
            canPlayFired = true;
            checkAndResolve();
          }
        }, 6000);
      });
    },
    [createManagedUrl]
  );

  /**
   * Safe loader for audio files with metadata lock
   */
  const loadAudioFile = useCallback(
    (file: File): Promise<SafeMediaMetadata> => {
      return new Promise((resolve) => {
        const objectUrl = createManagedUrl(file);
        const audio = new Audio();
        audio.preload = 'auto';

        let resolved = false;
        const handleSuccess = () => {
          if (resolved) return;
          resolved = true;
          const dur = audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)
            ? audio.duration
            : 30.0;
          resolve({
            file,
            objectUrl,
            name: file.name,
            mediaType: 'audio',
            duration: dur,
            width: 0,
            height: 0,
            isLongDuration: dur > 300,
            audioElement: audio,
          });
        };

        audio.addEventListener('loadedmetadata', handleSuccess, { once: true });
        audio.addEventListener('canplay', handleSuccess, { once: true });
        audio.addEventListener('error', handleSuccess, { once: true });
        audio.src = objectUrl;

        setTimeout(handleSuccess, 4000);
      });
    },
    [createManagedUrl]
  );

  /**
   * Safe loader for image files
   */
  const loadImageFile = useCallback(
    (file: File): Promise<SafeMediaMetadata> => {
      return new Promise((resolve) => {
        const objectUrl = createManagedUrl(file);
        const img = new Image();
        img.onload = () => {
          resolve({
            file,
            objectUrl,
            name: file.name,
            mediaType: 'image',
            duration: 5.0,
            width: img.naturalWidth || 1080,
            height: img.naturalHeight || 1920,
            isLongDuration: false,
            imageElement: img,
          });
        };
        img.onerror = () => {
          resolve({
            file,
            objectUrl,
            name: file.name,
            mediaType: 'image',
            duration: 5.0,
            width: 1080,
            height: 1920,
            isLongDuration: false,
            imageElement: img,
          });
        };
        img.src = objectUrl;
        setTimeout(() => {
          resolve({
            file,
            objectUrl,
            name: file.name,
            mediaType: 'image',
            duration: 5.0,
            width: 1080,
            height: 1920,
            isLongDuration: false,
            imageElement: img,
          });
        }, 3000);
      });
    },
    [createManagedUrl]
  );

  return {
    loadVideoFile,
    loadAudioFile,
    loadImageFile,
    revokeManagedUrl,
    revokeAllManagedUrls,
  };
}
