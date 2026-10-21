import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ProjectData,
  ProjectSettings,
  AppScreen,
  AspectRatio,
  TimelineClip,
  TrackMeta,
} from '../types/editor';
import { INITIAL_CLIPS, INITIAL_TRACKS, createDefaultProjectSettings } from '../utils/presets';

interface ProjectContextType {
  currentScreen: AppScreen;
  setCurrentScreen: (screen: AppScreen) => void;
  projects: ProjectData[];
  activeProject: ProjectData | null;
  activeProjectId: string | null;
  createNewProject: (title?: string, aspectRatio?: AspectRatio, initialClips?: TimelineClip[]) => ProjectData;
  createNewProjectWithSettings: (settings: Partial<ProjectSettings>, initialClips?: TimelineClip[]) => ProjectData;
  openProject: (projectId: string) => void;
  updateActiveProject: (updates: Partial<ProjectData>) => void;
  updateActiveProjectSettings: (updates: Partial<ProjectSettings>) => void;
  duplicateProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  renameProject: (projectId: string, newTitle: string) => void;
  saveCurrentProjectState: () => void;
}

const STORAGE_KEY = 'clipcraft_studio_projects_v3';
const ACTIVE_ID_KEY = 'clipcraft_active_project_id';

const SAMPLE_PROJECTS: ProjectData[] = [
  {
    id: 'sample-project-neon-horizon',
    title: 'Neon Horizon Reel',
    createdAt: Date.now() - 3600000 * 4,
    modifiedAt: Date.now() - 3600000 * 2,
    aspectRatio: '9:16',
    fitMode: 'cover',
    thumbnailGradient: 'from-fuchsia-600 via-purple-800 to-indigo-950',
    duration: 13.0,
    clips: INITIAL_CLIPS,
    tracks: INITIAL_TRACKS,
    settings: {
      id: 'sample-project-neon-horizon',
      name: 'Neon Horizon Reel',
      createdAt: Date.now() - 3600000 * 4,
      lastModified: Date.now() - 3600000 * 2,
      aspectRatio: '9:16',
      resolutionTier: '1080p',
      frameRate: 30,
      sampleRate: 48000,
      backgroundColor: '#000000',
      backgroundBlurFallback: true,
      timecodeDisplay: 'compact',
    },
  },
  {
    id: 'sample-project-golden-hour',
    title: 'Golden Waves Cinematic',
    createdAt: Date.now() - 3600000 * 24,
    modifiedAt: Date.now() - 3600000 * 8,
    aspectRatio: '16:9',
    fitMode: 'cover',
    thumbnailGradient: 'from-amber-500 via-orange-600 to-slate-900',
    duration: 9.0,
    clips: INITIAL_CLIPS.slice(1, 3).map((c, i) => ({
      ...c,
      startTime: i * 4.5,
    })),
    tracks: INITIAL_TRACKS,
    settings: {
      id: 'sample-project-golden-hour',
      name: 'Golden Waves Cinematic',
      createdAt: Date.now() - 3600000 * 24,
      lastModified: Date.now() - 3600000 * 8,
      aspectRatio: '16:9',
      resolutionTier: '1080p',
      frameRate: 24,
      sampleRate: 48000,
      backgroundColor: '#000000',
      backgroundBlurFallback: true,
      timecodeDisplay: 'hmsf',
    },
  },
];

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('DASHBOARD_SCREEN');
  const [projects, setProjects] = useState<ProjectData[]>(() => {
    if (typeof window === 'undefined') return SAMPLE_PROJECTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('clipcraft_studio_projects_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Hydrate any missing settings
          return parsed.map((p: Partial<ProjectData> & { settings?: ProjectSettings }) => ({
            ...p,
            settings: p.settings || createDefaultProjectSettings(p.id, p.title, p.aspectRatio || '9:16'),
          })) as ProjectData[];
        }
      }
    } catch {
      // fallback
    }
    return SAMPLE_PROJECTS;
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACTIVE_ID_KEY) || null;
  });

  // Save projects to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch {
      // storage limit or safe fallback
    }
  }, [projects]);

  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem(ACTIVE_ID_KEY, activeProjectId);
    } else {
      localStorage.removeItem(ACTIVE_ID_KEY);
    }
  }, [activeProjectId]);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  // Open existing project
  const openProject = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
    setCurrentScreen('EDITOR_SCREEN');
  }, []);

  // Update active project
  const updateActiveProject = useCallback((updates: Partial<ProjectData>) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== activeProjectId) return p;
        const updated = { ...p, ...updates, modifiedAt: Date.now() };
        if (updates.aspectRatio && updated.settings) {
          updated.settings = { ...updated.settings, aspectRatio: updates.aspectRatio };
        }
        if (updates.title && updated.settings) {
          updated.settings = { ...updated.settings, name: updates.title };
        }
        return updated;
      })
    );
  }, [activeProjectId]);

  // Update active project settings
  const updateActiveProjectSettings = useCallback(
    (updates: Partial<ProjectSettings>) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== activeProjectId) return p;
          const currentSettings = p.settings || createDefaultProjectSettings(p.id, p.title, p.aspectRatio);
          const nextSettings: ProjectSettings = {
            ...currentSettings,
            ...updates,
            lastModified: Date.now(),
          };

          return {
            ...p,
            title: nextSettings.name || p.title,
            aspectRatio: nextSettings.aspectRatio || p.aspectRatio,
            modifiedAt: Date.now(),
            settings: nextSettings,
          };
        })
      );
    },
    [activeProjectId]
  );

  // Create new project with basic params
  const createNewProject = useCallback(
    (
      title?: string,
      aspectRatio: AspectRatio = '9:16',
      initialClips?: TimelineClip[]
    ): ProjectData => {
      const id = `proj-${Date.now()}`;
      const defaultDuration = initialClips && initialClips.length > 0
        ? Math.max(...initialClips.map((c) => c.startTime + c.duration))
        : 13.0;

      const projTitle = title || `Untitled Video ${projects.length + 1}`;
      const settings = createDefaultProjectSettings(id, projTitle, aspectRatio);

      const newProject: ProjectData = {
        id,
        title: projTitle,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        aspectRatio,
        fitMode: 'cover',
        thumbnailGradient:
          aspectRatio === '9:16'
            ? 'from-blue-600 via-indigo-700 to-purple-900'
            : 'from-amber-600 via-orange-700 to-slate-900',
        duration: +defaultDuration.toFixed(1),
        clips: initialClips || INITIAL_CLIPS,
        tracks: INITIAL_TRACKS,
        settings,
      };

      setProjects((prev) => [newProject, ...prev]);
      setActiveProjectId(id);
      setCurrentScreen('EDITOR_SCREEN');
      return newProject;
    },
    [projects.length]
  );

  // Create new project with full ProjectSettings
  const createNewProjectWithSettings = useCallback(
    (
      customSettings: Partial<ProjectSettings>,
      initialClips?: TimelineClip[]
    ): ProjectData => {
      const id = customSettings.id || `proj-${Date.now()}`;
      const projTitle = customSettings.name || `Project ${projects.length + 1}`;
      const aspectRatio = customSettings.aspectRatio || '9:16';
      const defaultDuration = initialClips && initialClips.length > 0
        ? Math.max(...initialClips.map((c) => c.startTime + c.duration))
        : 13.0;

      const fullSettings: ProjectSettings = {
        ...createDefaultProjectSettings(id, projTitle, aspectRatio),
        ...customSettings,
      };

      const newProject: ProjectData = {
        id,
        title: projTitle,
        createdAt: fullSettings.createdAt,
        modifiedAt: fullSettings.lastModified,
        aspectRatio,
        fitMode: 'cover',
        thumbnailGradient:
          aspectRatio === '9:16'
            ? 'from-blue-600 via-indigo-700 to-purple-900'
            : 'from-amber-600 via-orange-700 to-slate-900',
        duration: +defaultDuration.toFixed(1),
        clips: initialClips || INITIAL_CLIPS,
        tracks: INITIAL_TRACKS,
        settings: fullSettings,
      };

      setProjects((prev) => [newProject, ...prev]);
      setActiveProjectId(id);
      setCurrentScreen('EDITOR_SCREEN');
      return newProject;
    },
    [projects.length]
  );

  // Duplicate project
  const duplicateProject = useCallback(
    (projectId: string) => {
      const target = projects.find((p) => p.id === projectId);
      if (!target) return;
      const newId = `proj-${Date.now()}`;
      const duplicated: ProjectData = {
        ...target,
        id: newId,
        title: `${target.title} (Copy)`,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        settings: {
          ...target.settings,
          id: newId,
          name: `${target.title} (Copy)`,
          createdAt: Date.now(),
          lastModified: Date.now(),
        },
      };
      setProjects((prev) => [duplicated, ...prev]);
    },
    [projects]
  );

  // Delete project
  const deleteProject = useCallback(
    (projectId: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (activeProjectId === projectId) {
        setActiveProjectId(null);
        setCurrentScreen('DASHBOARD_SCREEN');
      }
    },
    [activeProjectId]
  );

  // Rename project
  const renameProject = useCallback((projectId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          title: newTitle.trim(),
          modifiedAt: Date.now(),
          settings: { ...p.settings, name: newTitle.trim(), lastModified: Date.now() },
        };
      })
    );
  }, []);

  const saveCurrentProjectState = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch {}
  }, [projects]);

  return (
    <ProjectContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        projects,
        activeProject,
        activeProjectId,
        createNewProject,
        createNewProjectWithSettings,
        openProject,
        updateActiveProject,
        updateActiveProjectSettings,
        duplicateProject,
        deleteProject,
        renameProject,
        saveCurrentProjectState,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
