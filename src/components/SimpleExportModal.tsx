import React, { useState } from 'react';
import { Download, CheckCircle2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { BottomDrawer } from './BottomDrawer';
import { ExportConfig } from '../types/editor';

interface SimpleExportModalProps {
  isOpen: boolean;
  isExporting: boolean;
  progress: number;
  downloadUrl: string | null;
  exportConfig: ExportConfig;
  onUpdateConfig: (updates: Partial<ExportConfig>) => void;
  onStartExport: () => void;
  onClose: () => void;
}

export const SimpleExportModal: React.FC<SimpleExportModalProps> = ({
  isOpen,
  isExporting,
  progress,
  downloadUrl,
  exportConfig,
  onUpdateConfig,
  onStartExport,
  onClose,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <BottomDrawer isOpen={isOpen} title="Export Video" onClose={onClose}>
      <div className="space-y-4">
        {/* Smart default summary */}
        {!isExporting && !downloadUrl && (
          <div className="p-3 bg-white/[0.04] border border-white/10 rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Full HD Quality</div>
              <div className="text-[11px] text-slate-400">1080p · 30 FPS · WebM</div>
            </div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 py-1 px-2"
            >
              <span>{showAdvanced ? 'Hide Advanced' : 'Advanced'}</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Optional Advanced Dropdown */}
        {showAdvanced && !isExporting && (
          <div className="p-3 bg-black/40 border border-white/[0.06] rounded-2xl space-y-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Resolution</label>
              <div className="grid grid-cols-2 gap-2">
                {(['720p', '1080p'] as const).map((res) => (
                  <button
                    key={res}
                    onClick={() => onUpdateConfig({ resolution: res })}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      exportConfig.resolution === res
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-white/[0.04] border-white/10 text-slate-300'
                    }`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Frame Rate</label>
              <div className="grid grid-cols-2 gap-2">
                {([30, 60] as const).map((fps) => (
                  <button
                    key={fps}
                    onClick={() => onUpdateConfig({ fps })}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      exportConfig.fps === fps
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-white/[0.04] border-white/10 text-slate-300'
                    }`}
                  >
                    {fps} FPS
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Encoding progress */}
        {isExporting && (
          <div className="space-y-2 py-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                Rendering frames...
              </span>
              <span className="font-mono-tabular text-amber-400 font-bold">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-150 rounded-full"
                style={{ width: `${Math.min(100, Math.round(progress))}%` }}
              />
            </div>
          </div>
        )}

        {/* Download ready notification */}
        {downloadUrl && !isExporting && (
          <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Video ready!</span>
            </div>
            <a
              href={downloadUrl}
              download={`ClipCraft_Video_${exportConfig.resolution}.webm`}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save</span>
            </a>
          </div>
        )}

        {/* Big high-contrast action button */}
        {!downloadUrl && (
          <button
            disabled={isExporting}
            onClick={onStartExport}
            className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/15 disabled:opacity-50 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Encoding Video...' : 'Download Video (1-Tap)'}</span>
          </button>
        )}
      </div>
    </BottomDrawer>
  );
};
