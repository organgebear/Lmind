"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDocumentStore } from "@/stores/document-store";
import { useAIStore } from "@/stores/ai-store";
import MindMapCanvas from "@/components/mindmap/MindMapCanvas";
import OutlineView from "@/components/mindmap/OutlineView";
import AIPanel from "@/components/ai/AIPanel";
import SettingsModal from "@/components/ui/SettingsModal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/use-auth";
import { exportToXMind, exportToMarkdown, downloadFile } from "@/lib/export-utils";
import { parseMarkdownToMindMap, parseXMindToMindMap } from "@/lib/import-utils";

export default function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { documents, setCurrentDoc, updateRootNode } = useDocumentStore();
  const { panelOpen, setPanelOpen } = useAIStore();
  const { user } = useAuth();
  const doc = documents.find((d) => d.id === id);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"mindmap" | "outline">("mindmap");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 文档不属于当前用户时跳回文档列表
  useEffect(() => {
    if (doc && doc.userId && user && doc.userId !== user.email) {
      router.replace("/documents");
    }
  }, [doc, user, router]);

  useEffect(() => {
    setCurrentDoc(id);
    return () => setCurrentDoc(null);
  }, [id, setCurrentDoc]);

  const handleExportXMind = async () => {
    if (!doc) return;
    const blob = await exportToXMind(doc.rootNode, doc.title);
    downloadFile(blob, `${doc.title}.xmind`);
  };

  const handleExportMd = () => {
    if (!doc) return;
    const md = exportToMarkdown(doc.rootNode);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    downloadFile(blob, `${doc.title}.md`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !doc) return;
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
      updateRootNode(id, { ...rootNode, id: "root" });
    } catch (err) {
      alert(`导入失败: ${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <input ref={fileInputRef} type="file" accept=".md,.markdown,.xmind" className="hidden" onChange={handleImport} />

      {/* Toolbar */}
      <header className="flex items-center gap-3 border-b border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-2">
        <button
          onClick={() => router.push("/documents")}
          className="rounded-[var(--radius-md)] p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-gray-100)]"
          title="返回文档列表"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="h-4 w-px bg-[var(--color-border-default)]" />
        <h2 className="text-title-sm text-[var(--color-text-primary)] truncate">
          {doc?.title ?? "加载中..."}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            导入
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportXMind}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            导出 XMind
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportMd}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            导出 MD
          </Button>
          <div className="h-4 w-px bg-[var(--color-border-default)]" />
          <Button
            variant={panelOpen ? "primary" : "ghost"}
            size="sm"
            onClick={() => setPanelOpen(!panelOpen)}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            AI 助手
          </Button>
          <Button
            variant={viewMode === "outline" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setViewMode(viewMode === "mindmap" ? "outline" : "mindmap")}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            大纲
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            设置
          </Button>
        </div>
      </header>

      {/* Main content: AI Panel (left) + Canvas/Outline (right) */}
      <div className="flex flex-1 overflow-hidden">
        {panelOpen && <AIPanel docId={id} />}
        <div className="flex-1">
          {viewMode === "mindmap" ? (
            <MindMapCanvas docId={id} />
          ) : (
            <OutlineView docId={id} />
          )}
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} user={user} />
    </div>
  );
}
