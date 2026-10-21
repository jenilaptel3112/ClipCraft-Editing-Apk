import React, { useState, useEffect } from 'react';
import {
  Download,
  Share2,
  CheckCircle2,
  Home,
  ArrowLeft,
  Sparkles,
  Film,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';

interface ExportScreenProps {
  onBackToEdit: () => void;
  onGoHome: () => void;
  downloadUrl: string | null;
  isExporting: boolean;
  exportProgress: number;
  onCancelExport: () => void;
}

export const ExportScreen: React.FC<ExportScreenProps> = ({
  onBackToEdit,
  onGoHome,
  downloadUrl,
  isExporting,
  exportProgress,
  onCancelExport,
}) => {
  const { activeProject } = useProject();
  const [copiedShare, setCopiedShare] = useState(false);

  // Status message based on render percentage
  const getRenderStatusText = (pct: number) => {
    if (pct < 30) return 'Compiling canvas frames...';
    if (pct < 70) return 'Encoding audio & video tracks...';
    if (pct < 95) return 'Applying ClipCraft effects & color grade...';
    return 'Finalizing video stream...';
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share && downloadUrl) {
      try {
        await navigator.share({
          title: activeProject?.title || 'ClipCraft Studio Video',
          text: 'Check out my video created with ClipCraft Studio!',
          url: window.location.href,
        });
        return;
      } catch {
        // user cancelled or share failed, fallback to copy
      }
    }
    // Fallback: Copy link
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch {}
  };

  return (
    <div className="flex flex-col w-full h-dvh bg-[#08090E] text-slate-100 overflow-hidden select-none">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#0E1017] border-b border-white/[0.08] shrink-0 z-10">
        <button
          onClick={onBackToEdit}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Edit</span>
        </button>

        <span className="font-display font-bold text-sm text-white truncate max-w-[180px]">
          {activeProject?.title || 'Export Video'}
        </span>

        <button
          onClick={onGoHome}
          className="flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>
      </header>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center max-w-md mx-auto w-full space-y-6">
        {isExporting ? (
          // 1. RENDER STATE / PROCESSING PROGRESS
          <div className="w-full rounded-3xl bg-[#12141F] border border-white/[0.08] p-6 text-center space-y-5 shadow-2xl">
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              {/* Circular animated pulse */}
              <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping opacity-35" />
              <div className="w-20 h-20 rounded-full border-4 border-amber-500 border-t-transparent animate-spin flex items-center justify-center" />
              <span className="absolute font-mono-tabular font-extrabold text-amber-400 text-base">
                {Math.round(exportProgress)}%
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-white font-display">Rendering Video</h3>
              <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{getRenderStatusText(exportProgress)}</span>
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-150 rounded-full"
                style={{ width: `${Math.min(100, Math.round(exportProgress))}%` }}
              />
            </div>

            <button
              onClick={onCancelExport}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              Cancel Render
            </button>
          </div>
        ) : (
          // 2. SUCCESS / COMPLETE STATE
          <div className="w-full space-y-5">
            {/* Success badge */}
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-500/10 py-2 px-4 rounded-full border border-emerald-500/20 mx-auto w-fit">
              <CheckCircle2 className="w-4 h-4" />
              <span>Video Export Complete!</span>
            </div>

            {/* Looping video preview container */}
            <div className="relative w-full aspect-[9/16] max-h-[360px] rounded-2xl bg-black border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center mx-auto">
              {downloadUrl ? (
                <video
                  src={downloadUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-br ${
                    activeProject?.thumbnailGradient || 'from-blue-600 to-purple-900'
                  } flex flex-col items-center justify-center text-center p-4`}
                >
                  <Play className="w-10 h-10 text-white/90 fill-current mb-2" />
                  <span className="text-xs font-bold text-white">{activeProject?.title}</span>
                </div>
              )}
            </div>

            {/* Quality & File Size badge */}
            <div className="flex items-center justify-center gap-2 text-xs font-mono-tabular text-slate-300">
              <span className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08]">
                1080p Full HD
              </span>
              <span>•</span>
              <span className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08]">
                30 FPS
              </span>
              <span>•</span>
              <span className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08]">
                ~14.2 MB
              </span>
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-2.5 pt-2">
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={`${activeProject?.title.replace(/\s+/g, '_') || 'ClipCraft_Video'}_1080p.webm`}
                  className="w-full min-h-[50px] py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span>Download Video</span>
                </a>
              )}

              <button
                onClick={handleShare}
                className="w-full min-h-[46px] py-3 px-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>{copiedShare ? 'Link Copied to Clipboard!' : 'Share Video'}</span>
              </button>

              <button
                onClick={onGoHome}
                className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Done / Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
