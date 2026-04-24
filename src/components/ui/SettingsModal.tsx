"use client";

import { useState } from "react";
import { useAIStore } from "@/stores/ai-store";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { AIProvider } from "@/types";
import type { LmindUser } from "@/lib/use-auth";
import { updateUserCode, toggleCodeEnabled } from "@/lib/use-auth";
import { cn } from "@/lib/utils";

const PROVIDERS: { key: AIProvider; label: string; description: string }[] = [
  { key: "deepseek", label: "DeepSeek", description: "deepseek-chat / deepseek-reasoner" },
  { key: "chatgpt", label: "ChatGPT", description: "gpt-4o / gpt-4o-mini" },
  { key: "qwen", label: "通义千问", description: "qwen-plus / qwen-turbo" },
];

type SettingsTab = "ai" | "account";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  user?: LmindUser | null;
}

export default function SettingsModal({ open, onClose, user }: SettingsModalProps) {
  const { settings, setActiveProvider, updateProviderConfig } = useAIStore();
  const [activeTab, setActiveTab] = useState<AIProvider>(settings.activeProvider);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("ai");
  const [newCode, setNewCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeSuccess, setCodeSuccess] = useState("");
  const [codeEnabled, setCodeEnabled] = useState(user?.codeEnabled ?? true);

  const handleToggleCode = () => {
    if (!user) return;
    try {
      const updated = toggleCodeEnabled(user.email, !codeEnabled);
      setCodeEnabled(updated.codeEnabled);
    } catch { /* ignore */ }
  };

  const config = settings.providers[activeTab];

  const handleUpdateCode = () => {
    if (!user) return;
    setCodeError("");
    setCodeSuccess("");
    try {
      const updated = updateUserCode(user.email, newCode);
      setCodeSuccess(`安全码已更新为: ${updated.code}`);
      setNewCode("");
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : "更新失败");
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="设置" className="max-w-lg">
      {/* Top-level tabs */}
      <div className="flex gap-1 rounded-[var(--radius-md)] bg-[var(--color-gray-100)] p-1 mb-4">
        <button
          onClick={() => setSettingsTab("ai")}
          className={cn(
            "flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-body-sm font-medium transition-colors",
            settingsTab === "ai"
              ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-[var(--shadow-xs)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          )}
        >
          AI 设置
        </button>
        <button
          onClick={() => { setSettingsTab("account"); setCodeError(""); setCodeSuccess(""); }}
          className={cn(
            "flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-body-sm font-medium transition-colors",
            settingsTab === "account"
              ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-[var(--shadow-xs)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          )}
        >
          账号安全
        </button>
      </div>

      {settingsTab === "ai" ? (
        <>
          {/* Provider tabs */}
          <div className="flex gap-1 rounded-[var(--radius-md)] bg-[var(--color-gray-100)] p-1 mb-4">
            {PROVIDERS.map((p) => (
              <button
                key={p.key}
                onClick={() => setActiveTab(p.key)}
                className={cn(
                  "flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-body-sm font-medium transition-colors",
                  activeTab === p.key
                    ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-[var(--shadow-xs)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Config form */}
          <div className="space-y-4" key={activeTab}>
            <div>
              <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">API Key</label>
              <Input
                type="password"
                placeholder={`输入 ${PROVIDERS.find((p) => p.key === activeTab)?.label} API Key`}
                defaultValue={config.apiKey}
                onBlur={(e) => updateProviderConfig(activeTab, { apiKey: e.target.value })}
              />
            </div>
            <div>
              <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">模型</label>
              <Input
                placeholder="模型名称"
                defaultValue={config.model}
                onBlur={(e) => updateProviderConfig(activeTab, { model: e.target.value })}
              />
              <p className="mt-1 text-body-xs text-[var(--color-text-tertiary)]">
                {PROVIDERS.find((p) => p.key === activeTab)?.description}
              </p>
            </div>
            <div>
              <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">API Base URL</label>
              <Input
                placeholder="https://api.example.com"
                defaultValue={config.baseUrl}
                onBlur={(e) => updateProviderConfig(activeTab, { baseUrl: e.target.value })}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-body-sm text-[var(--color-text-secondary)]">当前使用:</span>
              <span className={cn(
                "text-body-sm font-medium",
                settings.activeProvider === activeTab ? "text-[var(--color-success-500)]" : "text-[var(--color-text-tertiary)]"
              )}>
                {settings.activeProvider === activeTab ? "已激活" : "未激活"}
              </span>
            </div>
            <div className="flex gap-2">
              {settings.activeProvider !== activeTab && (
                <Button variant="secondary" onClick={() => setActiveProvider(activeTab)}>设为默认</Button>
              )}
              <Button onClick={onClose}>完成</Button>
            </div>
          </div>
        </>
      ) : (
        /* Account security tab */
        <div className="space-y-4">
          {user ? (
            <>
              {/* 安全码开关 */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body-sm font-medium text-[var(--color-text-primary)]">安全码登录</p>
                  <p className="text-body-xs text-[var(--color-text-tertiary)]">开启后可使用安全码快速登录</p>
                </div>
                <button
                  onClick={handleToggleCode}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    codeEnabled ? "bg-[var(--color-primary-600)]" : "bg-[var(--color-gray-200)]"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-[var(--shadow-sm)] transition-transform",
                      codeEnabled ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
              {codeEnabled && (
                <>
                  <div>
                    <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">当前安全登录码</label>
                    <div className="flex gap-2">
                      <Input value={user.code} readOnly />
                      <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(user.code)}>
                        复制
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">设置新安全码</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="输入新的安全码"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value)}
                        error={!!codeError}
                      />
                      <Button size="sm" onClick={handleUpdateCode} disabled={!newCode.trim()}>更新</Button>
                    </div>
                    {codeError && <p className="mt-1 text-body-xs text-[var(--color-error-500)]">{codeError}</p>}
                    {codeSuccess && <p className="mt-1 text-body-xs text-[var(--color-success-500)]">{codeSuccess}</p>}
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="text-body-sm text-[var(--color-text-tertiary)]">请先登录</p>
          )}
          <div className="mt-6 flex justify-end">
            <Button onClick={onClose}>完成</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}


