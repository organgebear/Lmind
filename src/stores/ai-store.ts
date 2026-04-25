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
  /** 全局 AI 默认设置（服务器端配置，作为 fallback） */
  globalSettings: AISettings | null;

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
  /** 从服务器加载全局 AI 默认设置 */
  fetchGlobalSettings: () => Promise<void>;
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
      globalSettings: null,

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
        const { settings, globalSettings } = get();
        const activeProvider = settings.activeProvider;
        const userConfig = settings.providers[activeProvider];
        // if user has configured their own API key, use it
        if (userConfig.apiKey) return userConfig;
        // fallback to global settings
        if (globalSettings) {
          const globalProvider = globalSettings.activeProvider;
          const globalConfig = globalSettings.providers[activeProvider];
          // use global config for the user's active provider if available
          if (globalConfig?.apiKey) return { ...globalConfig, apiKey: globalConfig.apiKey };
          // if user's active provider has no global config, try the global active provider
          if (globalProvider !== activeProvider) {
            const globalActiveConfig = globalSettings.providers[globalProvider];
            if (globalActiveConfig?.apiKey) return { ...globalActiveConfig, apiKey: globalActiveConfig.apiKey };
          }
        }
        return userConfig;
      },

      switchUser: (userId) => {
        const { userSettings } = get();
        const settings = userId && userSettings[userId]
          ? userSettings[userId]
          : DEFAULT_AI_SETTINGS;
        set({ currentUserId: userId, settings, messages: [] });
      },

      fetchGlobalSettings: async () => {
        try {
          const res = await fetch("/api/settings/global");
          if (!res.ok) return;
          const data = await res.json();
          const globalSettings: AISettings = {
            activeProvider: data.activeProvider || DEFAULT_AI_SETTINGS.activeProvider,
            providers: { ...DEFAULT_AI_SETTINGS.providers },
          };
          for (const p of ["deepseek", "chatgpt", "qwen"] as AIProvider[]) {
            if (data[p]) {
              try {
                const cfg = typeof data[p] === "string" ? JSON.parse(data[p]) : data[p];
                if (cfg.apiKey) globalSettings.providers[p].apiKey = cfg.apiKey;
                if (cfg.model) globalSettings.providers[p].model = cfg.model;
                if (cfg.baseUrl) globalSettings.providers[p].baseUrl = cfg.baseUrl;
              } catch { /* ignore */ }
            }
          }
          set({ globalSettings });
        } catch { /* ignore */ }
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
