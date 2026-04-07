"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { loginByCode, findUserByEmail, setSession } from "@/lib/use-auth";
import { cn } from "@/lib/utils";

type LoginMode = "code" | "email";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("code");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleCodeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const user = loginByCode(code);
    if (!user) {
      setError("安全码无效");
      return;
    }
    setSession(user);
    router.push("/documents");
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // TODO: 接入后端认证 API，目前仅校验用户是否存在
    const user = findUserByEmail(email);
    if (!user) {
      setError("该邮箱未注册");
      return;
    }
    setSession(user);
    router.push("/documents");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-page)]">
      <div className="flex gap-8 items-start">
        {/* Login card */}
        <div className="w-full max-w-sm rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] p-8 shadow-[var(--shadow-lg)]">
        <div className="mb-6 flex flex-col items-center">
          <svg className="mb-3 h-10 w-10 text-[var(--color-primary-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <h1 className="text-title-xl text-[var(--color-text-primary)]">登录 Lmind</h1>
          <p className="mt-1 text-body-sm text-[var(--color-text-tertiary)]">AI 驱动的智能思维导图</p>
        </div>
        {/* Mode toggle */}
        <div className="flex gap-1 rounded-[var(--radius-md)] bg-[var(--color-gray-100)] p-1 mb-4">
          <button
            type="button"
            onClick={() => { setMode("code"); setError(""); }}
            className={cn(
              "flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-body-sm font-medium transition-colors",
              mode === "code"
                ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-[var(--shadow-xs)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            安全码登录
          </button>
          <button
            type="button"
            onClick={() => { setMode("email"); setError(""); }}
            className={cn(
              "flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-body-sm font-medium transition-colors",
              mode === "email"
                ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-[var(--shadow-xs)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            邮箱登录
          </button>
        </div>

        {mode === "code" ? (
          <form onSubmit={handleCodeLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">安全登录码</label>
              <Input
                type="password"
                placeholder="输入安全登录码"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                error={!!error}
                required
              />
              {error && <p className="mt-1 text-body-xs text-[var(--color-error-500)]">{error}</p>}
            </div>
            <Button type="submit" className="w-full mt-2" size="lg">登录</Button>
          </form>
        ) : (
          <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">邮箱</label>
              <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">密码</label>
              <Input type="password" placeholder="输入密码" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full mt-2" size="lg">登录</Button>
          </form>
        )}

        <p className="mt-4 text-center text-body-sm text-[var(--color-text-tertiary)]">
          还没有账号？
          <a href="/register" className="ml-1 text-[var(--color-primary-600)] hover:underline">注册</a>
        </p>
        </div>

      {/* Usage tutorial */}
      <div className="hidden lg:block w-80 rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] p-6 shadow-[var(--shadow-lg)]">
        <h2 className="text-title-sm text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
          <svg className="h-4 w-4 text-[var(--color-primary-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          使用指南
        </h2>
        <div className="space-y-3 text-body-sm text-[var(--color-text-secondary)]">
          <div className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-600)] flex items-center justify-center text-body-xs font-medium">1</span>
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">创建思维导图</p>
              <p className="text-body-xs mt-0.5">登录后点击「新建文档」，双击节点编辑文字，右键添加子节点</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-600)] flex items-center justify-center text-body-xs font-medium">2</span>
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">AI 智能生成</p>
              <p className="text-body-xs mt-0.5">点击「AI 助手」按钮，描述你的需求，AI 会自动生成或修改导图结构</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-600)] flex items-center justify-center text-body-xs font-medium">3</span>
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">节点图片</p>
              <p className="text-body-xs mt-0.5">右键节点选择「上传图片」，或选中节点后 Ctrl+V 粘贴剪贴板图片</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-600)] flex items-center justify-center text-body-xs font-medium">4</span>
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">模型切换</p>
              <p className="text-body-xs mt-0.5">AI 面板顶部可快速切换 DeepSeek、ChatGPT、通义千问</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-600)] flex items-center justify-center text-body-xs font-medium">5</span>
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">导入导出</p>
              <p className="text-body-xs mt-0.5">支持 XMind 和 Markdown 格式的导入导出</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
