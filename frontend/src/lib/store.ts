import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    set => ({
      theme: 'system',
      setTheme: theme => set({ theme }),
    }),
    {
      name: 'co-op-ui',
      partialize: state => ({ theme: state.theme }),
    },
  ),
);
