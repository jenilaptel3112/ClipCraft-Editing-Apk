import React, { useState, useRef, useCallback } from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { DashboardScreen } from './screens/DashboardScreen';
import { MediaPickerModal } from './screens/MediaPickerModal';
import { EditorScreen } from './screens/EditorScreen';
import { ExportScreen } from './screens/ExportScreen';

function MainAppLifecycle() {
  const { currentScreen, setCurrentScreen } = useProject();

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const activeRecorderRef = useRef<MediaRecorder | null>(null);
  const exportIntervalRef = useRef<number | null>(null);

  // Trigger export flow from Editor Screen
  const handleTriggerExport = useCallback((canvas: HTMLCanvasElement, duration: number) => {
    setCurrentScreen('EXPORT_SCREEN');
    setIsExporting(true);
    setExportProgress(0);
    setDownloadUrl(null);

    const chunks: BlobPart[] = [];
    let recorder: MediaRecorder | null = null;

    try {
      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      recorder = new MediaRecorder(stream, { mimeType });
      activeRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setDownloadUrl(URL.createObjectURL(blob));
        setIsExporting(false);
      };

      recorder.start(100);
    } catch {
      // fallback
    }

    const exportDurationMs = Math.min(3800, duration * 280);
    const startStamp = performance.now();

    const interval = window.setInterval(() => {
      const elapsed = performance.now() - startStamp;
      const pct = Math.min(100, (elapsed / exportDurationMs) * 100);
      setExportProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        exportIntervalRef.current = null;
        if (recorder && recorder.state !== 'inactive') {
          recorder.stop();
        } else {
          const fallbackBlob = new Blob(['ClipCraft Master Render Video'], { type: 'video/webm' });
          setDownloadUrl(URL.createObjectURL(fallbackBlob));
          setIsExporting(false);
        }
      }
    }, 70);

    exportIntervalRef.current = interval;
  }, [setCurrentScreen]);

  const handleCancelExport = useCallback(() => {
    if (exportIntervalRef.current) {
      clearInterval(exportIntervalRef.current);
      exportIntervalRef.current = null;
    }
    if (activeRecorderRef.current && activeRecorderRef.current.state !== 'inactive') {
      try {
        activeRecorderRef.current.stop();
      } catch {}
    }
    setIsExporting(false);
    setCurrentScreen('EDITOR_SCREEN');
  }, [setCurrentScreen]);

  return (
    <div className="w-full h-dvh overflow-hidden select-none bg-[#0B0C10]">
      {/* SCREEN 1: Dashboard Home */}
      {currentScreen === 'DASHBOARD_SCREEN' && <DashboardScreen />}

      {/* SCREEN 2: Media Picker & Project Setup Modal */}
      {currentScreen === 'MEDIA_PICKER_MODAL' && (
        <>
          <DashboardScreen />
          <MediaPickerModal />
        </>
      )}

      {/* SCREEN 3: Core Editor Screen */}
      {currentScreen === 'EDITOR_SCREEN' && (
        <EditorScreen onTriggerExport={handleTriggerExport} />
      )}

      {/* SCREEN 4: Export & Download Screen */}
      {currentScreen === 'EXPORT_SCREEN' && (
        <ExportScreen
          onBackToEdit={() => setCurrentScreen('EDITOR_SCREEN')}
          onGoHome={() => setCurrentScreen('DASHBOARD_SCREEN')}
          downloadUrl={downloadUrl}
          isExporting={isExporting}
          exportProgress={exportProgress}
          onCancelExport={handleCancelExport}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <MainAppLifecycle />
    </ProjectProvider>
  );
}
