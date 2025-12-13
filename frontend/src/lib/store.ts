import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Session, AgentType } from './api/types';

interface AppState {
  // User
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Current session
  currentSession: Session | null;
  setCurrentSession: (session: Session | null) => void;
  
  // Selected agent
  selectedAgent: AgentType;
  setSelectedAgent: (agent: AgentType) => void;
  
  // Sidebar
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  
  // Theme (for future use)
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  user: null,
  currentSession: null,
  selectedAgent: 'legal' as AgentType,
  sidebarCollapsed: false,
  theme: 'dark' as const,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setUser: (user) => set({ user }),
      setCurrentSession: (session) => set({ currentSession: session }),
      setSelectedAgent: (agent) => set({ selectedAgent: agent }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setTheme: (theme) => set({ theme }),
      reset: () => set(initialState),
    }),
    {
      name: 'co-op-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        selectedAgent: state.selectedAgent,
        theme: state.theme,
      }),
    }
  )
);

// Selectors for better performance
export const useUser = () => useAppStore((state) => state.user);
export const useCurrentSession = () => useAppStore((state) => state.currentSession);
export const useSelectedAgent = () => useAppStore((state) => state.selectedAgent);
export const useSidebarCollapsed = () => useAppStore((state) => state.sidebarCollapsed);
