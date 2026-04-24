"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDocumentStore } from "@/stores/document-store";
import { parseMarkdownToMindMap, parseXMindToMindMap } from "@/lib/import-utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import SettingsModal from "@/components/ui/SettingsModal";
import { useAuth } from "@/lib/use-auth";
import Image from "next/image";
import MindMapThumbnail from "@/components/ui/MindMapThumbnail";

export default function DocumentsPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { documents, createDocument, deleteDocument, renameDocument, importDocument } =
    useDocumentStore();
  // 只显示当前用户的文档（兼容旧数据：没有 userId 的文档对所有人可见）
  const userDocs = documents.filter((d) => !d.userId || d.userId === user?.email);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    const doc = createDocument(newTitle.trim(), user?.email);
    setNewTitle("");
    setShowCreate(false);
    router.push(`/editor/${doc.id}`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let rootNode;

      if (ext === "md" || ext === "markdown") {
        const text = await file.text();
        rootNode = parseMarkdownToMindMap(text);
      } else if (ext === "xmind") {
        rootNode = await parseXMindToMindMap(file);
      } else {
        alert("不支持的文件格式，请选择 .md 或 .xmind 文件");
        return;
      }

      const title = file.name.replace(/\.(md|markdown|xmind)$/i, "");
      const doc = importDocument(title, rootNode, user?.email);
      router.push(`/editor/${doc.id}`);
    } catch (err) {
      alert(`导入失败: ${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-page)]">
        <p className="text-body-md text-[var(--color-text-tertiary)]">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-page)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/LmindLogo.svg" alt="Lmind Logo" width={28} height={28} />
            <h1 className="text-title-lg text-[var(--color-text-primary)]">Lmind</h1>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <span className="text-body-sm text-[var(--color-text-tertiary)] mr-2">{user.email}</span>
            )}
            <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              设置
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              导入
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建文档
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              退出
            </Button>
          </div>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.xmind"
        className="hidden"
        onChange={handleImport}
      />

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setNewTitle(""); }} title="新建思维导图">
        <Input
          autoFocus
          placeholder="输入文档标题"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { setShowCreate(false); setNewTitle(""); }}>
            取消
          </Button>
          <Button onClick={handleCreate} disabled={!newTitle.trim()}>创建</Button>
        </div>
      </Modal>
      {/* Document list */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {userDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-tertiary)]">
            <svg className="mb-4 h-16 w-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-body-md">还没有文档</p>
            <p className="text-body-sm mt-1">点击「新建文档」或「导入」开始</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {userDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => router.push(`/editor/${doc.id}`)}
                className="group cursor-pointer rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 shadow-[var(--shadow-xs)] transition-all hover:shadow-[var(--shadow-md)] hover:border-[var(--color-primary-200)]"
              >
                <div className="mb-3 flex h-32 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-gray-50)] overflow-hidden p-2">
                  <MindMapThumbnail rootNode={doc.rootNode} className="h-full w-full" />
                </div>
                <h3 className="text-title-sm text-[var(--color-text-primary)] truncate">
                  {doc.title}
                </h3>
                <p className="mt-1 text-body-xs text-[var(--color-text-tertiary)]">
                  {new Date(doc.updatedAt).toLocaleString("zh-CN")}
                </p>
                <div className="mt-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const name = prompt("重命名", doc.title);
                      if (name) renameDocument(doc.id, name);
                    }}
                    className="rounded-[var(--radius-sm)] px-2 py-1 text-body-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-gray-100)]"
                  >
                    重命名
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("确定删除这个文档？")) deleteDocument(doc.id);
                    }}
                    className="rounded-[var(--radius-sm)] px-2 py-1 text-body-xs text-[var(--color-error-500)] hover:bg-red-50"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} user={user} />
    </div>
  );
}
