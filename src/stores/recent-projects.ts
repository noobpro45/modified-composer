import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RecentProject {
  path: string;
  title: string;
  lastOpened: number;
}

interface RecentProjectsState {
  projects: RecentProject[];
  addProject: (path: string, title: string) => void;
  removeProject: (path: string) => void;
  clearAll: () => void;
}

export const useRecentProjectsStore = create<RecentProjectsState>()(
  persist(
    (set) => ({
      projects: [],
      addProject: (path, title) =>
        set((state) => {
          const now = Date.now();
          const existing = state.projects.filter((p) => p.path !== path);
          return {
            projects: [{ path, title, lastOpened: now }, ...existing].slice(0, 10), // Keep top 10
          };
        }),
      removeProject: (path) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.path !== path),
        })),
      clearAll: () => set({ projects: [] }),
    }),
    {
      name: "composer-recent-projects",
    }
  )
);
