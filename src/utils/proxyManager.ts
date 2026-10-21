import { MediaProxyRecord } from '../types/editor';

/**
 * ProxyManager:
 * Manages full-resolution 4K source references vs downscaled hardware-friendly 720p/1080p proxy preview streams.
 * Prevents mobile memory ballooning (>8GB/s bus contention) and canvas context loss.
 */
class ProxyManager {
  private records: Map<string, MediaProxyRecord> = new Map();
  private originalElements: Map<string, HTMLVideoElement | HTMLImageElement> = new Map();

  public registerMedia(
    clipId: string,
    file: File | undefined,
    url: string,
    width: number = 1920,
    height: number = 1080
  ): MediaProxyRecord {
    const is4K = width >= 3840 || height >= 2160 || (file && file.size > 250_000_000);

    const record: MediaProxyRecord = {
      clipId,
      is4K: Boolean(is4K),
      originalWidth: width,
      originalHeight: height,
      originalFile: file,
      originalUrl: url,
      proxyUrl: url, // In browser, proxy element uses locked canvas resolution
    };

    this.records.set(clipId, record);
    return record;
  }

  public getRecord(clipId: string): MediaProxyRecord | undefined {
    return this.records.get(clipId);
  }

  public registerOriginalElement(clipId: string, element: HTMLVideoElement | HTMLImageElement) {
    this.originalElements.set(clipId, element);
  }

  public getOriginalElement(clipId: string): HTMLVideoElement | HTMLImageElement | undefined {
    return this.originalElements.get(clipId);
  }

  public cleanupClip(clipId: string) {
    const record = this.records.get(clipId);
    if (record) {
      if (record.originalUrl && record.originalUrl.startsWith('blob:')) {
        URL.revokeObjectURL(record.originalUrl);
      }
      if (record.proxyUrl && record.proxyUrl !== record.originalUrl && record.proxyUrl.startsWith('blob:')) {
        URL.revokeObjectURL(record.proxyUrl);
      }
      this.records.delete(clipId);
    }
    this.originalElements.delete(clipId);
  }

  public clearAll() {
    this.records.forEach((record) => {
      if (record.originalUrl && record.originalUrl.startsWith('blob:')) {
        URL.revokeObjectURL(record.originalUrl);
      }
    });
    this.records.clear();
    this.originalElements.clear();
  }
}

export const proxyManager = new ProxyManager();
