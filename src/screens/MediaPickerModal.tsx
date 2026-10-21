import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Check,
  Film,
  Image as ImageIcon,
  Sparkles,
  ArrowRight,
  Settings,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { AspectRatio, TimelineClip, ProjectSettings } from '../types/editor';
import { DEFAULT_COLOR_GRADING, createDefaultProjectSettings } from '../utils/presets';
import { ProjectSettingsModal } from '../components/ProjectSettingsModal';

interface MockMediaAsset {
  id: string;
  type: 'video' | 'image' | 'synthetic';
  name: string;
  duration: number;
  syntheticScene?: 'neon-horizon' | 'golden-waves' | 'cyber-grid' | 'aurora-drift';
  previewGradient: string;
  file?: File;
  objectUrl?: string;
}

const STOCK_CANVASES: MockMediaAsset[] = [
  {
    id: 'stock-1',
    type: 'synthetic',
    name: 'Synthwave Horizon',
    duration: 4.5,
    syntheticScene: 'neon-horizon',
    previewGradient: 'from-pink-600 to-indigo-900',
  },
  {
    id: 'stock-2',
    type: 'synthetic',
    name: 'Solar Ocean Aerial',
    duration: 4.5,
    syntheticScene: 'golden-waves',
    previewGradient: 'from-amber-500 to-orange-800',
  },
  {
    id: 'stock-3',
    type: 'synthetic',
    name: 'Aurora Borealis Night',
    duration: 4.0,
    syntheticScene: 'aurora-drift',
    previewGradient: 'from-emerald-600 to-slate-900',
  },
  {
    id: 'stock-4',
    type: 'synthetic',
    name: 'Cyberpunk Grid',
    duration: 4.0,
    syntheticScene: 'cyber-grid',
    previewGradient: 'from-cyan-500 to-blue-900',
  },
];

export const MediaPickerModal: React.FC = () => {
  const { setCurrentScreen, createNewProjectWithSettings } = useProject();
  const [activeTab, setActiveTab] = useState<'videos' | 'photos' | 'stock'>('stock');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>(() =>
    createDefaultProjectSettings(undefined, 'New ClipCraft Video', '9:16')
  );
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(['stock-1', 'stock-2']);
  const [userUploadedAssets, setUserUploadedAssets] = useState<MockMediaAsset[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Toggle selection with numbered badges (1, 2, 3...)
  const toggleSelectAsset = (id: string) => {
    setSelectedAssetIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Handle local user files upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAssets: MockMediaAsset[] = Array.from(files).map((file, idx) => {
      const isVideo = file.type.startsWith('video/');
      const objectUrl = URL.createObjectURL(file);
      return {
        id: `user-upload-${Date.now()}-${idx}`,
        type: isVideo ? 'video' : 'image',
        name: file.name,
        duration: 4.0,
        previewGradient: isVideo ? 'from-blue-600 to-indigo-800' : 'from-purple-600 to-pink-800',
        file,
        objectUrl,
      };
    });

    setUserUploadedAssets((prev) => [...newAssets, ...prev]);
    // Auto select newly uploaded assets
    setSelectedAssetIds((prev) => [...prev, ...newAssets.map((a) => a.id)]);
    e.target.value = '';
  };

  // Convert selected assets into timeline clips sequence
  const handleCreateProject = () => {
    const allAvailable = [...userUploadedAssets, ...STOCK_CANVASES];
    const orderedSelected = selectedAssetIds
      .map((id) => allAvailable.find((a) => a.id === id))
      .filter((a): a is MockMediaAsset => Boolean(a));

    let cumulativeStart = 0;
    const initialClips: TimelineClip[] = orderedSelected.map((asset, index) => {
      const clipDuration = asset.duration || 4.5;
      const start = cumulativeStart;
      cumulativeStart += clipDuration;

      return {
        id: `clip-video-${Date.now()}-${index}`,
        trackId: 'video',
        name: asset.name,
        startTime: +start.toFixed(2),
        duration: clipDuration,
        sourceStartOffset: 0,
        sourceMaxDuration: 30,
        mediaType: asset.type === 'synthetic' ? 'synthetic' : asset.type === 'image' ? 'image' : 'video',
        syntheticScene: asset.syntheticScene,
        mediaUrl: asset.objectUrl,
        accentColor: '#3B82F6',
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        colorGrading: { ...DEFAULT_COLOR_GRADING },
        keyframes: [],
        transitionIn: index > 0 ? { type: 'crossfade', duration: 0.6 } : { type: 'none', duration: 0 },
        activeEffects: [],
        speed: 1,
        preservePitch: true,
        volume: 85,
        muted: false,
        fadeIn: index === 0 ? 0.3 : 0,
        fadeOut: index === orderedSelected.length - 1 ? 0.4 : 0,
      };
    });

    createNewProjectWithSettings(
      {
        ...projectSettings,
        aspectRatio,
        name: projectSettings.name || `Project ${new Date().toLocaleDateString()}`,
      },
      initialClips
    );
  };

  const currentList =
    activeTab === 'stock'
      ? STOCK_CANVASES
      : activeTab === 'videos'
      ? userUploadedAssets.filter((a) => a.type === 'video')
      : userUploadedAssets.filter((a) => a.type === 'image');

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-xs select-none">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={activeTab === 'photos' ? 'image/*' : 'video/*,image/*'}
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="w-full h-[88dvh] max-h-[720px] bg-[#12141F] rounded-t-3xl border-t border-white/10 flex flex-col overflow-hidden shadow-2xl animate-slide-up">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white font-display">New Project Asset Picker</h2>
          </div>
          <button
            onClick={() => setCurrentScreen('DASHBOARD_SCREEN')}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Aspect Ratio & Settings Selector */}
        <div className="px-4 py-2.5 bg-black/30 border-b border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Ratio:</span>
            <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-xl border border-white/[0.06]">
              {(
                [
                  { id: '9:16', label: '9:16' },
                  { id: '16:9', label: '16:9' },
                  { id: '1:1', label: '1:1' },
                  { id: '4:5', label: '4:5' },
                ] as { id: AspectRatio; label: string }[]
              ).map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setAspectRatio(r.id);
                    setProjectSettings((prev) => ({ ...prev, aspectRatio: r.id }));
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    aspectRatio === r.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Project Settings Trigger */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
            title="Configure Project Settings (Canvas, FPS, Resolution)"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span>Settings ({projectSettings.resolutionTier}, {projectSettings.frameRate}fps)</span>
          </button>
        </div>

        {/* Media Tabs */}
        <div className="flex items-center px-4 pt-2 border-b border-white/[0.08] gap-4">
          <button
            onClick={() => setActiveTab('stock')}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              activeTab === 'stock'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Stock & Canvases
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              activeTab === 'videos'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Videos ({userUploadedAssets.filter((a) => a.type === 'video').length})
          </button>
          <button
            onClick={() => setActiveTab('photos')}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              activeTab === 'photos'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Photos ({userUploadedAssets.filter((a) => a.type === 'image').length})
          </button>
        </div>

        {/* Assets Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab !== 'stock' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="mb-4 p-4 rounded-2xl border-2 border-dashed border-white/20 hover:border-amber-400/50 bg-white/[0.02] flex items-center justify-center gap-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span>Tap to browse and import {activeTab} from your device</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {currentList.map((asset) => {
              const selectedIndex = selectedAssetIds.indexOf(asset.id);
              const isSelected = selectedIndex !== -1;

              return (
                <div
                  key={asset.id}
                  onClick={() => toggleSelectAsset(asset.id)}
                  className={`relative rounded-2xl p-2.5 transition-all cursor-pointer border overflow-hidden flex flex-col justify-between h-32 ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 shadow-lg ring-1 ring-amber-400'
                      : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
                  }`}
                >
                  <div
                    className={`w-full h-16 rounded-xl bg-gradient-to-br ${asset.previewGradient} flex items-center justify-center`}
                  >
                    {asset.type === 'image' ? (
                      <ImageIcon className="w-5 h-5 text-white/80" />
                    ) : (
                      <Film className="w-5 h-5 text-white/80" />
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-white truncate max-w-[100px]">
                      {asset.name}
                    </span>
                    <span className="text-[10px] font-mono-tabular text-slate-400">
                      {asset.duration}s
                    </span>
                  </div>

                  {/* Multi-Select Numbered Badge (1, 2, 3...) indicating timeline sequence */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
                      {selectedIndex + 1}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="px-4 py-3 bg-[#0E1018] border-t border-white/[0.08] flex items-center justify-between shrink-0">
          <div>
            <span className="text-xs font-bold text-white">
              {selectedAssetIds.length} {selectedAssetIds.length === 1 ? 'clip' : 'clips'} selected
            </span>
            <span className="text-[11px] text-slate-400 block">
              Will be placed in numbered sequence
            </span>
          </div>

          <button
            disabled={selectedAssetIds.length === 0}
            onClick={handleCreateProject}
            className="min-h-[46px] px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-40 transition-all cursor-pointer"
          >
            <span>Create Project</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Project Configuration Modal */}
      <ProjectSettingsModal
        isOpen={isSettingsModalOpen}
        initialSettings={projectSettings}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={(s) => {
          setProjectSettings(s);
          setAspectRatio(s.aspectRatio);
        }}
      />
    </div>
  );
};
