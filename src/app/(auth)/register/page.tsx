"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { registerUser, setSession } from "@/lib/use-auth";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("两次密码不一致");
      return;
    }
    try {
      const user = registerUser(email, securityCode || undefined);
      setSession(user);
      alert(`注册成功！您的安全登录码: ${user.code}\n请牢记此码，可直接用它登录。`);
      router.push("/documents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-page)]">
      <div className="w-full max-w-sm rounded-[var(--radius-xl)] bg-[var(--color-bg-surface)] p-8 shadow-[var(--shadow-lg)]">
        <div className="mb-6 flex flex-col items-center">
          <svg className="mb-3 h-10 w-10 text-[var(--color-primary-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <h1 className="text-title-xl text-[var(--color-text-primary)]">注册 Lmind</h1>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">邮箱</label>
            <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">密码</label>
            <Input type="password" placeholder="设置密码" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div>
            <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">确认密码</label>
            <Input type="password" placeholder="再次输入密码" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          <div>
            <label className="text-body-sm font-medium text-[var(--color-text-primary)] mb-1.5 block">安全登录码（选填）</label>
            <Input
              type="text"
              placeholder="自定义安全码，留空自动生成6位数字"
              value={securityCode}
              onChange={(e) => setSecurityCode(e.target.value)}
            />
          </div>
          {error && <p className="text-body-xs text-[var(--color-error-500)]">{error}</p>}
          <Button type="submit" className="w-full mt-2" size="lg">注册</Button>
        </form>
        <p className="mt-4 text-center text-body-sm text-[var(--color-text-tertiary)]">
          已有账号？
          <a href="/login" className="ml-1 text-[var(--color-primary-600)] hover:underline">登录</a>
        </p>
      </div>
    </div>
  );
}
