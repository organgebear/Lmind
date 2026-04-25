"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAIStore } from "@/stores/ai-store";

export interface LmindUser {
  email: string;
  code: string;
  codeEnabled: boolean;
  role: string;
  username?: string | null;
}

/** 生成 6 位数字安全码 */
export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** 写入会话 */
export function setSession(user: LmindUser) {
  localStorage.setItem("lmind-session", JSON.stringify(user));
}

function readSession(): LmindUser | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("lmind-session");
  if (!stored) return null;
  try {
    return JSON.parse(stored) as LmindUser;
  } catch {
    localStorage.removeItem("lmind-session");
    return null;
  }
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

/** 统一密码登录：identifier 可以是邮箱或用户名 */
export async function loginByIdentifier(identifier: string, password: string, setSessionFn?: (user: LmindUser) => void): Promise<LmindUser | null> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "password", identifier, password }),
  });
  if (!res.ok) return null;
  const user = await res.json();
  if (setSessionFn) setSessionFn(user);
  return user;
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
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const switchUser = useAIStore((s) => s.switchUser);
  const fetchGlobalSettings = useAIStore((s) => s.fetchGlobalSettings);
  const [user] = useState<LmindUser | null>(readSession);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    } else {
      switchUser(user.email);
      fetchGlobalSettings();
      // admin redirect
      if (user.role === "admin" && !pathname.startsWith("/admin") && pathname !== "/login") {
        router.replace("/admin");
      }
      // non-admin trying to access /admin → redirect
      if (user.role !== "admin" && pathname.startsWith("/admin")) {
        router.replace("/documents");
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = () => {
    switchUser(null);
    localStorage.removeItem("lmind-session");
    router.replace("/login");
  };

  return { user, loading, logout };
}
