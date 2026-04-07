"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAIStore } from "@/stores/ai-store";
import { useDocumentStore } from "@/stores/document-store";
import {
  chatWithAI,
  buildCanvasPrompt,
  buildNodeExpandPrompt,
  parseAIResponseToTree,
  extractDescription,
  buildContextMessages,
} from "@/lib/ai-service";
import type { MindMapNode, PendingChange, AIProvider } from "@/types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const PROVIDER_LABELS: Record<AIProvider, string> = {
  deepseek: "DeepSeek",
  chatgpt: "ChatGPT",
  qwen: "通义千问",
};

interface AIPanelProps {
  docId: string;
}

export default function AIPanel({ docId }: AIPanelProps) {
  const {
    messages,
    panelOpen,
    loading,
    settings,
    selectedNodeId,
    panelWidth,
    addMessage,
    updateMessage,
    setLoading,
    setPanelOpen,
    setSelectedNodeId,
    setPanelWidth,
    clearMessages,
    setActiveProvider,
  } = useAIStore();

  const { documents, updateRootNode } = useDocumentStore();
  const doc = documents.find((d) => d.id === docId);

  const [input, setInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close model picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setShowModelPicker(false);
      }
    };
    if (showModelPicker) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showModelPicker]);

  // Resize handler
  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizeRef.current = { startX: e.clientX, startWidth: panelWidth };
      const onMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const diff = ev.clientX - resizeRef.current.startX;
        const newWidth = Math.max(300, Math.min(700, resizeRef.current.startWidth + diff));
        setPanelWidth(newWidth);
      };
      const onUp = () => {
        resizeRef.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [panelWidth, setPanelWidth]
  );

  // Find target node label
  const findNode = useCallback(
    (node: MindMapNode, id: string): MindMapNode | null => {
      if (node.id === id) return node;
      for (const child of node.children) {
        const found = findNode(child, id);
        if (found) return found;
      }
      return null;
    },
    []
  );

  const selectedNodeLabel = selectedNodeId && doc
    ? findNode(doc.rootNode, selectedNodeId)?.label
    : null;

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Send message with context understanding
  const handleSend = useCallback(async () => {
    if (!input.trim() || loading || !doc) return;

    const config = settings.providers[settings.activeProvider];
    if (!config.apiKey) {
      addMessage({ role: "assistant", content: "请先在设置中配置 API Key。" });
      return;
    }

    const userMsg = input.trim();
    const currentImages = [...images];
    setInput("");
    setImages([]);

    // Add user message with images
    addMessage({
      role: "user",
      content: userMsg,
      targetNodeId: selectedNodeId ?? undefined,
      images: currentImages.length ? currentImages : undefined,
    });

    setLoading(true);

    try {
      // 始终从 store 读最新文档，避免闭包过期
      const latestDoc = useDocumentStore.getState().documents.find((d) => d.id === docId);
      if (!latestDoc) return;

      // Build context from history
      const contextMsgs = buildContextMessages(useAIStore.getState().messages);

      // Build prompt based on context
      const chatMessages = selectedNodeId
        ? buildNodeExpandPrompt(latestDoc.rootNode, selectedNodeId, userMsg, contextMsgs, currentImages)
        : buildCanvasPrompt(latestDoc.rootNode, userMsg, contextMsgs, currentImages);

      // Create placeholder for streaming
      addMessage({ role: "assistant", content: "..." });

      let finalContent = "";
      const result = await chatWithAI(config, chatMessages, (text) => {
        finalContent = text;
        const msgs = useAIStore.getState().messages;
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg) {
          // Show only description during streaming
          updateMessage(lastMsg.id, { content: extractDescription(text) || text });
        }
      });

      finalContent = finalContent || result;

      // Parse AI response for pending changes
      const parsed = parseAIResponseToTree(finalContent);
      const msgs = useAIStore.getState().messages;
      const lastMsg = msgs[msgs.length - 1];

      if (parsed && lastMsg) {
        const description = extractDescription(finalContent) || (selectedNodeId
          ? `为「${selectedNodeLabel}」生成子节点`
          : "更新整个思维导图");

        const pendingChange: PendingChange = selectedNodeId
          ? {
              type: "expand_node",
              targetNodeId: selectedNodeId,
              newSubtree: parsed,
              description: `为「${selectedNodeLabel}」生成子节点`,
            }
          : {
              type: "update_tree",
              newSubtree: parsed,
              description: "更新整个思维导图",
            };

        // Only show description, not raw JSON
        updateMessage(lastMsg.id, {
          content: description,
          pendingChanges: pendingChange,
        });
      } else if (lastMsg) {
        // AI 未返回有效 JSON 树结构
        const desc = extractDescription(finalContent) || finalContent;
        if (selectedNodeId) {
          // 节点拓展场景下 AI 应返回 JSON，未返回时提示用户重试
          updateMessage(lastMsg.id, {
            content: desc || "AI 未能生成有效的节点结构，请重新描述需求后再试。",
          });
        } else {
          updateMessage(lastMsg.id, { content: desc });
        }
      }
    } catch (err) {
      addMessage({
        role: "assistant",
        content: `错误: ${err instanceof Error ? err.message : "请求失败"}`,
      });
    } finally {
      setLoading(false);
      setSelectedNodeId(null);
    }
  }, [input, images, loading, doc, docId, settings, selectedNodeId, selectedNodeLabel, addMessage, updateMessage, setLoading, setSelectedNodeId]);

  // Apply pending changes
  const applyChange = useCallback(
    (change: PendingChange, messageId: string) => {
      // 始终从 store 读最新文档，避免闭包过期
      const currentDoc = useDocumentStore.getState().documents.find((d) => d.id === docId);
      if (!currentDoc) return;

      if (change.type === "update_tree" && change.newSubtree) {
        updateRootNode(docId, { ...change.newSubtree, id: "root" });
      } else if (change.type === "expand_node" && change.targetNodeId && change.newSubtree) {
        const updateTree = (node: MindMapNode): MindMapNode => {
          if (node.id === change.targetNodeId) {
            return {
              ...node,
              children: [...node.children, ...change.newSubtree!.children],
            };
          }
          return { ...node, children: node.children.map(updateTree) };
        };
        updateRootNode(docId, updateTree(currentDoc.rootNode));
      }

      updateMessage(messageId, { pendingChanges: undefined });
      addMessage({ role: "assistant", content: "已应用修改。" });
    },
    [docId, updateRootNode, updateMessage, addMessage]
  );

  const rejectChange = useCallback(
    (messageId: string) => {
      updateMessage(messageId, { pendingChanges: undefined });
      addMessage({ role: "assistant", content: "已取消修改。" });
    },
    [updateMessage, addMessage]
  );

  if (!panelOpen) return null;

  return (
    <div
      className="relative flex h-full flex-col border-r border-[var(--color-border-default)] bg-[var(--color-bg-surface)]"
      style={{ width: panelWidth }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-4 py-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-[var(--color-primary-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="text-title-sm">AI 助手</span>
          {/* Model selector */}
          <div className="relative" ref={modelPickerRef}>
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--color-gray-100)] px-2 py-0.5 text-body-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-gray-200)] transition-colors"
            >
              {PROVIDER_LABELS[settings.activeProvider]}
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showModelPicker && (
              <div className="absolute left-0 top-full z-50 mt-1 w-40 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] py-1 shadow-[var(--shadow-md)]">
                {(Object.keys(PROVIDER_LABELS) as AIProvider[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => { setActiveProvider(key); setShowModelPicker(false); }}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-1.5 text-body-sm hover:bg-[var(--color-gray-100)]",
                      settings.activeProvider === key && "text-[var(--color-primary-600)] font-medium"
                    )}
                  >
                    {PROVIDER_LABELS[key]}
                    {settings.activeProvider === key && (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearMessages} className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-gray-100)]" title="清空对话">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
          <button onClick={() => setPanelOpen(false)} className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-gray-100)]" title="收起面板">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-tertiary)] text-body-sm">
            <svg className="h-10 w-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <p>向 AI 描述你想要的修改</p>
            <p className="mt-1 text-body-xs">支持上下文对话、图片上传、模型切换</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={cn("animate-fade-in", msg.role === "user" ? "flex justify-end" : "")}>
            {msg.role === "user" ? (
              <div className="max-w-[85%]">
                {msg.targetNodeId && (
                  <div className="mb-1 text-body-xs text-[var(--color-primary-600)]">
                    针对节点: {findNode(doc!.rootNode, msg.targetNodeId)?.label ?? msg.targetNodeId}
                  </div>
                )}
                {/* User uploaded images */}
                {msg.images && msg.images.length > 0 && (
                  <div className="mb-1 flex flex-wrap gap-1">
                    {msg.images.map((img, i) => (
                      <img key={i} src={img} alt="" className="h-16 w-16 rounded-[var(--radius-sm)] object-cover border border-[var(--color-border-default)]" />
                    ))}
                  </div>
                )}
                <div className="rounded-[var(--radius-lg)] bg-[var(--color-primary-600)] px-3 py-2 text-body-md text-white">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="max-w-[95%]">
                <div className="rounded-[var(--radius-lg)] bg-[var(--color-gray-100)] px-3 py-2 text-body-md text-[var(--color-text-primary)] whitespace-pre-wrap">
                  {msg.content === "..." ? (
                    <div className="flex gap-1 py-1">
                      <span className="typing-dot h-2 w-2 rounded-full bg-[var(--color-gray-400)]" />
                      <span className="typing-dot h-2 w-2 rounded-full bg-[var(--color-gray-400)]" />
                      <span className="typing-dot h-2 w-2 rounded-full bg-[var(--color-gray-400)]" />
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {/* Pending change confirmation — outline tree preview */}
                {msg.pendingChanges && (
                  <div className="mt-2 rounded-[var(--radius-md)] border border-[var(--color-warning-500)] bg-[#fffbf0] p-3">
                    <p className="text-body-sm font-medium text-[var(--color-gray-800)] mb-2">
                      {msg.pendingChanges.description}
                    </p>
                    {msg.pendingChanges.newSubtree && (
                      <div className="mb-2 max-h-[200px] overflow-y-auto rounded-[var(--radius-sm)] bg-white/60 p-2 text-body-xs">
                        <OutlinePreview node={msg.pendingChanges.newSubtree} depth={0} />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => applyChange(msg.pendingChanges!, msg.id)}>
                        确认应用
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => rejectChange(msg.id)}>
                        取消
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Selected node indicator */}
      {selectedNodeId && selectedNodeLabel && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary-50)] px-3 py-1.5 text-body-sm text-[var(--color-primary-600)]">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="truncate">拓展节点: {selectedNodeLabel}</span>
          <button onClick={() => setSelectedNodeId(null)} className="ml-auto shrink-0 text-[var(--color-primary-400)] hover:text-[var(--color-primary-600)]">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Image preview */}
      {images.length > 0 && (
        <div className="mx-4 mb-2 flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="group relative">
              <img src={img} alt="" className="h-14 w-14 rounded-[var(--radius-sm)] object-cover border border-[var(--color-border-default)]" />
              <button
                onClick={() => removeImage(i)}
                className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-[var(--color-error-500)] text-white group-hover:flex"
              >
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-[var(--color-border-default)] p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageUpload}
        />
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={selectedNodeId ? "输入提示词来拓展选中节点..." : "描述你想要的修改..."}
              className="flex-1 resize-none rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-2 text-body-md outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-primary-600)]"
              rows={2}
            />
            <div className="flex items-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-gray-100)] hover:text-[var(--color-text-secondary)]"
                title="上传图片"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <span className="text-body-xs text-[var(--color-text-tertiary)]">
                {settings.providers[settings.activeProvider].model}
              </span>
            </div>
          </div>
          <Button onClick={handleSend} disabled={loading || !input.trim()} className="self-end">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-[var(--color-primary-200)]"
        onMouseDown={onResizeStart}
      />
    </div>
  );
}

/** 大纲预览组件 — 用于 AI 回复中展示树结构 */
function OutlinePreview({ node, depth }: { node: MindMapNode; depth: number }) {
  return (
    <div style={{ paddingLeft: `${depth * 16}px` }}>
      <div className="flex items-center gap-1.5 py-0.5">
        {node.children.length > 0 ? (
          <svg className="h-2.5 w-2.5 text-[var(--color-text-tertiary)] rotate-90 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        ) : (
          <span className="w-[6px] h-[6px] rounded-full bg-[var(--color-gray-400)] shrink-0" />
        )}
        <span className={cn(
          "text-[var(--color-text-primary)]",
          depth === 0 && "font-medium"
        )}>
          {node.label}
        </span>
      </div>
      {node.children.map((child) => (
        <OutlinePreview key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}
