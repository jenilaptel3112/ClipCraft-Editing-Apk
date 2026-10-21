import React, { useState } from 'react';
import {
  Box,
  Move,
  RotateCcw,
  Maximize2,
  GitFork,
  Camera,
  Diamond,
  Plus,
  Eye,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { BottomDrawer } from './BottomDrawer';
import { TimelineClip, Keyframe } from '../types/editor';
import { isValidParent } from '../utils/hierarchyMath';

interface Transform3DDrawerProps {
  isOpen: boolean;
  selectedClip: TimelineClip | null;
  allClips: TimelineClip[];
  currentTime: number;
  onClose: () => void;
  onUpdateTransform: (clipId: string, updates: Partial<TimelineClip>) => void;
  onAddKeyframe: (clipId: string, keyframe: Keyframe) => void;
  onAddNullLayer: () => void;
  onAddCameraLayer: () => void;
}

export const Transform3DDrawer: React.FC<Transform3DDrawerProps> = ({
  isOpen,
  selectedClip,
  allClips,
  currentTime,
  onClose,
  onUpdateTransform,
  onAddKeyframe,
  onAddNullLayer,
  onAddCameraLayer,
}) => {
  const [activeTab, setActiveTab] = useState<'position' | 'rotation' | 'scale' | 'parenting' | 'camera'>('position');

  if (!selectedClip) return null;

  const is3D = selectedClip.is3D || selectedClip.mediaType === 'camera' || selectedClip.mediaType === 'null';
  const isCamera = selectedClip.mediaType === 'camera';
  const isNull = selectedClip.mediaType === 'null';

  const validParents = allClips.filter(
    (c) => c.id !== selectedClip.id && isValidParent(allClips, selectedClip.id, c.id)
  );

  const currentParent = allClips.find((c) => c.id === selectedClip.parentId);

  // Helper to record a keyframe at current playhead
  const triggerKeyframe = (propName: string) => {
    const timeOffset = Math.max(0, +(currentTime - selectedClip.startTime).toFixed(2));
    const newKeyframe: Keyframe = {
      id: `kf-${Date.now()}-${propName}`,
      timeOffset,
      x: selectedClip.x || 0,
      y: selectedClip.y || 0,
      z: selectedClip.z || 0,
      scale: selectedClip.scale || 1,
      scaleX: selectedClip.scaleX || 1,
      scaleY: selectedClip.scaleY || 1,
      scaleZ: selectedClip.scaleZ || 1,
      rotation: selectedClip.rotation || 0,
      rotateX: selectedClip.rotateX || 0,
      rotateY: selectedClip.rotateY || 0,
      rotateZ: selectedClip.rotateZ ?? selectedClip.rotation ?? 0,
      opacity: selectedClip.opacity ?? 1,
      easing: 'ease-in-out',
      fov: selectedClip.cameraFov,
    };
    onAddKeyframe(selectedClip.id, newKeyframe);
  };

  const setCameraPreset = (preset: 'front' | 'top' | 'isometric' | 'orbit') => {
    if (preset === 'front') {
      onUpdateTransform(selectedClip.id, {
        x: 0,
        y: 0,
        z: 0,
        rotateX: 0,
        rotateY: 0,
        rotateZ: 0,
        cameraTarget: [0, 0, 0],
        cameraPreset: 'front',
      });
    } else if (preset === 'top') {
      onUpdateTransform(selectedClip.id, {
        x: 0,
        y: 80,
        z: 300,
        rotateX: 85,
        rotateY: 0,
        rotateZ: 0,
        cameraTarget: [0, 0, 0],
        cameraPreset: 'top',
      });
    } else if (preset === 'isometric') {
      onUpdateTransform(selectedClip.id, {
        x: 60,
        y: 40,
        z: 400,
        rotateX: 30,
        rotateY: 45,
        rotateZ: 0,
        cameraTarget: [0, 0, 0],
        cameraPreset: 'isometric',
      });
    } else if (preset === 'orbit') {
      onUpdateTransform(selectedClip.id, {
        x: 0,
        y: 20,
        z: 500,
        rotateX: 15,
        rotateY: 25,
        rotateZ: 0,
        cameraTarget: [0, 0, 0],
        cameraPreset: 'orbit',
      });
    }
  };

  return (
    <BottomDrawer isOpen={isOpen} title="3D Spatial Transform & Parenting" onClose={onClose}>
      <div className="space-y-4">
        {/* Top Header Switches: 3D Cube Switch & Layer Badges */}
        <div className="flex items-center justify-between p-2.5 bg-white/[0.04] rounded-2xl border border-white/10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateTransform(selectedClip.id, { is3D: !is3D })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                is3D
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md'
                  : 'bg-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <Box className="w-4 h-4 fill-current" />
              <span>{is3D ? '3D Active' : 'Enable 3D Cube'}</span>
            </button>

            {isNull && (
              <span className="px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 text-[11px] font-bold border border-cyan-500/30">
                Null Anchor
              </span>
            )}
            {isCamera && (
              <span className="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 text-[11px] font-bold border border-purple-500/30">
                3D Camera
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onAddNullLayer}
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-cyan-300 text-[11px] font-semibold flex items-center gap-1"
              title="Add Null Organizational Layer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Null</span>
            </button>
            <button
              onClick={onAddCameraLayer}
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-purple-300 text-[11px] font-semibold flex items-center gap-1"
              title="Add 3D Camera Layer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera</span>
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] overflow-x-auto">
          <button
            onClick={() => setActiveTab('position')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
              activeTab === 'position' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            <span>Position</span>
          </button>
          <button
            onClick={() => setActiveTab('rotation')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
              activeTab === 'rotation' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Rotation</span>
          </button>
          <button
            onClick={() => setActiveTab('scale')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
              activeTab === 'scale' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Scale</span>
          </button>
          <button
            onClick={() => setActiveTab('parenting')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
              activeTab === 'parenting' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Parent</span>
          </button>
          {isCamera && (
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                activeTab === 'camera' ? 'bg-purple-500 text-white font-bold' : 'text-purple-300 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Lens</span>
            </button>
          )}
        </div>

        {/* TAB CONTENT: 1. POSITION (X, Y, Z) */}
        {activeTab === 'position' && (
          <div className="space-y-3">
            {/* X Slider */}
            <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.05]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-red-400">Position X (Horizontal)</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono-tabular text-slate-300">{selectedClip.x || 0}</span>
                  <button
                    onClick={() => triggerKeyframe('x')}
                    className="p-1 hover:text-amber-400 transition-colors"
                    title="Keyframe Position X"
                  >
                    <Diamond className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={selectedClip.x || 0}
                onChange={(e) => onUpdateTransform(selectedClip.id, { x: parseInt(e.target.value) })}
                className="w-full accent-red-500 h-2 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            {/* Y Slider */}
            <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.05]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-400">Position Y (Vertical)</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono-tabular text-slate-300">{selectedClip.y || 0}</span>
                  <button
                    onClick={() => triggerKeyframe('y')}
                    className="p-1 hover:text-amber-400 transition-colors"
                    title="Keyframe Position Y"
                  >
                    <Diamond className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={selectedClip.y || 0}
                onChange={(e) => onUpdateTransform(selectedClip.id, { y: parseInt(e.target.value) })}
                className="w-full accent-emerald-500 h-2 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            {/* Z Slider (Depth) */}
            <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.05]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-sky-400">Position Z (3D Depth Parallax)</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono-tabular text-slate-300">{selectedClip.z || 0}</span>
                  <button
                    onClick={() => triggerKeyframe('z')}
                    className="p-1 hover:text-amber-400 transition-colors"
                    title="Keyframe Position Z"
                  >
                    <Diamond className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="-600"
                max="600"
                step="5"
                value={selectedClip.z || 0}
                onChange={(e) => onUpdateTransform(selectedClip.id, { z: parseInt(e.target.value) })}
                className="w-full accent-sky-400 h-2 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* TAB CONTENT: 2. ROTATION (RotateX, RotateY, RotateZ) */}
        {activeTab === 'rotation' && (
          <div className="space-y-3">
            {/* Rotate X */}
            <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.05]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-red-400">Tilt X (Pitch)</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono-tabular text-slate-300">{selectedClip.rotateX || 0}°</span>
                  <button onClick={() => triggerKeyframe('rotateX')} className="p-1 hover:text-amber-400">
                    <Diamond className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={selectedClip.rotateX || 0}
                onChange={(e) => onUpdateTransform(selectedClip.id, { rotateX: parseInt(e.target.value) })}
                className="w-full accent-red-500 h-2 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            {/* Rotate Y */}
            <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.05]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-400">Pan Y (Yaw)</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono-tabular text-slate-300">{selectedClip.rotateY || 0}°</span>
                  <button onClick={() => triggerKeyframe('rotateY')} className="p-1 hover:text-amber-400">
                    <Diamond className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={selectedClip.rotateY || 0}
                onChange={(e) => onUpdateTransform(selectedClip.id, { rotateY: parseInt(e.target.value) })}
                className="w-full accent-emerald-500 h-2 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            {/* Rotate Z */}
            <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.05]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-sky-400">Roll Z</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono-tabular text-slate-300">
                    {selectedClip.rotateZ ?? selectedClip.rotation ?? 0}°
                  </span>
                  <button onClick={() => triggerKeyframe('rotateZ')} className="p-1 hover:text-amber-400">
                    <Diamond className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={selectedClip.rotateZ ?? selectedClip.rotation ?? 0}
                onChange={(e) =>
                  onUpdateTransform(selectedClip.id, {
                    rotateZ: parseInt(e.target.value),
                    rotation: parseInt(e.target.value),
                  })
                }
                className="w-full accent-sky-400 h-2 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* TAB CONTENT: 3. SCALE */}
        {activeTab === 'scale' && (
          <div className="space-y-3">
            <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.05]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-amber-400">Master Scale</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono-tabular text-slate-300">{selectedClip.scale || 1}x</span>
                  <button onClick={() => triggerKeyframe('scale')} className="p-1 hover:text-amber-400">
                    <Diamond className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.05"
                value={selectedClip.scale || 1}
                onChange={(e) => onUpdateTransform(selectedClip.id, { scale: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 h-2 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['0.5', '1.0', '1.5'] as const).map((sc) => (
                <button
                  key={sc}
                  onClick={() => onUpdateTransform(selectedClip.id, { scale: parseFloat(sc) })}
                  className="py-1.5 bg-white/[0.05] hover:bg-white/10 text-xs font-mono-tabular rounded-xl text-slate-200"
                >
                  {sc}x
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB CONTENT: 4. PARENTING HIERARCHY */}
        {activeTab === 'parenting' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Link to Parent Layer:</span>
              {currentParent && (
                <button
                  onClick={() => onUpdateTransform(selectedClip.id, { parentId: null })}
                  className="text-[11px] text-rose-400 hover:underline"
                >
                  Unparent
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              <button
                onClick={() => onUpdateTransform(selectedClip.id, { parentId: null })}
                className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                  !selectedClip.parentId
                    ? 'bg-amber-500/20 border-amber-400 text-white font-bold'
                    : 'bg-white/[0.03] border-white/10 text-slate-300'
                }`}
              >
                <span>None (Root Layer)</span>
                {!selectedClip.parentId && <span className="text-amber-400">✓</span>}
              </button>

              {validParents.map((parent) => (
                <button
                  key={parent.id}
                  onClick={() => onUpdateTransform(selectedClip.id, { parentId: parent.id })}
                  className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                    selectedClip.parentId === parent.id
                      ? 'bg-amber-500/20 border-amber-400 text-white font-bold'
                      : 'bg-white/[0.03] border-white/10 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <GitFork className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="truncate">{parent.name}</span>
                    {parent.mediaType === 'null' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">Null</span>
                    )}
                  </div>
                  {selectedClip.parentId === parent.id && <span className="text-amber-400">✓</span>}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              When linked, moving or rotating the parent moves this child layer while retaining local transforms.
            </p>
          </div>
        )}

        {/* TAB CONTENT: 5. CAMERA 3D CONTROLS */}
        {activeTab === 'camera' && isCamera && (
          <div className="space-y-3">
            {/* Camera View Presets */}
            <div>
              <span className="text-xs text-slate-400 block mb-1.5">Camera Angle Presets</span>
              <div className="grid grid-cols-4 gap-1.5">
                {(['front', 'top', 'isometric', 'orbit'] as const).map((pr) => (
                  <button
                    key={pr}
                    onClick={() => setCameraPreset(pr)}
                    className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-center text-xs capitalize text-purple-300 border border-white/10"
                  >
                    {pr}
                  </button>
                ))}
              </div>
            </div>

            {/* Focal Length / Field of View (FOV) */}
            <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.05]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-purple-400">Focal Length (FOV)</span>
                <span className="text-xs font-mono-tabular text-slate-300">{selectedClip.cameraFov || 50}°</span>
              </div>
              <input
                type="range"
                min="24"
                max="85"
                value={selectedClip.cameraFov || 50}
                onChange={(e) => onUpdateTransform(selectedClip.id, { cameraFov: parseInt(e.target.value) })}
                className="w-full accent-purple-500 h-2 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            {/* Depth of Field (DoF) Toggle */}
            <div className="flex items-center justify-between p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.05]">
              <span className="text-xs font-bold text-white">Depth of Field (DoF Bokeh)</span>
              <button
                onClick={() =>
                  onUpdateTransform(selectedClip.id, {
                    cameraDofEnabled: !selectedClip.cameraDofEnabled,
                  })
                }
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  selectedClip.cameraDofEnabled
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {selectedClip.cameraDofEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomDrawer>
  );
};
