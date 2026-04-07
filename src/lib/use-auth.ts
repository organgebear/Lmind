"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAIStore } from "@/stores/ai-store";

export interface LmindUser {
  email: string;
  code: string; // 6位安全登录码
  codeEnabled: boolean; // 安全码登录是否启用
}

/** 获取所有已注册用户（兼容旧数据） */
function getUsers(): LmindUser[] {
  try {
    const raw = localStorage.getItem("lmind-users");
    if (!raw) return [];
    const users = JSON.parse(raw) as LmindUser[];
    // 迁移：旧用户可能没有 codeEnabled 字段
    let migrated = false;
    for (const u of users) {
      if (u.codeEnabled === undefined) {
        u.codeEnabled = !!u.code;
        migrated = true;
      }
      if (!u.code) {
        u.code = generateCode();
        u.codeEnabled = true;
        migrated = true;
      }
    }
    if (migrated) saveUsers(users);
    return users;
  } catch {
    return [];
  }
}

/** 保存用户列表 */
function saveUsers(users: LmindUser[]) {
  localStorage.setItem("lmind-users", JSON.stringify(users));
}

/** 生成 6 位数字安全码 */
export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** 检查安全码是否唯一 */
export function isCodeUnique(code: string, excludeEmail?: string): boolean {
  const users = getUsers();
  return !users.some((u) => u.code === code && u.email !== excludeEmail);
}

/** 写入会话 */
export function setSession(user: LmindUser) {
  localStorage.setItem("lmind-session", JSON.stringify(user));
}

/** 注册新用户（customCode 留空则自动生成） */
export function registerUser(email: string, customCode?: string): LmindUser {
  const users = getUsers();
  if (users.find((u) => u.email === email)) throw new Error("该邮箱已注册");

  let code: string;
  if (customCode) {
    if (!isCodeUnique(customCode)) throw new Error("该安全码已被使用");
    code = customCode;
  } else {
    do { code = generateCode(); } while (!isCodeUnique(code));
  }

  const user: LmindUser = { email, code, codeEnabled: true };
  users.push(user);
  saveUsers(users);
  return user;
}

/** 修改用户安全码 */
export function updateUserCode(email: string, newCode: string): LmindUser {
  if (!newCode.trim()) throw new Error("安全码不能为空");
  if (!isCodeUnique(newCode, email)) throw new Error("该安全码已被使用");
  const users = getUsers();
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error("用户不存在");
  user.code = newCode;
  saveUsers(users);
  // 同步更新 session
  try {
    const session = localStorage.getItem("lmind-session");
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.email === email) setSession(user);
    }
  } catch { /* ignore */ }
  return user;
}

/** 用邮箱查找用户（用于邮箱登录） */
export function findUserByEmail(email: string): LmindUser | null {
  const users = getUsers();
  return users.find((u) => u.email === email) ?? null;
}

/** 用安全码登录（仅匹配已启用安全码的用户） */
export function loginByCode(code: string): LmindUser | null {
  const users = getUsers();
  return users.find((u) => u.code === code && u.codeEnabled) ?? null;
}

/** 切换安全码登录开关 */
export function toggleCodeEnabled(email: string, enabled: boolean): LmindUser {
  const users = getUsers();
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error("用户不存在");
  user.codeEnabled = enabled;
  saveUsers(users);
  // 同步更新 session
  try {
    const session = localStorage.getItem("lmind-session");
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.email === email) setSession(user);
    }
  } catch { /* ignore */ }
  return user;
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
