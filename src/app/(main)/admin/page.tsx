"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/use-auth";
import { generateCode } from "@/lib/use-auth";
import type { DbUser } from "@/lib/db-sqlite";
import type { AIProvider, AIProviderConfig } from "@/types";
import { DEFAULT_AI_SETTINGS } from "@/types";

interface AdminSession { email: string; code: string; role: string }

function readSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem("lmind-session") || "null") } catch { return null }
}

function getHeaders(): Record<string, string> {
  const s = readSession();
  return { "Content-Type": "application/json", "x-admin-email": s?.email || "", "x-admin-code": s?.code || "" };
}

const PROVIDERS: { key: AIProvider; label: string }[] = [
  { key: "deepseek", label: "DeepSeek" },
  { key: "chatgpt", label: "ChatGPT" },
  { key: "qwen", label: "千问 (Qwen)" },
];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"users" | "ai">("users");
  const [users, setUsers] = useState<DbUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // create user modal
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [createError, setCreateError] = useState("");

  // edit user modal
  const [editUser, setEditUser] = useState<DbUser | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");

  // Global AI settings
  const [activeProvider, setActiveProvider] = useState<AIProvider>("deepseek");
  const [providerConfigs, setProviderConfigs] = useState<Record<AIProvider, AIProviderConfig>>(DEFAULT_AI_SETTINGS.providers);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/documents");
  }, [user, router]);

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", { headers: getHeaders() });
      if (res.ok) setUsers(await res.json());
      else if (res.status === 403) router.replace("/documents");
    } catch { /* ignore */ }
  };

  const loadGlobalSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.activeProvider) setActiveProvider(data.activeProvider);
        const merged = { ...DEFAULT_AI_SETTINGS.providers };
        for (const p of PROVIDERS) {
          try {
            const setting = data[p.key];
            Object.assign(merged[p.key], typeof setting === "string" ? JSON.parse(setting) : setting || {});
          } catch { /* ignore */ }
        }
        setProviderConfigs(merged);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (user?.role === "admin") { loadUsers(); loadGlobalSettings(); }
  }, [user]);

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(""), 3000); };

  // --- Create user ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setBusy(true);
    try {
      const body: Record<string, string> = { email: newEmail, role: newRole };
      if (newUsername) body.username = newUsername;
      if (newPassword) body.password = newPassword;
      if (newCode) body.code = newCode;
      const res = await fetch("/api/admin/users", {
        method: "POST", headers: getHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`用户创建成功`);
        setShowCreate(false);
        setNewEmail(""); setNewUsername(""); setNewPassword(""); setNewCode(""); setNewRole("user");
        loadUsers();
      } else {
        setCreateError(data.error || "创建失败");
      }
    } finally { setBusy(false); }
  };

  // --- Edit user (username / password) ---
  const openEdit = (u: DbUser) => {
    setEditUser(u);
    setEditUsername(u.username || "");
    setEditPassword("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setBusy(true);
    try {
      const body: Record<string, string> = { email: editUser.email };
      if (editUsername !== (editUser.username || "")) body.username = editUsername;
      if (editPassword) body.password = editPassword;
      if (!body.username && !body.password) { setBusy(false); return; }
      const res = await fetch("/api/admin/users", {
        method: "PUT", headers: getHeaders(), body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`用户已更新`);
        setEditUser(null);
        loadUsers();
      } else {
        showMsg(data.error || "更新失败");
      }
    } finally { setBusy(false); }
  };

  // --- Actions ---
  const handleDelete = async (email: string) => {
    if (!confirm(`确定要删除 ${email} 吗？`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", { method: "DELETE", headers: getHeaders(), body: JSON.stringify({ email }) });
      const data = await res.json();
      if (res.ok) { showMsg("用户已删除"); loadUsers(); } else showMsg(data.error || "删除失败");
    } finally { setBusy(false); }
  };

  const handleToggleRole = async (email: string, currentRole: string) => {
    setBusy(true);
    try {
      const newRole = currentRole === "admin" ? "user" : "admin";
      const res = await fetch("/api/admin/users", { method: "PUT", headers: getHeaders(), body: JSON.stringify({ email, role: newRole }) });
      const data = await res.json();
      if (res.ok) { showMsg(`角色已更新`); loadUsers(); } else showMsg(data.error || "更新失败");
    } finally { setBusy(false); }
  };

  const handleResetCode = async (email: string) => {
    const newCode = generateCode();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", { method: "PUT", headers: getHeaders(), body: JSON.stringify({ email, code: newCode }) });
      const data = await res.json();
      if (res.ok) { showMsg(`安全码已重置为: ${newCode}`); loadUsers(); } else showMsg(data.error || "重置失败");
    } finally { setBusy(false); }
  };

  const handleToggleCode = async (email: string, enabled: boolean) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", { method: "PUT", headers: getHeaders(), body: JSON.stringify({ email, codeEnabled: !enabled }) });
      const data = await res.json();
      if (res.ok) { showMsg(`安全码登录已${enabled ? "禁用" : "启用"}`); loadUsers(); } else showMsg(data.error || "操作失败");
    } finally { setBusy(false); }
  };

  // --- AI settings ---
  const handleSaveAISettings = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", { method: "PUT", headers: getHeaders(), body: JSON.stringify({ activeProvider, providers: providerConfigs }) });
      const data = await res.json();
      if (res.ok) showMsg("全局 AI 设置已保存"); else showMsg(data.error || "保存失败");
    } finally { setBusy(false); }
  };

  const updateProvider = (p: AIProvider, field: keyof AIProviderConfig, value: string) => {
    setProviderConfigs((prev) => ({ ...prev, [p]: { ...prev[p], [field]: value } }));
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-500">加载中...</div>;
  if (!user || user.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-gray-800">管理面板</h1>
          <div className="flex gap-2">
            <button onClick={() => setTab("users")} className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${tab === "users" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>用户管理</button>
            <button onClick={() => setTab("ai")} className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${tab === "ai" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>全局 AI 设置</button>
          </div>
        </div>
        <button onClick={() => router.push("/documents")} className="text-sm text-gray-500 hover:text-gray-700">← 返回文档</button>
      </div>

      {msg && <div className="fixed top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded shadow-lg z-50 text-sm">{msg}</div>}

      {/* ========= User Management Tab ========= */}
      {tab === "users" && (
        <div className="p-6 max-w-6xl mx-auto">
          <div className="mb-4 flex justify-end">
            <button onClick={() => { setShowCreate(true); setCreateError(""); }} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors">+ 添加用户</button>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-600">
                  <th className="px-4 py-3 font-medium">邮箱</th>
                  <th className="px-4 py-3 font-medium">用户名</th>
                  <th className="px-4 py-3 font-medium">角色</th>
                  <th className="px-4 py-3 font-medium">安全码</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.email} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-800">{u.email}</td>
                    <td className="px-4 py-3 text-gray-600">{u.username || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                        {u.role === "admin" ? "管理员" : "用户"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={u.code_enabled ? "text-green-600" : "text-red-500"}>
                        {u.code_enabled ? "已启用" : "已禁用"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => openEdit(u)} disabled={busy} className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">编辑</button>
                        <button onClick={() => handleToggleRole(u.email, u.role)} disabled={busy} className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">{u.role === "admin" ? "降级" : "升为管理员"}</button>
                        <button onClick={() => handleResetCode(u.email)} disabled={busy} className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50">重置安全码</button>
                        <button onClick={() => handleToggleCode(u.email, !!u.code_enabled)} disabled={busy} className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200 disabled:opacity-50">{u.code_enabled ? "禁用安全码" : "启用安全码"}</button>
                        <button onClick={() => handleDelete(u.email)} disabled={busy} className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50">删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无用户</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========= Create User Modal ========= */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-4">添加用户</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">邮箱 *</label>
                <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="user@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">用户名</label>
                <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="选填" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">密码</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="留空则不设置密码" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">安全码</label>
                <input value={newCode} onChange={(e) => setNewCode(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="留空则自动生成" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">角色</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="user">用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              {createError && <p className="text-xs text-red-500">{createError}</p>}
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">取消</button>
                <button type="submit" disabled={busy} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{busy ? "创建中..." : "创建"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========= Edit User Modal ========= */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditUser(null)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 mb-1">编辑用户</h2>
            <p className="text-sm text-gray-500 mb-4">{editUser.email}</p>
            <form onSubmit={handleEdit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">用户名</label>
                <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="留空则不修改" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">新密码</label>
                <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="留空则不修改密码" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setEditUser(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">取消</button>
                <button type="submit" disabled={busy} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{busy ? "保存中..." : "保存"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========= Global AI Settings Tab ========= */}
      {tab === "ai" && (
        <div className="p-6 max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-4">这些默认值将应用于所有未配置自有 API Key 的用户。用户仍可在设置中覆盖自己的 API Key。</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">默认 AI 提供商</label>
              <select value={activeProvider} onChange={(e) => setActiveProvider(e.target.value as AIProvider)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                {PROVIDERS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            {PROVIDERS.map((p) => (
              <details key={p.key} className="mb-3 border border-gray-200 rounded" open={p.key === activeProvider}>
                <summary className="px-4 py-2 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50">{p.label} 配置</summary>
                <div className="px-4 pb-4 space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">API Key</label>
                    <input type="password" value={providerConfigs[p.key].apiKey} onChange={(e) => updateProvider(p.key, "apiKey", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" placeholder="sk-..." />
                    {providerConfigs[p.key].apiKey && <p className="text-xs text-gray-400 mt-1">已设置 (仅显示后4位: {providerConfigs[p.key].apiKey.slice(-4)})</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Model</label>
                    <input type="text" value={providerConfigs[p.key].model} onChange={(e) => updateProvider(p.key, "model", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Base URL</label>
                    <input type="text" value={providerConfigs[p.key].baseUrl} onChange={(e) => updateProvider(p.key, "baseUrl", e.target.value)} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
                  </div>
                </div>
              </details>
            ))}
            <button onClick={handleSaveAISettings} disabled={busy} className="mt-4 w-full py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">{busy ? "保存中..." : "保存全局 AI 设置"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
