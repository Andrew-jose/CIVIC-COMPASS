import { create } from 'zustand';

/**
 * ═══════════════════════════════════════════════════════
 * CIVIC COMPASS — Session Store (Zustand)
 * Global state for user session, jurisdiction, conversation,
 * and journey progress.
 * ═══════════════════════════════════════════════════════
 */

export interface JurisdictionContext {
  state: string;
  county: string;
  registrationDeadline?: string;
  earlyVotingStart?: string;
  earlyVotingEnd?: string;
  electionDay?: string;
  mailBallotDeadline?: string;
  runoffDate?: string;
  certificationDate?: string;
  idRequirements?: string[];
  pollingHours?: string;
  officialWebsite?: string;
  registrationUrl?: string;
  sampleBallotUrl?: string;
  electionOfficePhone?: string;
  electionOfficeName?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  confidence?: number;
  sources?: Array<{ title: string; url: string }>;
  thoughtSignature?: string;
  isStreaming?: boolean;
}

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  whyItMatters?: string;
  deadline?: string;
  officialUrl?: string;
  priority: 'critical' | 'important' | 'optional';
  completed: boolean;
}

interface SessionState {
  // Session
  sessionId: string | null;
  language: string;

  // Jurisdiction
  jurisdiction: JurisdictionContext | null;
  isJurisdictionResolved: boolean;

  // Conversation
  messages: ChatMessage[];
  isStreaming: boolean;

  // Checklist
  checklistItems: ChecklistItem[];

  // Actions
  setSessionId: (id: string) => void;
  setLanguage: (lang: string) => void;
  setJurisdiction: (ctx: JurisdictionContext) => void;
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setStreaming: (streaming: boolean) => void;
  setChecklistItems: (items: ChecklistItem[]) => void;
  toggleChecklistItem: (id: string) => void;
  clearConversation: () => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  // Initial state
  sessionId: null,
  language: 'en',
  jurisdiction: null,
  isJurisdictionResolved: false,
  messages: [],
  isStreaming: false,
  checklistItems: [],

  // Actions
  setSessionId: (id) => set({ sessionId: id }),

  setLanguage: (lang) => set({ language: lang }),

  setJurisdiction: (ctx) => set({
    jurisdiction: ctx,
    isJurisdictionResolved: true,
  }),

  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, msg],
  })),

  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map((m) =>
      m.id === id ? { ...m, ...updates } : m
    ),
  })),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  setChecklistItems: (items) => set({ checklistItems: items }),

  toggleChecklistItem: (id) => set((state) => ({
    checklistItems: state.checklistItems.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    ),
  })),

  clearConversation: () => set({ messages: [] }),

  resetSession: () => set({
    sessionId: null,
    jurisdiction: null,
    isJurisdictionResolved: false,
    messages: [],
    isStreaming: false,
    checklistItems: [],
  }),
}));
