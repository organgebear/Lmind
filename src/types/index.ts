export interface MindMapNode {
  id: string;
  label: string;
  children: MindMapNode[];
  collapsed?: boolean;
  notes?: string;
  /** 节点附带的图片（base64 data URL） */
  images?: string[];
}

export interface Document {
  id: string;
  title: string;
  rootNode: MindMapNode;
  createdAt: string;
  updatedAt: string;
  /** 文档所属用户（email） */
  userId?: string;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  /** 如果是针对某个节点的 AI 请求 */
  targetNodeId?: string;
  /** AI 建议的修改（待确认） */
  pendingChanges?: PendingChange;
  /** 用户上传的图片（base64 data URL） */
  images?: string[];
}

export interface PendingChange {
  type: "update_tree" | "expand_node";
  targetNodeId?: string;
  newSubtree?: MindMapNode;
  description: string;
}

export type AIProvider = "deepseek" | "chatgpt" | "qwen";

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface AISettings {
  activeProvider: AIProvider;
  providers: Record<AIProvider, AIProviderConfig>;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  activeProvider: "deepseek",
  providers: {
    deepseek: {
      apiKey: "",
      model: "deepseek-chat",
      baseUrl: "https://api.deepseek.com",
    },
    chatgpt: {
      apiKey: "",
      model: "gpt-4o-mini",
      baseUrl: "https://api.openai.com",
    },
    qwen: {
      apiKey: "",
      model: "qwen-plus",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode",
    },
  },
};
