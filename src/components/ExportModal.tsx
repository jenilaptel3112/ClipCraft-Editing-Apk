import React from 'react';
import { X, Download, Film, CheckCircle2, Sparkles } from 'lucide-react';
import { ExportConfig } from '../types/editor';

interface ExportModalProps {
  isOpen: boolean;
  isExporting: boolean;
  progress: number;
  exportConfig: ExportConfig;
  downloadUrl: string | null;
  onUpdateConfig: (updates: Partial<ExportConfig>) => void;
  onStartExport: () => void;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  isExporting,
  progress,
  exportConfig,
  downloadUrl,
  onUpdateConfig,
  onStartExport,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[#12151E] border border-white/10 p-5 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white font-display">
              Export Master Timeline
            </h2>
          </div>
          {!isExporting && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quality & Frame Rate Selectors */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Resolution Preset</label>
            <div className="grid grid-cols-2 gap-2">
              {(['720p', '1080p'] as const).map((res) => (
                <button
                  key={res}
                  disabled={isExporting}
                  onClick={() => onUpdateConfig({ resolution: res })}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                    exportConfig.resolution === res
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08]'
                  }`}
                >
                  {res === '1080p' ? '1080p Full HD' : '720p Social Fast'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Frame Rate</label>
            <div className="grid grid-cols-2 gap-2">
              {([30, 60] as const).map((fps) => (
                <button
                  key={fps}
                  disabled={isExporting}
                  onClick={() => onUpdateConfig({ fps })}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                    exportConfig.fps === fps
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08]'
                  }`}
                >
                  {fps} FPS
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Container Format</label>
            <div className="grid grid-cols-2 gap-2">
              {(['webm', 'mp4'] as const).map((fmt) => (
                <button
                  key={fmt}
                  disabled={isExporting}
                  onClick={() => onUpdateConfig({ format: fmt })}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold uppercase border transition-colors ${
                    exportConfig.format === fmt
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/[0.08]'
                  }`}
                >
                  .{fmt} (Hardware Canvas Stream)
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Encoding Progress Bar */}
        {isExporting && (
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                Encoding Canvas Stream...
              </span>
              <span className="font-mono-tabular text-amber-400 font-semibold">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-150"
                style={{ width: `${Math.min(100, Math.round(progress))}%` }}
              />
            </div>
          </div>
        )}

        {/* Completed Download Link */}
        {downloadUrl && !isExporting && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Render complete and ready to save!</span>
            </div>
            <a
              href={downloadUrl}
              download={`ClipCraft_Master_${exportConfig.resolution}.${exportConfig.format}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs hover:bg-emerald-400 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save File</span>
            </a>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          {!isExporting && (
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/[0.06] transition-colors"
            >
              Close
            </button>
          )}
          <button
            disabled={isExporting}
            onClick={onStartExport}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Rendering Frame Pipeline...' : 'Render & Export Video'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
