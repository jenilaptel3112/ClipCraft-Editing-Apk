import {
  AspectRatio,
  FitMode,
  TimelineClip,
  TrackMeta,
  ProExportConfig,
  ExportProgressState,
} from '../types/editor';
import { renderCompositeFrame } from './canvasRenderer';
import { proxyManager } from './proxyManager';

export interface RenderOfflineProgressCallback {
  (state: ExportProgressState): void;
}

/**
 * Calculates output canvas pixel dimensions for 4K UHD, 2K, 1080p, 720p
 * based on selected aspect ratio (9:16 vertical, 16:9 widescreen, 1:1 square, 4:5 portrait)
 */
export function getExportResolutionDimensions(
  resolution: ProExportConfig['resolution'],
  aspectRatio: AspectRatio
): { width: number; height: number } {
  switch (aspectRatio) {
    case '9:16':
      switch (resolution) {
        case '4K':
          return { width: 2160, height: 3840 };
        case '2K':
          return { width: 1440, height: 2560 };
        case '1080p':
          return { width: 1080, height: 1920 };
        case '720p':
          return { width: 720, height: 1280 };
      }
      break;

    case '16:9':
      switch (resolution) {
        case '4K':
          return { width: 3840, height: 2160 };
        case '2K':
          return { width: 2560, height: 1440 };
        case '1080p':
          return { width: 1920, height: 1080 };
        case '720p':
          return { width: 1280, height: 720 };
      }
      break;

    case '1:1':
      switch (resolution) {
        case '4K':
          return { width: 2160, height: 2160 };
        case '2K':
          return { width: 1440, height: 1440 };
        case '1080p':
          return { width: 1080, height: 1080 };
        case '720p':
          return { width: 720, height: 720 };
      }
      break;

    case '4:5':
      switch (resolution) {
        case '4K':
          return { width: 2160, height: 2700 };
        case '2K':
          return { width: 1440, height: 1800 };
        case '1080p':
          return { width: 1080, height: 1350 };
        case '720p':
          return { width: 720, height: 900 };
      }
      break;

    case '21:9':
      switch (resolution) {
        case '4K':
          return { width: 5120, height: 2160 };
        case '2K':
          return { width: 3440, height: 1440 };
        case '1080p':
          return { width: 2560, height: 1080 };
        case '720p':
          return { width: 1680, height: 720 };
      }
      break;

    case '4:3':
      switch (resolution) {
        case '4K':
          return { width: 2880, height: 2160 };
        case '2K':
          return { width: 1920, height: 1440 };
        case '1080p':
          return { width: 1440, height: 1080 };
        case '720p':
          return { width: 960, height: 720 };
      }
      break;

    case 'custom':
    default:
      switch (resolution) {
        case '4K':
          return { width: 2160, height: 3840 };
        case '2K':
          return { width: 1440, height: 2560 };
        case '1080p':
          return { width: 1080, height: 1920 };
        case '720p':
        default:
          return { width: 720, height: 1280 };
      }
  }

  return { width: 1080, height: 1920 };
}

/**
 * Checks supported browser codecs for MP4 vs WebM
 */
export function getBestSupportedCodec(format: 'mp4' | 'webm'): { mimeType: string; isSupported: boolean } {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return { mimeType: 'video/webm', isSupported: true };
  }

  if (format === 'mp4') {
    const candidates = [
      'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
      'video/mp4; codecs="avc1.4D401F"',
      'video/mp4',
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) {
        return { mimeType: c, isSupported: true };
      }
    }
  }

  // WebM codecs
  const webmCandidates = [
    'video/webm; codecs="vp9, opus"',
    'video/webm; codecs=vp9',
    'video/webm; codecs=vp8',
    'video/webm',
  ];

  for (const w of webmCandidates) {
    if (MediaRecorder.isTypeSupported(w)) {
      return { mimeType: w, isSupported: true };
    }
  }

  return { mimeType: 'video/webm', isSupported: false };
}

/**
 * Calculates estimated file size in MB:
 * (Bitrate in Mbps × Duration in seconds) / 8
 */
export function calculateEstimatedFileSizeMB(bitrateMbps: number, durationSeconds: number): number {
  const mb = (bitrateMbps * durationSeconds) / 8;
  return +mb.toFixed(1);
}

/**
 * Full-Resolution Offline Rendering Engine:
 * Steps frame-by-frame through timeline at exact target FPS interval,
 * painting full-res 4K/2K/1080p frames onto offline canvas,
 * and feeding directly to MediaRecorder with custom videoBitsPerSecond.
 */
export class OfflineExportPipeline {
  private isCancelled: boolean = false;
  private recorder: MediaRecorder | null = null;

  public cancel() {
    this.isCancelled = true;
    if (this.recorder && this.recorder.state !== 'inactive') {
      try {
        this.recorder.stop();
      } catch {}
    }
  }

  public async renderTimeline(
    clips: TimelineClip[],
    tracks: TrackMeta[],
    aspectRatio: AspectRatio,
    fitMode: FitMode,
    totalDuration: number,
    config: ProExportConfig,
    onProgress: RenderOfflineProgressCallback
  ): Promise<{ downloadUrl: string; fileSizeMB: number }> {
    this.isCancelled = false;

    const { width: exportW, height: exportH } = getExportResolutionDimensions(
      config.resolution,
      aspectRatio
    );

    // Create high-res offline canvas
    const canvas = document.createElement('canvas');
    canvas.width = exportW;
    canvas.height = exportH;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

    if (!ctx) {
      throw new Error('Failed to create offline export canvas context');
    }

    // Prepare full-res media element map (switches from low-res proxy to native 4K masters)
    const exportMediaElements = new Map<string, HTMLVideoElement | HTMLImageElement>();
    clips.forEach((clip) => {
      const orig = proxyManager.getOriginalElement(clip.id);
      if (orig) {
        exportMediaElements.set(clip.id, orig);
      }
    });

    const targetFps = config.fps;
    const totalFrames = Math.max(1, Math.round(totalDuration * targetFps));
    const frameIntervalSec = 1 / targetFps;

    // Setup MediaRecorder with chosen bitrate & codec
    const { mimeType } = getBestSupportedCodec(config.format);
    const videoBitsPerSecond = Math.round(config.bitrateMbps * 1_000_000);

    const stream = canvas.captureStream(targetFps);
    const chunks: BlobPart[] = [];

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond,
    });
    this.recorder = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.start(100);

    const startTimeStamp = performance.now();
    let currentFrame = 0;

    // Step frame by frame
    for (let f = 0; f < totalFrames; f++) {
      if (this.isCancelled) {
        throw new Error('Export cancelled by user');
      }

      currentFrame = f;
      const playheadTime = f * frameIntervalSec;

      // Sync video media sources to exact frame time
      exportMediaElements.forEach((el) => {
        if (el instanceof HTMLVideoElement) {
          el.currentTime = Math.max(0, playheadTime);
        }
      });

      // Render native full-resolution composite frame with all CapCut effects & color grades
      renderCompositeFrame(
        ctx,
        exportW,
        exportH,
        playheadTime,
        clips,
        tracks,
        exportMediaElements,
        fitMode,
        null,
        false,
        false // Non-draft: crisp full 4K render
      );

      // Calculate progress and estimated time remaining
      const pct = Math.min(100, Math.round((currentFrame / totalFrames) * 100));
      const elapsedMs = performance.now() - startTimeStamp;
      const avgMsPerFrame = elapsedMs / Math.max(1, currentFrame);
      const remainingFrames = totalFrames - currentFrame;
      const estSecRemaining = Math.max(1, Math.round((remainingFrames * avgMsPerFrame) / 1000));

      onProgress({
        currentFrame: f + 1,
        totalFrames,
        percentage: pct,
        statusText: `Rendering frame ${f + 1} of ${totalFrames} (${config.resolution} @ ${config.fps}fps)...`,
        estimatedSecondsRemaining: estSecRemaining,
      });

      // Yield event loop slightly every 4 frames so UI remains responsive and progress updates
      if (f % 4 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 8));
      }
    }

    // Stop recording and wait for final blob
    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: mimeType });
        const downloadUrl = URL.createObjectURL(finalBlob);
        const actualSizeMB = +(finalBlob.size / (1024 * 1024)).toFixed(1);
        resolve({
          downloadUrl,
          fileSizeMB: actualSizeMB > 0.1 ? actualSizeMB : calculateEstimatedFileSizeMB(config.bitrateMbps, totalDuration),
        });
      };

      recorder.onerror = (err) => {
        reject(err);
      };

      try {
        recorder.stop();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const offlineExportPipeline = new OfflineExportPipeline();
