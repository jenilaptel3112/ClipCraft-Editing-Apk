import React, { useState } from 'react';
import {
  Plus,
  Settings,
  Cloud,
  Film,
  MoreVertical,
  Trash2,
  Copy,
  Edit2,
  Clock,
  Play,
  Sparkles,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { ProjectData, ProjectSettings } from '../types/editor';
import { createDefaultProjectSettings } from '../utils/presets';
import { ProjectSettingsModal } from '../components/ProjectSettingsModal';

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `Edited ${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `Edited ${Math.floor(diffSec / 3600)}h ago`;
  return `Edited ${Math.floor(diffSec / 86400)}d ago`;
}

export const DashboardScreen: React.FC = () => {
  const {
    projects,
    openProject,
    setCurrentScreen,
    duplicateProject,
    deleteProject,
    renameProject,
  } = useProject();

  const [activeMenuProjectId, setActiveMenuProjectId] = useState<string | null>(null);
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameTitleInput, setRenameTitleInput] = useState('');
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<ProjectData | null>(null);
  const [settingsModalProject, setSettingsModalProject] = useState<ProjectData | null>(null);

  const startRename = (p: ProjectData) => {
    setRenamingProjectId(p.id);
    setRenameTitleInput(p.title);
    setActiveMenuProjectId(null);
  };

  const submitRename = (projectId: string) => {
    if (renameTitleInput.trim()) {
      renameProject(projectId, renameTitleInput.trim());
    }
    setRenamingProjectId(null);
  };

  return (
    <div className="flex flex-col w-full h-dvh bg-[#08090E] text-slate-100 overflow-hidden select-none">
      {/* 1. Header: Branding, User Cloud Sync, Settings */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#0E1017] border-b border-white/[0.08] shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
            <Film className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
              <span>ClipCraft</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                PRO
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* User cloud-sync status indicator */}
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <Cloud className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium hidden sm:inline">Synced</span>
          </div>

          <button
            onClick={() => {
              if (projects.length > 0) {
                setSettingsModalProject(projects[0]);
              }
            }}
            className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 flex items-center justify-center text-slate-300 transition-all cursor-pointer"
            title="Project Settings"
          >
            <Settings className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* 2. Hero CTA: [ + New Project ] */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 p-6 text-slate-950 shadow-xl shadow-amber-500/10">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-slate-900" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  ClipCraft
                </span>
              </div>
              <h2 className="text-2xl font-black font-display tracking-tight text-slate-950">
                Create New Video
              </h2>
              <p className="text-xs font-medium text-slate-900 mt-1 max-w-sm">
                Smooth 60fps canvas timeline, viral text presets, and cinematic video effects.
              </p>
            </div>

            <button
              onClick={() => setCurrentScreen('MEDIA_PICKER_MODAL')}
              className="min-h-[50px] px-6 py-3 rounded-2xl bg-slate-950 hover:bg-slate-900 active:scale-95 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-2xl transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-5 h-5 text-amber-400" />
              <span>+ New Project</span>
            </button>
          </div>

          {/* Decorative backdrop glow */}
          <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-white/20 blur-2xl pointer-events-none" />
        </div>

        {/* 3. Projects Grid Header */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-tight">Recent Projects</h3>
            <span className="text-xs font-mono-tabular text-slate-500">
              ({projects.length})
            </span>
          </div>
        </div>

        {/* Project Cards Grid */}
        {projects.length === 0 ? (
          // Empty State
          <div className="p-10 rounded-3xl bg-white/[0.02] border border-white/[0.06] text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center text-slate-400">
              <Film className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">No projects yet</h4>
              <p className="text-xs text-slate-400 mt-1">
                Tap &ldquo;+ New Project&rdquo; to start editing your first reel or shorts video.
              </p>
            </div>
            <button
              onClick={() => setCurrentScreen('MEDIA_PICKER_MODAL')}
              className="mt-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => openProject(project.id)}
                className="group relative rounded-2xl bg-[#12141D] hover:bg-[#161924] border border-white/[0.08] hover:border-amber-400/50 p-3 transition-all cursor-pointer shadow-lg flex flex-col justify-between"
              >
                {/* Auto-generated video thumbnail with Aspect Ratio badge */}
                <div
                  className={`relative w-full h-36 rounded-xl bg-gradient-to-br ${
                    project.thumbnailGradient || 'from-blue-600 via-indigo-700 to-purple-900'
                  } flex items-center justify-center overflow-hidden mb-3 shadow-inner`}
                >
                  <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 fill-current ml-0.5 text-amber-400" />
                  </div>

                  {/* Aspect Ratio & Resolution Tier Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-mono-tabular font-bold text-amber-400 border border-white/10">
                      {project.aspectRatio}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-mono-tabular font-semibold text-slate-300 border border-white/10">
                      {project.settings?.resolutionTier || '1080p'}
                    </span>
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-mono-tabular text-slate-200">
                    {project.duration}s
                  </div>
                </div>

                {/* Project Title and Metadata */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {renamingProjectId === project.id ? (
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={renameTitleInput}
                          onChange={(e) => setRenameTitleInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitRename(project.id);
                          }}
                          className="w-full px-2 py-1 bg-black/60 border border-amber-400 rounded-lg text-xs text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => submitRename(project.id)}
                          className="px-2 py-1 rounded bg-amber-500 text-slate-950 font-bold text-xs"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                        {project.title}
                      </h4>
                    )}

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 font-mono-tabular">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{formatTimeAgo(project.modifiedAt)}</span>
                    </div>
                  </div>

                  {/* Contextual 3-dot menu (⋮) */}
                  <div
                    className="relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() =>
                        setActiveMenuProjectId(
                          activeMenuProjectId === project.id ? null : project.id
                        )
                      }
                      className="p-1 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white"
                      title="Project Options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenuProjectId === project.id && (
                      <div className="absolute right-0 bottom-full mb-1 w-36 rounded-xl bg-[#1C1F2C] border border-white/10 shadow-2xl p-1 z-30 space-y-0.5">
                        <button
                          onClick={() => {
                            setSettingsModalProject(project);
                            setActiveMenuProjectId(null);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-200 hover:bg-white/[0.08] flex items-center gap-2 cursor-pointer"
                        >
                          <Settings className="w-3.5 h-3.5 text-amber-400" />
                          <span>Settings</span>
                        </button>
                        <button
                          onClick={() => startRename(project)}
                          className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-200 hover:bg-white/[0.08] flex items-center gap-2"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Rename</span>
                        </button>
                        <button
                          onClick={() => {
                            duplicateProject(project.id);
                            setActiveMenuProjectId(null);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-slate-200 hover:bg-white/[0.08] flex items-center gap-2"
                        >
                          <Copy className="w-3.5 h-3.5 text-sky-400" />
                          <span>Duplicate</span>
                        </button>
                        <button
                          onClick={() => {
                            setDeleteConfirmProject(project);
                            setActiveMenuProjectId(null);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-[#141722] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white font-display">Delete Project?</h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to delete &ldquo;{deleteConfirmProject.title}&rdquo;? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmProject(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/[0.08]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteProject(deleteConfirmProject.id);
                  setDeleteConfirmProject(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Configuration Modal */}
      {settingsModalProject && (
        <ProjectSettingsModal
          isOpen={Boolean(settingsModalProject)}
          initialSettings={
            settingsModalProject.settings ||
            createDefaultProjectSettings(
              settingsModalProject.id,
              settingsModalProject.title,
              settingsModalProject.aspectRatio
            )
          }
          onClose={() => setSettingsModalProject(null)}
          onSave={(updatedSettings) => {
            renameProject(settingsModalProject.id, updatedSettings.name);
            setSettingsModalProject(null);
          }}
        />
      )}
    </div>
  );
};
