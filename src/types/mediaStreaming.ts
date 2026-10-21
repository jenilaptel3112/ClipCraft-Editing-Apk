export interface ClipSegment {
  id: string;
  sourceId: string; // References master long file
  sourceStartTime: number; // In-point on master media in seconds
  sourceEndTime: number;   // Out-point on master media in seconds
  timelineStartTime: number; // Where it sits on the project timeline
  duration: number; // (sourceEndTime - sourceStartTime)
}

export interface MediaImportResult {
  file: File;
  objectUrl: string;
  name: string;
  mediaType: 'video' | 'audio' | 'image';
  duration: number;
  width: number;
  height: number;
  isLongDuration: boolean; // Flagged if > 300s (5 minutes)
  formattedDuration: string;
  waveform?: number[];
  initialThumbUrl?: string;
  codec?: string;
}

export interface VirtualViewportWindow {
  scrollLeft: number;
  viewportWidth: number;
  visibleStartTime: number;
  visibleEndTime: number;
  pxPerSec: number;
}

export interface FilmstripThumbnail {
  id: string;
  timeSec: number;
  blobUrl: string;
  clipId: string;
  lastAccessed: number;
}

export interface MediaToastNotice {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  durationMs?: number;
}
