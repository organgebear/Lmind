"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAIStore } from "@/stores/ai-store";

export interface LmindUser {
  email: string;
  code: string; // 6位安全登录码
  codeEnabled: boolean; // 安全码登录是否启用
}

/** 生成 6 位数字安全码 */
export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** 写入会话 */
export function setSession(user: LmindUser) {
  localStorage.setItem("lmind-session", JSON.stringify(user));
}

async function parseJsonSafely(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text.startsWith("<!DOCTYPE") ? "服务器返回了错误页面，请查看终端日志" : "服务器返回了无效响应");
  }
}

/** 注册新用户（customCode 留空则自动生成） */
export async function registerUser(email: string, customCode?: string): Promise<LmindUser> {
  const code = customCode || generateCode();
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  const data = await parseJsonSafely(res);
  if (!res.ok) throw new Error(data.error || "注册失败");
  return data as LmindUser;
}

/** 修改用户安全码 */
export async function updateUserCode(email: string, newCode: string): Promise<LmindUser> {
  const res = await fetch("/api/auth/update-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code: newCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "更新失败");
  const session = localStorage.getItem("lmind-session");
  if (session && JSON.parse(session).email === email) setSession(data);
  return data as LmindUser;
}

/** 用邮箱查找用户（用于邮箱登录） */
export async function findUserByEmail(email: string): Promise<LmindUser | null> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "email", value: email }),
  });
  if (!res.ok) return null;
  return res.json();
}

/** 用安全码登录（仅匹配已启用安全码的用户） */
export async function loginByCode(code: string): Promise<LmindUser | null> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "code", value: code }),
  });
  if (!res.ok) return null;
  return res.json();
}

/** 切换安全码登录开关 */
export async function toggleCodeEnabled(email: string, enabled: boolean): Promise<LmindUser> {
  const res = await fetch("/api/auth/toggle-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, enabled }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "操作失败");
  const session = localStorage.getItem("lmind-session");
  if (session && JSON.parse(session).email === email) setSession(data);
  return data as LmindUser;
}

export function useAuth() {
  const router = useRouter();
  const switchUser = useAIStore((s) => s.switchUser);
  const [user, setUser] = useState<LmindUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("lmind-session");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as LmindUser;
        setUser(parsed);
        switchUser(parsed.email);
      } catch {
        localStorage.removeItem("lmind-session");
        router.replace("/login");
      }
    } else {
      router.replace("/login");
    }
    setLoading(false);
  }, [router, switchUser]);

  const logout = () => {
    switchUser(null);
    localStorage.removeItem("lmind-session");
    router.replace("/login");
  };

  return { user, loading, logout };
}
