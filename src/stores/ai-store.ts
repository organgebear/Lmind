import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AIMessage, AISettings, AIProvider, AIProviderConfig } from "@/types";
import { DEFAULT_AI_SETTINGS } from "@/types";
import { genId } from "@/lib/id";

interface AIState {
  messages: AIMessage[];
  panelOpen: boolean;
  loading: boolean;
  settings: AISettings;
  /** 当前选中的节点 ID（用于节点级 AI 生成） */
  selectedNodeId: string | null;
  /** 面板宽度 */
  panelWidth: number;
  /** 每个用户独立的 AI 设置（按 email 索引） */
  userSettings: Record<string, AISettings>;
  /** 当前用户 ID */
  currentUserId: string | null;

  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  addMessage: (msg: Omit<AIMessage, "id" | "timestamp">) => void;
  updateMessage: (id: string, updates: Partial<AIMessage>) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setActiveProvider: (provider: AIProvider) => void;
  updateProviderConfig: (provider: AIProvider, config: Partial<AIProviderConfig>) => void;
  setSelectedNodeId: (id: string | null) => void;
  setPanelWidth: (width: number) => void;
  getActiveConfig: () => AIProviderConfig;
  /** 切换当前用户，加载该用户的 AI 设置 */
  switchUser: (userId: string | null) => void;
}

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      messages: [],
      panelOpen: false,
      loading: false,
      settings: DEFAULT_AI_SETTINGS,
      selectedNodeId: null,
      panelWidth: 380,
      userSettings: {},
      currentUserId: null,

      togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
      setPanelOpen: (open) => set({ panelOpen: open }),

      addMessage: (msg) =>
        set((s) => ({
          messages: [
            ...s.messages,
            { ...msg, id: genId(), timestamp: new Date().toISOString() },
          ],
        })),

      updateMessage: (id, updates) =>
        set((s) => ({
          messages: s.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),

      clearMessages: () => set({ messages: [] }),
      setLoading: (loading) => set({ loading }),

      setActiveProvider: (provider) =>
        set((s) => {
          const newSettings = { ...s.settings, activeProvider: provider };
          const newUserSettings = s.currentUserId
            ? { ...s.userSettings, [s.currentUserId]: newSettings }
            : s.userSettings;
          return { settings: newSettings, userSettings: newUserSettings };
        }),

      updateProviderConfig: (provider, config) =>
        set((s) => {
          const newSettings = {
            ...s.settings,
            providers: {
              ...s.settings.providers,
              [provider]: { ...s.settings.providers[provider], ...config },
            },
          };
          const newUserSettings = s.currentUserId
            ? { ...s.userSettings, [s.currentUserId]: newSettings }
            : s.userSettings;
          return { settings: newSettings, userSettings: newUserSettings };
        }),

      setSelectedNodeId: (id) => set({ selectedNodeId: id }),
      setPanelWidth: (width) => set({ panelWidth: width }),

      getActiveConfig: () => {
        const { settings } = get();
        return settings.providers[settings.activeProvider];
      },

      switchUser: (userId) => {
        const { userSettings } = get();
        const settings = userId && userSettings[userId]
          ? userSettings[userId]
          : DEFAULT_AI_SETTINGS;
        set({ currentUserId: userId, settings, messages: [] });
      },
    }),
    {
      name: "lmind-ai",
      partialize: (state) => ({
        settings: state.settings,
        panelWidth: state.panelWidth,
        userSettings: state.userSettings,
        currentUserId: state.currentUserId,
      }),
    }
  )
);
