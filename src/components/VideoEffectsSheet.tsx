import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  Activity,
  ZoomIn,
  Sun,
  Eye,
  Film,
  X,
  Layers,
  Sliders,
  Plus,
  Trash2,
  Save,
  Download,
  Upload,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  EyeOff,
  Copy,
} from 'lucide-react';
import { BottomDrawer } from './BottomDrawer';
import {
  TimelineClip,
  VideoEffectType,
  VideoEffectConfig,
  CustomFxPreset,
  CustomFxNode,
  CustomFxNodeType,
} from '../types/editor';
import {
  FX_NODE_DEFINITIONS,
  DEFAULT_COMPOUND_PRESETS,
  loadSavedCustomPresets,
  saveCustomPresetToStorage,
  deleteCustomPresetFromStorage,
  exportPresetsToJson,
  importPresetsFromJson,
} from '../utils/customFxEngine';

interface VideoEffectsSheetProps {
  isOpen: boolean;
  selectedClip: TimelineClip | null;
  onClose: () => void;
  onUpdateEffects: (clipId: string, effects: VideoEffectConfig[]) => void;
}

const EFFECT_PRESETS: {
  id: VideoEffectType;
  name: string;
  category: 'motion' | 'glow' | 'stylized';
  desc: string;
  icon: React.ReactNode;
  cssAnimClass: string;
  defaultConfig: Partial<VideoEffectConfig>;
}[] = [
  // 1. Motion & Camera Shake
  {
    id: 'camera-shake',
    name: 'Earthquake Shake',
    category: 'motion',
    desc: 'High-frequency impact vibration',
    icon: <Activity className="w-4 h-4 text-rose-400" />,
    cssAnimClass: 'animate-bounce',
    defaultConfig: { intensity: 45, speed: 1.4 },
  },
  {
    id: 'slow-zoom',
    name: 'Cinematic Push-In',
    category: 'motion',
    desc: 'Smooth exponential zoom ramp',
    icon: <ZoomIn className="w-4 h-4 text-sky-400" />,
    cssAnimClass: 'scale-105 transition-transform duration-700',
    defaultConfig: { intensity: 50, speed: 1.0 },
  },

  // 2. Glow & Lighting Effects
  {
    id: 'edge-glow',
    name: 'Dream Edge Glow',
    category: 'glow',
    desc: 'Screen bloom with soft diffuse',
    icon: <Sun className="w-4 h-4 text-amber-400" />,
    cssAnimClass: 'shadow-[0_0_15px_rgba(245,158,11,0.6)]',
    defaultConfig: { glow: 65, intensity: 50 },
  },
  {
    id: 'rgb-split',
    name: 'RGB Chromatic',
    category: 'glow',
    desc: 'Anamorphic color channel split',
    icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
    cssAnimClass: 'border-cyan-400 border-r-2 border-l-2',
    defaultConfig: { intensity: 50, speed: 1.0 },
  },
  {
    id: 'white-strobe',
    name: 'Beat White Strobe',
    category: 'glow',
    desc: '150ms flash decay on beat drops',
    icon: <Zap className="w-4 h-4 text-yellow-300" />,
    cssAnimClass: 'animate-pulse',
    defaultConfig: { intensity: 60, speed: 1.5 },
  },

  // 3. Trendy Stylized Visuals
  {
    id: 'film-grain',
    name: '35mm Film Grain',
    category: 'stylized',
    desc: 'Organic celluloid dust & noise',
    icon: <Film className="w-4 h-4 text-orange-400" />,
    cssAnimClass: 'opacity-90',
    defaultConfig: { intensity: 40 },
  },
  {
    id: 'lens-blur',
    name: 'Focus Pull Blur',
    category: 'stylized',
    desc: 'Resolves from blur into focus',
    icon: <Eye className="w-4 h-4 text-purple-400" />,
    cssAnimClass: 'backdrop-blur-xs',
    defaultConfig: { blur: 14, intensity: 50 },
  },
  {
    id: 'bw-pop',
    name: 'B&W Color Pop',
    category: 'stylized',
    desc: 'High contrast with vignette frame',
    icon: <Layers className="w-4 h-4 text-slate-300" />,
    cssAnimClass: 'grayscale',
    defaultConfig: { intensity: 55 },
  },
];

export const VideoEffectsSheet: React.FC<VideoEffectsSheetProps> = ({
  isOpen,
  selectedClip,
  onClose,
  onUpdateEffects,
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'presets' | 'custom-fx'>('custom-fx');
  const [activeCategory, setActiveCategory] = useState<'all' | 'motion' | 'glow' | 'stylized'>('all');
  const [editingEffectId, setEditingEffectId] = useState<string | null>(null);

  // Custom FX Lab State
  const [savedPresets, setSavedPresets] = useState<CustomFxPreset[]>(() => loadSavedCustomPresets());
  const [activePreset, setActivePreset] = useState<CustomFxPreset>(() => DEFAULT_COMPOUND_PRESETS[0]);
  const [isEditingNodes, setIsEditingNodes] = useState<boolean>(true);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [showAddNodeMenu, setShowAddNodeMenu] = useState<boolean>(false);
  const [saveModalOpen, setSaveModalOpen] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [jsonModalOpen, setJsonModalOpen] = useState<boolean>(false);
  const [jsonInput, setJsonInput] = useState<string>('');
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Sync saved presets from storage on open
  useEffect(() => {
    if (isOpen) {
      setSavedPresets(loadSavedCustomPresets());
    }
  }, [isOpen]);

  // If clip already has a custom-compound effect, sync activePreset
  useEffect(() => {
    if (!selectedClip) return;
    const compoundEff = selectedClip.activeEffects?.find((e) => e.type === 'custom-compound');
    if (compoundEff?.customPreset) {
      setActivePreset(compoundEff.customPreset);
      setActiveMainTab('custom-fx');
    }
  }, [selectedClip?.id]);

  if (!selectedClip) return null;

  const currentEffects = selectedClip.activeEffects || [];

  // Apply or update compound effect on selected clip
  const syncCompoundEffectToClip = (presetToApply: CustomFxPreset) => {
    const existingOtherEffects = currentEffects.filter((e) => e.type !== 'custom-compound');
    const compoundConfig: VideoEffectConfig = {
      id: `eff-compound-${Date.now()}`,
      type: 'custom-compound',
      intensity: presetToApply.masterIntensity,
      speed: 1.0,
      glow: 50,
      blur: 10,
      customPreset: presetToApply,
    };
    onUpdateEffects(selectedClip.id, [compoundConfig, ...existingOtherEffects.slice(0, 1)]);
  };

  // Master intensity change
  const handleMasterIntensityChange = (val: number) => {
    const updated: CustomFxPreset = {
      ...activePreset,
      masterIntensity: val,
    };
    setActivePreset(updated);
    syncCompoundEffectToClip(updated);
  };

  // Toggle node enabled
  const handleToggleNode = (nodeId: string) => {
    const nextNodes = activePreset.nodes.map((n) =>
      n.id === nodeId ? { ...n, enabled: !n.enabled } : n
    );
    const updated: CustomFxPreset = { ...activePreset, nodes: nextNodes };
    setActivePreset(updated);
    syncCompoundEffectToClip(updated);
  };

  // Remove node
  const handleRemoveNode = (nodeId: string) => {
    const nextNodes = activePreset.nodes.filter((n) => n.id !== nodeId);
    const updated: CustomFxPreset = { ...activePreset, nodes: nextNodes };
    setActivePreset(updated);
    syncCompoundEffectToClip(updated);
  };

  // Update node param
  const handleUpdateNodeParam = (nodeId: string, paramKey: string, val: number) => {
    const nextNodes = activePreset.nodes.map((n) => {
      if (n.id === nodeId) {
        return {
          ...n,
          params: { ...n.params, [paramKey]: val },
        };
      }
      return n;
    });
    const updated: CustomFxPreset = { ...activePreset, nodes: nextNodes };
    setActivePreset(updated);
    syncCompoundEffectToClip(updated);
  };

  // Add node from definitions
  const handleAddNode = (type: CustomFxNodeType) => {
    const def = FX_NODE_DEFINITIONS[type];
    const newNode: CustomFxNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      enabled: true,
      params: { ...def.defaultParams },
    };
    const nextNodes = [...activePreset.nodes, newNode];
    const updated: CustomFxPreset = { ...activePreset, nodes: nextNodes };
    setActivePreset(updated);
    setExpandedNodeId(newNode.id);
    setShowAddNodeMenu(false);
    syncCompoundEffectToClip(updated);
  };

  // Capture thumbnail from active canvas
  const captureCanvasThumbnail = (): string | undefined => {
    try {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        return canvas.toDataURL('image/jpeg', 0.6);
      }
    } catch {
      // fallback
    }
    return undefined;
  };

  // Save current preset
  const handleSavePreset = () => {
    const name = newPresetName.trim() || `Custom FX ${savedPresets.length + 1}`;
    const thumb = captureCanvasThumbnail();
    const newPreset: CustomFxPreset = {
      ...activePreset,
      id: `preset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      thumbnail: thumb,
      createdAt: Date.now(),
    };
    const nextList = saveCustomPresetToStorage(newPreset);
    setSavedPresets(nextList);
    setActivePreset(newPreset);
    setSaveModalOpen(false);
    setNewPresetName('');
  };

  // Select a preset from library
  const handleSelectPreset = (p: CustomFxPreset) => {
    setActivePreset(p);
    syncCompoundEffectToClip(p);
  };

  // Delete saved preset
  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextList = deleteCustomPresetFromStorage(id);
    setSavedPresets(nextList);
    if (activePreset.id === id) {
      setActivePreset(nextList[0] || DEFAULT_COMPOUND_PRESETS[0]);
    }
  };

  // Export JSON
  const handleExportJson = () => {
    const jsonStr = exportPresetsToJson([activePreset]);
    navigator.clipboard.writeText(jsonStr);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Import JSON
  const handleImportJson = () => {
    try {
      const imported = importPresetsFromJson(jsonInput);
      setSavedPresets(imported);
      if (imported.length > 0) {
        setActivePreset(imported[0]);
        syncCompoundEffectToClip(imported[0]);
      }
      setJsonModalOpen(false);
      setJsonInput('');
    } catch (err: any) {
      alert(err?.message || 'Invalid preset JSON syntax');
    }
  };

  // Curated Preset toggles
  const handleToggleStandardPreset = (preset: typeof EFFECT_PRESETS[0]) => {
    const existingIndex = currentEffects.findIndex((e) => e.type === preset.id);

    if (existingIndex >= 0) {
      const next = currentEffects.filter((_, idx) => idx !== existingIndex);
      onUpdateEffects(selectedClip.id, next);
      if (editingEffectId === currentEffects[existingIndex].id) {
        setEditingEffectId(null);
      }
    } else {
      const newConfig: VideoEffectConfig = {
        id: `eff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: preset.id,
        intensity: preset.defaultConfig.intensity ?? 50,
        speed: preset.defaultConfig.speed ?? 1.0,
        glow: preset.defaultConfig.glow ?? 50,
        blur: preset.defaultConfig.blur ?? 12,
      };

      const next = currentEffects.length >= 2
        ? [currentEffects[1], newConfig]
        : [...currentEffects, newConfig];

      onUpdateEffects(selectedClip.id, next);
      setEditingEffectId(newConfig.id);
    }
  };

  const isCurrentCompoundActive = currentEffects.some((e) => e.type === 'custom-compound');

  return (
    <BottomDrawer
      isOpen={isOpen}
      title="Video FX & Shader Lab"
      onClose={onClose}
      onReset={() => onUpdateEffects(selectedClip.id, [])}
    >
      <div className="space-y-4">
        {/* Top Segmented Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-white/[0.04] border border-white/10 rounded-2xl">
          <button
            onClick={() => setActiveMainTab('custom-fx')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeMainTab === 'custom-fx'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Custom FX Lab</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/20 font-mono">PRO</span>
          </button>
          <button
            onClick={() => setActiveMainTab('presets')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeMainTab === 'presets'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Quick Presets</span>
          </button>
        </div>

        {/* ===================== TAB 1: CUSTOM FX LAB ===================== */}
        {activeMainTab === 'custom-fx' && (
          <div className="space-y-4">
            {/* Master Intensity & Apply Bar */}
            <div className="bg-[#12141C] p-3 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-xs">
                    FX
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{activePreset.name}</h4>
                    <span className="text-[10px] text-slate-400">
                      {activePreset.nodes.filter((n) => n.enabled).length} active nodes in chain
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => syncCompoundEffectToClip(activePreset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                      isCurrentCompoundActive
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isCurrentCompoundActive ? 'Applied' : 'Apply'}</span>
                  </button>
                </div>
              </div>

              {/* Master Intensity Slider */}
              <div className="space-y-1 pt-1 border-t border-white/[0.06]">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Master FX Intensity:</span>
                  <span className="text-amber-400 font-mono font-bold">{activePreset.masterIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={activePreset.masterIntensity}
                  onChange={(e) => handleMasterIntensityChange(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Preset Actions: Save, Export, Import */}
              <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
                <button
                  onClick={() => setSaveModalOpen(true)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>Save Preset</span>
                </button>
                <button
                  onClick={handleExportJson}
                  className="py-1.5 px-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
                  title="Copy JSON configuration"
                >
                  <Copy className="w-3.5 h-3.5 text-sky-400" />
                  <span>{copyFeedback ? 'Copied!' : 'Export JSON'}</span>
                </button>
                <button
                  onClick={() => setJsonModalOpen(true)}
                  className="py-1.5 px-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
                  title="Import preset from JSON"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Import</span>
                </button>
              </div>
            </div>

            {/* Compound Presets Shelf */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Preset Library:</span>
                <span className="text-[10px] text-slate-500">{savedPresets.length} presets</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {savedPresets.map((preset) => {
                  const isSelected = activePreset.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`min-w-[130px] max-w-[140px] p-2.5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between shrink-0 relative group ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-md'
                          : 'bg-white/[0.04] border-white/10 hover:border-white/20 text-slate-300'
                      }`}
                    >
                      <div>
                        {preset.thumbnail ? (
                          <div className="w-full h-14 rounded-lg overflow-hidden mb-2 bg-slate-900 border border-white/10">
                            <img src={preset.thumbnail} alt={preset.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-full h-12 rounded-lg mb-2 bg-gradient-to-br from-amber-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                          </div>
                        )}
                        <h5 className="text-[11px] font-bold truncate leading-tight">{preset.name}</h5>
                        <p className="text-[9px] text-slate-400 mt-0.5">{preset.nodes.length} nodes · {preset.masterIntensity}%</p>
                      </div>

                      {/* Delete user preset if not built-in */}
                      {!preset.id.startsWith('preset-cyberpunk') && !preset.id.startsWith('preset-retro') && (
                        <button
                          onClick={(e) => handleDeletePreset(preset.id, e)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all opacity-80"
                          title="Delete preset"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Effect Chaining Engine & Node Stacking */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">Effect Chain Nodes ({activePreset.nodes.length}):</span>
                  <button
                    onClick={() => setIsEditingNodes(!isEditingNodes)}
                    className="text-[10px] text-amber-400 hover:underline font-semibold"
                  >
                    {isEditingNodes ? 'Hide Sliders' : 'Edit Nodes'}
                  </button>
                </div>

                {/* Add Node Button */}
                <button
                  onClick={() => setShowAddNodeMenu(!showAddNodeMenu)}
                  className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Node</span>
                </button>
              </div>

              {/* Add Node Dropdown Panel */}
              {showAddNodeMenu && (
                <div className="p-3 bg-[#181B26] border border-amber-500/30 rounded-2xl space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-1 border-b border-white/10">
                    <span className="text-xs font-bold text-amber-400">Select Shader Node to Stack:</span>
                    <button onClick={() => setShowAddNodeMenu(false)} className="text-slate-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 1. Base Filters */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Base Color & Exposure Filters
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['brightness', 'contrast', 'saturation', 'hue', 'invert', 'sepia'] as CustomFxNodeType[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => handleAddNode(t)}
                          className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left text-xs font-medium text-slate-200 transition-all hover:border-amber-400"
                        >
                          <div className="font-semibold text-[11px] truncate">{FX_NODE_DEFINITIONS[t].name}</div>
                          <div className="text-[9px] text-slate-400 truncate">{FX_NODE_DEFINITIONS[t].description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Motion & Distortion */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Motion & Distortion Nodes
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['camera-shake', 'rgb-split', 'lens-distortion'] as CustomFxNodeType[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => handleAddNode(t)}
                          className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left text-xs font-medium text-slate-200 transition-all hover:border-cyan-400"
                        >
                          <div className="font-semibold text-[11px] truncate">{FX_NODE_DEFINITIONS[t].name}</div>
                          <div className="text-[9px] text-slate-400 truncate">{FX_NODE_DEFINITIONS[t].description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Overlays & Lighting */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Overlays & Procedural Lighting
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['film-grain', 'white-strobe', 'edge-glow', 'vignette'] as CustomFxNodeType[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => handleAddNode(t)}
                          className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left text-xs font-medium text-slate-200 transition-all hover:border-yellow-400"
                        >
                          <div className="font-semibold text-[11px] truncate">{FX_NODE_DEFINITIONS[t].name}</div>
                          <div className="text-[9px] text-slate-400 truncate">{FX_NODE_DEFINITIONS[t].description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Node Stack List */}
              <div className="space-y-2">
                {activePreset.nodes.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                    No active effect nodes. Tap <span className="text-amber-400 font-semibold">+ Add Node</span> to stack filters!
                  </div>
                ) : (
                  activePreset.nodes.map((node, index) => {
                    const def = FX_NODE_DEFINITIONS[node.type];
                    const isExpanded = expandedNodeId === node.id || isEditingNodes;

                    return (
                      <div
                        key={node.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          node.enabled
                            ? 'bg-white/[0.04] border-white/10'
                            : 'bg-white/[0.02] border-white/[0.05] opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-white/[0.06] text-[10px] font-mono font-bold flex items-center justify-center text-slate-400">
                              #{index + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-200">{def?.name || node.type}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-slate-400 uppercase">
                              {def?.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Enable / Disable */}
                            <button
                              onClick={() => handleToggleNode(node.id)}
                              className={`p-1.5 rounded-lg transition-all ${
                                node.enabled ? 'text-amber-400 hover:text-amber-300' : 'text-slate-600 hover:text-slate-400'
                              }`}
                              title={node.enabled ? 'Disable Node' : 'Enable Node'}
                            >
                              {node.enabled ? <Check className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>

                            {/* Expand / Collapse parameters */}
                            <button
                              onClick={() => setExpandedNodeId(expandedNodeId === node.id ? null : node.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                            >
                              {expandedNodeId === node.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {/* Delete Node */}
                            <button
                              onClick={() => handleRemoveNode(node.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Granular Sliders when expanded */}
                        {isExpanded && def && (
                          <div className="mt-3 pt-2.5 border-t border-white/[0.06] space-y-2.5">
                            {Object.entries(def.paramRanges).map(([paramKey, config]) => {
                              const val = node.params[paramKey] ?? def.defaultParams[paramKey] ?? 0;
                              return (
                                <div key={paramKey} className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-slate-400">{config.label}:</span>
                                    <span className="text-amber-300 font-mono font-bold">
                                      {val}{config.unit || ''}
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min={config.min}
                                    max={config.max}
                                    step={config.step}
                                    value={val}
                                    onChange={(e) =>
                                      handleUpdateNodeParam(node.id, paramKey, Number(e.target.value))
                                    }
                                    className="w-full accent-amber-500 cursor-pointer h-1.5"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: CURATED PRESETS ===================== */}
        {activeMainTab === 'presets' && (
          <div className="space-y-4">
            {/* Active Stacked Effects Pills (Max 2) */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">
                  Active Stacked Effects ({currentEffects.length}/2):
                </span>
                {currentEffects.length === 0 && (
                  <span className="text-[11px] text-slate-500">None selected</span>
                )}
                {currentEffects.map((eff) => {
                  const presetInfo = EFFECT_PRESETS.find((p) => p.id === eff.type);
                  const isEditing = editingEffectId === eff.id;

                  return (
                    <div
                      key={eff.id}
                      onClick={() => setEditingEffectId(eff.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs cursor-pointer transition-all ${
                        isEditing
                          ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                          : 'bg-white/[0.06] border-white/10 text-slate-200'
                      }`}
                    >
                      <span className="font-medium text-[11px]">{presetInfo?.name || eff.customPreset?.name || eff.type}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = currentEffects.filter((item) => item.id !== eff.id);
                          onUpdateEffects(selectedClip.id, next);
                          if (editingEffectId === eff.id) setEditingEffectId(null);
                        }}
                        className="p-0.5 hover:text-rose-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {(['all', 'motion', 'glow', 'stylized'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize shrink-0 transition-all ${
                    activeCategory === cat
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  {cat === 'all' ? 'All Effects' : cat}
                </button>
              ))}
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {(activeCategory === 'all'
                ? EFFECT_PRESETS
                : EFFECT_PRESETS.filter((p) => p.category === activeCategory)
              ).map((preset) => {
                const isActive = currentEffects.some((e) => e.type === preset.id);
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleToggleStandardPreset(preset)}
                    className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[90px] ${
                      isActive
                        ? 'bg-amber-500/15 border-amber-400 text-amber-300 shadow-md'
                        : 'bg-white/[0.04] border-white/10 hover:border-white/20 text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="p-1.5 rounded-lg bg-white/[0.06]">{preset.icon}</div>
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        )}
                      </div>
                      <div className="text-xs font-bold leading-tight">{preset.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{preset.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal: Save Custom Preset */}
        {saveModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-[#12141C] border border-white/15 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Save className="w-4 h-4 text-amber-400" />
                <span>Save Custom FX Preset</span>
              </h3>
              <p className="text-xs text-slate-400">
                Give your custom effect chain a name. A live thumbnail of the active canvas will be saved automatically.
              </p>
              <input
                type="text"
                placeholder="e.g. Cyberpunk Acid Glow"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setSaveModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePreset}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition-all"
                >
                  Save Preset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Import Preset JSON */}
        {jsonModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-[#12141C] border border-white/15 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Import Preset JSON</span>
              </h3>
              <p className="text-xs text-slate-400">
                Paste a lightweight JSON preset configuration string below:
              </p>
              <textarea
                rows={5}
                placeholder='[{"name": "My Preset", "masterIntensity": 80, "nodes": [...]}]'
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white font-mono text-[11px] placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setJsonModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportJson}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md transition-all"
                >
                  Import Configuration
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BottomDrawer>
  );
};
