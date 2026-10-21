import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ProjectData, AppScreen, AspectRatio, TimelineClip, TrackMeta } from '../types/editor';
import { INITIAL_CLIPS, INITIAL_TRACKS } from '../utils/presets';

interface ProjectContextType {
  currentScreen: AppScreen;
  setCurrentScreen: (screen: AppScreen) => void;
  projects: ProjectData[];
  activeProject: ProjectData | null;
  activeProjectId: string | null;
  createNewProject: (title?: string, aspectRatio?: AspectRatio, initialClips?: TimelineClip[]) => ProjectData;
  openProject: (projectId: string) => void;
  updateActiveProject: (updates: Partial<ProjectData>) => void;
  duplicateProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  renameProject: (projectId: string, newTitle: string) => void;
  saveCurrentProjectState: () => void;
}

const STORAGE_KEY = 'clipcraft_studio_projects_v2';
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
  },
];

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('DASHBOARD_SCREEN');
  const [projects, setProjects] = useState<ProjectData[]>(() => {
    if (typeof window === 'undefined') return SAMPLE_PROJECTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
      prev.map((p) =>
        p.id === activeProjectId
          ? { ...p, ...updates, modifiedAt: Date.now() }
          : p
      )
    );
  }, [activeProjectId]);

  // Create new project
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

      const newProject: ProjectData = {
        id,
        title: title || `Untitled Video ${projects.length + 1}`,
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
      const duplicated: ProjectData = {
        ...target,
        id: `proj-${Date.now()}`,
        title: `${target.title} (Copy)`,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
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
      prev.map((p) =>
        p.id === projectId ? { ...p, title: newTitle.trim(), modifiedAt: Date.now() } : p
      )
    );
  }, []);

  const saveCurrentProjectState = useCallback(() => {
    // Force sync
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
        openProject,
        updateActiveProject,
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
