import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TemplateEntry } from '../data/templates'

export interface UserTemplateEntry extends TemplateEntry {
  /** Unique ID for the user-created template */
  id: string
  createdAt: string
}

interface UserTemplateState {
  templates: UserTemplateEntry[]
  save: (entry: Omit<UserTemplateEntry, 'id' | 'createdAt'>) => void
  remove: (id: string) => void
}

export const useUserTemplateStore = create<UserTemplateState>()(
  persist(
    (set) => ({
      templates: [],
      save: (entry) =>
        set((state) => ({
          templates: [
            ...state.templates,
            {
              ...entry,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      remove: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        })),
    }),
    { name: 'conduitcraft:user-templates' },
  ),
)
