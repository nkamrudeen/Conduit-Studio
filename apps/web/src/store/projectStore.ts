import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ProjectState {
  projectFolder: string | null
  setProjectFolder: (path: string) => void
  clearProjectFolder: () => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projectFolder: null,
      setProjectFolder: (path) => set({ projectFolder: path }),
      clearProjectFolder: () => set({ projectFolder: null }),
    }),
    { name: 'conduit:project' },
  ),
)
