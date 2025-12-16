import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Session, AgentType } from './api/types';

// ============================================
// User Store
// ============================================
interface UserState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ user: null, isLoading: false }),
}));

// ============================================
// Session Store
// ============================================
interface SessionState {
  currentSession: Session | null;
  sessions: Session[];
  setCurrentSession: (session: Session | null) => void;
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  updateSession: (id: string, updates: Partial<Session>) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentSession: null,
  sessions: [],
  setCurrentSession: (currentSession) => set({ currentSession }),
  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((state) => ({ sessions: [session, ...state.sessions] })),
  updateSession: (id, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      currentSession:
        state.currentSession?.id === id
          ? { ...state.currentSession, ...updates }
          : state.currentSession,
    })),
  clear: () => set({ currentSession: null, sessions: [] }),
}));

// ============================================
// Chat Store
// ============================================
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agent?: AgentType | 'multi';
  confidence?: number;
  sources?: string[];
  timestamp: Date;
  isStreaming?: boolean;
  thinkingSteps?: string[];
}

interface ChatState {
  messages: ChatMessage[];
  selectedAgent: AgentType | null; // null = multi-agent A2A mode
  isLoading: boolean;
  lastUserPrompt: string | null; // For regenerate functionality
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  removeMessage: (id: string) => void;
  setSelectedAgent: (agent: AgentType | null) => void;
  setLoading: (loading: boolean) => void;
  setLastUserPrompt: (prompt: string | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  selectedAgent: null, // Default to multi-agent A2A mode
  isLoading: false,
  lastUserPrompt: null,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    })),
  setSelectedAgent: (selectedAgent) => set({ selectedAgent }),
  setLoading: (isLoading) => set({ isLoading }),
  setLastUserPrompt: (lastUserPrompt) => set({ lastUserPrompt }),
  clearMessages: () => set({ messages: [], lastUserPrompt: null }),
}));

// ============================================
// UI Store (persisted)
// ============================================
interface UIState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: 'system',
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'co-op-ui',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed, theme: state.theme }),
    }
  )
);
