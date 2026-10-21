import React, { useState } from 'react';
import {
  Download,
  CheckCircle2,
  Sliders,
  FileVideo,
  Info,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { BottomDrawer } from './BottomDrawer';
import {
  AspectRatio,
  ProExportConfig,
  ExportResolution,
  ExportFps,
  ExportQualityPreset,
  ExportContainerFormat,
} from '../types/editor';
import {
  calculateEstimatedFileSizeMB,
  getBestSupportedCodec,
} from '../utils/offlineExportPipeline';

interface ProExportSettingsDrawerProps {
  isOpen: boolean;
  totalDuration: number;
  aspectRatio: AspectRatio;
  onClose: () => void;
  onStartExport: (config: ProExportConfig) => void;
}

export const ProExportSettingsDrawer: React.FC<ProExportSettingsDrawerProps> = ({
  isOpen,
  totalDuration,
  aspectRatio,
  onClose,
  onStartExport,
}) => {
  const [resolution, setResolution] = useState<ExportResolution>('1080p');
  const [fps, setFps] = useState<ExportFps>(30);
  const [qualityPreset, setQualityPreset] = useState<ExportQualityPreset>('standard');
  const [format, setFormat] = useState<ExportContainerFormat>('mp4');

  // Compute bitrate based on preset or custom resolution
  const getSuggestedBitrate = (res: ExportResolution, q: ExportQualityPreset): number => {
    if (res === '4K') {
      return q === 'low' ? 35 : q === 'standard' ? 45 : 75;
    }
    if (res === '2K') {
      return q === 'low' ? 18 : q === 'standard' ? 26 : 38;
    }
    if (res === '1080p') {
      return q === 'low' ? 8 : q === 'standard' ? 14 : 22;
    }
    // 720p
    return q === 'low' ? 4 : q === 'standard' ? 7 : 12;
  };

  const [customBitrate, setCustomBitrate] = useState<number>(14);

  // Sync bitrate when resolution or preset changes
  const handleResolutionChange = (newRes: ExportResolution) => {
    setResolution(newRes);
    setCustomBitrate(getSuggestedBitrate(newRes, qualityPreset));
  };

  const handleQualityPresetChange = (newQ: ExportQualityPreset) => {
    setQualityPreset(newQ);
    setCustomBitrate(getSuggestedBitrate(resolution, newQ));
  };

  const estimatedSizeMB = calculateEstimatedFileSizeMB(customBitrate, totalDuration);
  const codecInfo = getBestSupportedCodec(format);

  const handleStart = () => {
    onStartExport({
      resolution,
      fps,
      qualityPreset,
      bitrateMbps: customBitrate,
      format,
      codec: codecInfo.mimeType,
    });
    onClose();
  };

  return (
    <BottomDrawer isOpen={isOpen} title="Pro 4K Export Suite" onClose={onClose}>
      <div className="space-y-4 text-slate-100">
        {/* Estimated File Size & Bitrate Summary Pill */}
        <div className="p-3 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent border border-amber-500/30 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileVideo className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{resolution} UHD</span>
                <span className="text-[10px] text-amber-300 font-mono-tabular">
                  @{fps} FPS
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono-tabular">
                Estimated File Size: <strong className="text-white">{estimatedSizeMB} MB</strong> ({customBitrate} Mbps)
              </div>
            </div>
          </div>

          {resolution === '4K' && (
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
              4K PRO
            </span>
          )}
        </div>

        {/* 1. Resolution Selector */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
            Resolution
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                { id: '4K', label: '4K UHD', desc: '3840p' },
                { id: '2K', label: '2K QHD', desc: '1440p' },
                { id: '1080p', label: '1080p', desc: 'Full HD' },
                { id: '720p', label: '720p', desc: 'Fast' },
              ] as { id: ExportResolution; label: string; desc: string }[]
            ).map((r) => (
              <button
                key={r.id}
                onClick={() => handleResolutionChange(r.id)}
                className={`py-2 px-1.5 rounded-xl border text-center transition-all ${
                  resolution === r.id
                    ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow font-bold'
                    : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs">{r.label}</div>
                <div className="text-[9px] opacity-75 font-mono-tabular">{r.desc}</div>
              </button>
            ))}
          </div>

          {resolution === '4K' && (
            <p className="text-[10px] text-amber-400/90 mt-1 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" />
              <span>4K offline render compiles master full-res source frames. Higher battery usage.</span>
            </p>
          )}
        </div>

        {/* 2. Frame Rate (FPS) Options */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
            Frame Rate (FPS)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 60, label: '60 FPS', sub: 'Smooth / Action' },
                { id: 30, label: '30 FPS', sub: 'Social / Reels' },
                { id: 24, label: '24 FPS', sub: 'Cinematic Film' },
              ] as { id: ExportFps; label: string; sub: string }[]
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setFps(f.id)}
                className={`py-2 px-2 rounded-xl border text-center transition-all ${
                  fps === f.id
                    ? 'bg-amber-500/25 border-amber-400 text-amber-300 font-bold shadow'
                    : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs">{f.label}</div>
                <div className="text-[9px] opacity-75">{f.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Bitrate & Quality Control */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-slate-400">
              Bitrate (Quality vs Size)
            </label>
            <span className="font-mono-tabular text-xs font-bold text-amber-400">
              {customBitrate} Mbps
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            {(
              [
                { id: 'low', label: 'Space-Saver' },
                { id: 'standard', label: 'Balanced' },
                { id: 'high', label: 'Pro / Max' },
              ] as { id: ExportQualityPreset; label: string }[]
            ).map((q) => (
              <button
                key={q.id}
                onClick={() => handleQualityPresetChange(q.id)}
                className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  qualityPreset === q.id
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'bg-white/[0.04] border-white/10 text-slate-300'
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Manual Bitrate Slider */}
          <input
            type="range"
            min={resolution === '4K' ? 25 : resolution === '2K' ? 12 : 4}
            max={resolution === '4K' ? 80 : resolution === '2K' ? 50 : 30}
            value={customBitrate}
            onChange={(e) => setCustomBitrate(parseInt(e.target.value, 10))}
            className="w-full studio-slider h-2.5"
          />
        </div>

        {/* 4. Codec & Format Container */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 block mb-1.5">
            Format & Codec
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setFormat('mp4')}
              className={`py-2 px-3 rounded-xl border text-left transition-all ${
                format === 'mp4'
                  ? 'bg-amber-500/25 border-amber-400 text-amber-300 font-bold shadow'
                  : 'bg-white/[0.04] border-white/10 text-slate-400'
              }`}
            >
              <div className="text-xs font-bold">.MP4 (H.264 / AAC)</div>
              <div className="text-[9px] text-slate-400">Universal iPhone & Android playback</div>
            </button>

            <button
              onClick={() => setFormat('webm')}
              className={`py-2 px-3 rounded-xl border text-left transition-all ${
                format === 'webm'
                  ? 'bg-amber-500/25 border-amber-400 text-amber-300 font-bold shadow'
                  : 'bg-white/[0.04] border-white/10 text-slate-400'
              }`}
            >
              <div className="text-xs font-bold">.WEBM (VP9 / Opus)</div>
              <div className="text-[9px] text-slate-400">Efficient web compression</div>
            </button>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleStart}
          className="w-full min-h-[48px] py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition-all cursor-pointer mt-2"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>Start Offline Render ({resolution} • {customBitrate} Mbps)</span>
        </button>
      </div>
    </BottomDrawer>
  );
};
