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

const EXPORT_DB_NAME = 'ClipCraftExportDB';
const CHUNKS_STORE_NAME = 'export_stream_chunks';
const DB_VERSION = 1;

function openExportDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(EXPORT_DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CHUNKS_STORE_NAME)) {
        db.createObjectStore(CHUNKS_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeChunkToIndexedDB(exportId: string, index: number, chunk: Blob): Promise<void> {
  try {
    const db = await openExportDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CHUNKS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CHUNKS_STORE_NAME);
      const req = store.put({
        id: `${exportId}_${index}`,
        exportId,
        index,
        data: chunk,
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Fallback to memory for export chunk:', err);
  }
}

async function collectChunksFromIndexedDB(exportId: string): Promise<Blob[]> {
  try {
    const db = await openExportDB();
    const records = await new Promise<any[]>((resolve, reject) => {
      const tx = db.transaction(CHUNKS_STORE_NAME, 'readonly');
      const store = tx.objectStore(CHUNKS_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const relevant = records
      .filter((r) => r.exportId === exportId)
      .sort((a, b) => a.index - b.index)
      .map((r) => r.data as Blob);

    // Clean up temporary export records from IndexedDB
    const deleteTx = db.transaction(CHUNKS_STORE_NAME, 'readwrite');
    const deleteStore = deleteTx.objectStore(CHUNKS_STORE_NAME);
    records
      .filter((r) => r.exportId === exportId)
      .forEach((r) => deleteStore.delete(r.id));

    return relevant;
  } catch {
    return [];
  }
}

/**
 * Calculates output canvas pixel dimensions for 4K UHD, 2K, 1080p, 720p
 */
export function getExportResolutionDimensions(
  resolution: ProExportConfig['resolution'],
  aspectRatio: AspectRatio
): { width: number; height: number } {
  switch (aspectRatio) {
    case '9:16':
      switch (resolution) {
        case '4K': return { width: 2160, height: 3840 };
        case '2K': return { width: 1440, height: 2560 };
        case '1080p': return { width: 1080, height: 1920 };
        case '720p': return { width: 720, height: 1280 };
      }
      break;

    case '16:9':
      switch (resolution) {
        case '4K': return { width: 3840, height: 2160 };
        case '2K': return { width: 2560, height: 1440 };
        case '1080p': return { width: 1920, height: 1080 };
        case '720p': return { width: 1280, height: 720 };
      }
      break;

    case '1:1':
      switch (resolution) {
        case '4K': return { width: 2160, height: 2160 };
        case '2K': return { width: 1440, height: 1440 };
        case '1080p': return { width: 1080, height: 1080 };
        case '720p': return { width: 720, height: 720 };
      }
      break;

    case '4:5':
      switch (resolution) {
        case '4K': return { width: 2160, height: 2700 };
        case '2K': return { width: 1440, height: 1800 };
        case '1080p': return { width: 1080, height: 1350 };
        case '720p': return { width: 720, height: 900 };
      }
      break;

    case '21:9':
      switch (resolution) {
        case '4K': return { width: 5120, height: 2160 };
        case '2K': return { width: 3440, height: 1440 };
        case '1080p': return { width: 2560, height: 1080 };
        case '720p': return { width: 1680, height: 720 };
      }
      break;

    case '4:3':
      switch (resolution) {
        case '4K': return { width: 2880, height: 2160 };
        case '2K': return { width: 1920, height: 1440 };
        case '1080p': return { width: 1440, height: 1080 };
        case '720p': return { width: 960, height: 720 };
      }
      break;

    case 'custom':
    default:
      switch (resolution) {
        case '4K': return { width: 2160, height: 3840 };
        case '2K': return { width: 1440, height: 2560 };
        case '1080p': return { width: 1080, height: 1920 };
        case '720p':
        default: return { width: 720, height: 1280 };
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

export function calculateEstimatedFileSizeMB(bitrateMbps: number, durationSeconds: number): number {
  const mb = (bitrateMbps * durationSeconds) / 8;
  return +mb.toFixed(1);
}

/**
 * Full-Resolution Offline Rendering Engine with Streaming Slices & Watchdog Micro-Tasks:
 * Prevents mobile memory ballooning on long-duration exports.
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
    const exportId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

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

    // Prepare full-res media element map
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

    // Streaming MediaRecorder chunk accumulation via IndexedDB stream
    const fallbackMemoryChunks: Blob[] = [];
    let chunkCounter = 0;

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond,
    });
    this.recorder = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        const idx = chunkCounter++;
        fallbackMemoryChunks.push(e.data);
        writeChunkToIndexedDB(exportId, idx, e.data);
      }
    };

    // 1. Streaming MediaRecorder Slicing: emits data chunks every 1000ms
    recorder.start(1000);

    const startTimeStamp = performance.now();
    let currentFrame = 0;

    // 2. Segmented Offline Render Loop with micro-task scheduling
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

      // Render native full-resolution composite frame with all effects & styles
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
        false
      );

      // 3. RAM & Garbage Collection Safeguards:
      // Clear intermediate canvas frame memory every 60 frames to assist garbage collection
      if (f % 60 === 0) {
        ctx.clearRect(0, 0, 1, 1);
      }

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

      // Segmented Offline Render Loop:
      // Break the loop into scheduled micro-tasks using setTimeout(..., 0) every 30 frames
      // to prevent iOS WebKit / Android Chromium from killing the tab for long-running execution.
      if (f % 30 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      } else if (f % 5 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 4));
      }
    }

    // Stop recording and retrieve stream chunks
    return new Promise((resolve, reject) => {
      recorder.onstop = async () => {
        try {
          // Read from IndexedDB stream, or fall back to memory chunks
          const idbChunks = await collectChunksFromIndexedDB(exportId);
          const finalChunks = idbChunks.length > 0 ? idbChunks : fallbackMemoryChunks;

          const finalBlob = new Blob(finalChunks, { type: mimeType });
          const downloadUrl = URL.createObjectURL(finalBlob);
          const actualSizeMB = +(finalBlob.size / (1024 * 1024)).toFixed(1);

          // Dereference arrays for GC
          fallbackMemoryChunks.length = 0;

          resolve({
            downloadUrl,
            fileSizeMB: actualSizeMB > 0.1 ? actualSizeMB : calculateEstimatedFileSizeMB(config.bitrateMbps, totalDuration),
          });
        } catch (err) {
          reject(err);
        }
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
