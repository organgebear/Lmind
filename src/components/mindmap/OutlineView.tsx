"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDocumentStore } from "@/stores/document-store";
import { useAIStore } from "@/stores/ai-store";
import { genId } from "@/lib/id";
import type { MindMapNode } from "@/types";
import { cn } from "@/lib/utils";

interface OutlineViewProps {
  docId: string;
}

/** 在树中查找 targetId 的直接父节点 */
function findParentInTree(root: MindMapNode, targetId: string): MindMapNode | null {
  for (const child of root.children) {
    if (child.id === targetId) return root;
    const found = findParentInTree(child, targetId);
    if (found) return found;
  }
  return null;
}

export default function OutlineView({ docId }: OutlineViewProps) {
  const { documents, updateRootNode } = useDocumentStore();
  const { setSelectedNodeId, setPanelOpen } = useAIStore();
  const doc = documents.find((d) => d.id === docId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const clickXRef = useRef<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (editingId && editRef.current) {
      const input = editRef.current;
      input.focus();
      // Place cursor at click position instead of selecting all
      const x = clickXRef.current;
      if (x !== null) {
        // Estimate character position from click x offset
        const rect = input.getBoundingClientRect();
        const relX = x - rect.left;
        const charWidth = input.scrollWidth / (input.value.length || 1);
        const pos = Math.round(relX / charWidth);
        const clamped = Math.max(0, Math.min(pos, input.value.length));
        input.setSelectionRange(clamped, clamped);
        clickXRef.current = null;
      } else {
        // New node or no click info: place cursor at end
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    }
  }, [editingId]);

  const updateNodeInTree = useCallback(
    (root: MindMapNode, nodeId: string, updater: (n: MindMapNode) => MindMapNode): MindMapNode => {
      if (root.id === nodeId) return updater(root);
      return { ...root, children: root.children.map((c) => updateNodeInTree(c, nodeId, updater)) };
    },
    []
  );
  const addChild = useCallback(
    (parentId: string) => {
      if (!doc) return;
      const newChild: MindMapNode = { id: genId(), label: "", children: [] };
      const updated = updateNodeInTree(doc.rootNode, parentId, (n) => ({
        ...n, children: [...n.children, newChild],
      }));
      updateRootNode(docId, updated);
      setCollapsed((prev) => { const next = new Set(prev); next.delete(parentId); return next; });
      setEditingId(newChild.id);
      setEditValue("");
    },
    [doc, docId, updateNodeInTree, updateRootNode]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      if (!doc || nodeId === "root") return;
      const removeFromTree = (node: MindMapNode): MindMapNode => ({
        ...node, children: node.children.filter((c) => c.id !== nodeId).map(removeFromTree),
      });
      updateRootNode(docId, removeFromTree(doc.rootNode));
      if (editingId === nodeId) setEditingId(null);
    },
    [doc, docId, updateRootNode, editingId]
  );

  /** Tab 缩进：将节点移为前一个兄弟节点的子节点 */
  const indentNode = useCallback(
    (nodeId: string) => {
      if (!doc || nodeId === "root") return;
      const parent = findParentInTree(doc.rootNode, nodeId);
      if (!parent) return;
      const idx = parent.children.findIndex((c) => c.id === nodeId);
      if (idx <= 0) return; // 没有前一个兄弟节点
      const nodeToMove = parent.children[idx];
      const prevSiblingId = parent.children[idx - 1].id;
      let newRoot = updateNodeInTree(doc.rootNode, parent.id, (p) => ({
        ...p, children: p.children.filter((c) => c.id !== nodeId),
      }));
      newRoot = updateNodeInTree(newRoot, prevSiblingId, (ps) => ({
        ...ps, children: [...ps.children, nodeToMove],
      }));
      updateRootNode(docId, newRoot);
      setCollapsed((prev) => { const next = new Set(prev); next.delete(prevSiblingId); return next; });
    },
    [doc, docId, updateNodeInTree, updateRootNode]
  );

  /** Shift+Tab 反缩进：将节点移到父节点的同级（父节点之后） */
  const outdentNode = useCallback(
    (nodeId: string) => {
      if (!doc || nodeId === "root") return;
      const parent = findParentInTree(doc.rootNode, nodeId);
      if (!parent) return;
      const grandparent = findParentInTree(doc.rootNode, parent.id);
      if (!grandparent) return; // 父节点是 root，无法再提升
      const nodeToMove = parent.children.find((c) => c.id === nodeId)!;
      let newRoot = updateNodeInTree(doc.rootNode, parent.id, (p) => ({
        ...p, children: p.children.filter((c) => c.id !== nodeId),
      }));
      newRoot = updateNodeInTree(newRoot, grandparent.id, (gp) => {
        const newChildren = [...gp.children];
        const parentIdx = newChildren.findIndex((c) => c.id === parent.id);
        newChildren.splice(parentIdx + 1, 0, nodeToMove);
        return { ...gp, children: newChildren };
      });
      updateRootNode(docId, newRoot);
    },
    [doc, docId, updateNodeInTree, updateRootNode]
  );

  const commitEdit = useCallback(() => {
    if (!doc || !editingId) { setEditingId(null); return; }
    const label = editValue.trim() || "新节点";
    const updated = updateNodeInTree(doc.rootNode, editingId, (n) => ({ ...n, label }));
    updateRootNode(docId, updated);
    setEditingId(null);
  }, [doc, docId, editingId, editValue, updateNodeInTree, updateRootNode]);

  const startEdit = (node: MindMapNode, e?: React.MouseEvent) => {
    setEditingId(node.id);
    setEditValue(node.label);
    clickXRef.current = e ? e.clientX : null;
  };

  const toggleCollapse = (nodeId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
      return next;
    });
  };

  const addImageToNode = useCallback(
    (nodeId: string, dataUrl: string) => {
      if (!doc) return;
      const updated = updateNodeInTree(doc.rootNode, nodeId, (n) => ({
        ...n,
        images: [...(n.images || []), dataUrl],
      }));
      updateRootNode(docId, updated);
    },
    [doc, docId, updateNodeInTree, updateRootNode]
  );

  const removeImageFromNode = useCallback(
    (nodeId: string, imgIndex: number) => {
      if (!doc) return;
      const updated = updateNodeInTree(doc.rootNode, nodeId, (n) => ({
        ...n,
        images: (n.images || []).filter((_, i) => i !== imgIndex),
      }));
      updateRootNode(docId, updated);
    },
    [doc, docId, updateNodeInTree, updateRootNode]
  );

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const nodeId = imageTargetRef.current;
      if (!nodeId) return;
      const files = e.target.files;
      if (!files) return;
      Array.from(files).forEach((file) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = () => addImageToNode(nodeId, reader.result as string);
        reader.readAsDataURL(file);
      });
      if (imageInputRef.current) imageInputRef.current.value = "";
    },
    [addImageToNode]
  );

  /** Ctrl+V 粘贴图片到当前聚焦的节点 */
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      const targetId = focusedNodeId || editingId;
      if (!items || !doc || !targetId) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onload = () => addImageToNode(targetId, reader.result as string);
          reader.readAsDataURL(file);
        }
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [doc, focusedNodeId, editingId, addImageToNode]);

  if (!doc) return <div className="flex h-full items-center justify-center text-[var(--color-text-secondary)]">文档不存在</div>;
  function renderNode(node: MindMapNode, depth: number) {
    const isRoot = depth === 0;
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed.has(node.id);
    const isEditing = editingId === node.id;

    return (
      <div key={node.id} className="outline-item relative">
        {/* Vertical indent lines — on outer container so they span images too */}
        {depth > 0 && Array.from({ length: depth }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-[var(--color-gray-200)]"
            style={{ left: `${i * 24 + 11}px` }}
          />
        ))}

        {/* Node row */}
        <div
          className={cn(
            "group relative flex items-center min-h-[36px]",
            isRoot ? "mb-1" : ""
          )}
          style={{ paddingLeft: `${depth * 24}px` }}
          onMouseEnter={() => setFocusedNodeId(node.id)}
        >
          {/* Bullet / collapse toggle */}
          <button
            onClick={() => hasChildren && toggleCollapse(node.id)}
            className={cn(
              "relative z-10 shrink-0 w-[22px] h-[22px] flex items-center justify-center rounded-full transition-colors",
              hasChildren ? "hover:bg-[var(--color-gray-100)] cursor-pointer" : "cursor-default"
            )}
          >
            {hasChildren ? (
              <svg
                className={cn("h-3 w-3 text-[var(--color-text-tertiary)] transition-transform", !isCollapsed && "rotate-90")}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            ) : (
              <span className={cn(
                "w-[6px] h-[6px] rounded-full",
                isRoot ? "bg-[var(--color-primary-600)]" : "bg-[var(--color-gray-400)]"
              )} />
            )}
          </button>
          {/* Label — click to edit */}
          {isEditing ? (
            <input
              ref={editRef}
              className={cn(
                "flex-1 bg-transparent outline-none py-1 px-1 -ml-1 rounded-none border-b border-[var(--color-primary-400)]",
                isRoot ? "text-title-md" : depth === 1 ? "text-body-md font-medium" : "text-body-md"
              )}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!doc) return;
                  const cursorPos = editRef.current?.selectionStart ?? editValue.length;
                  const textBefore = editValue.slice(0, cursorPos);
                  const textAfter = editValue.slice(cursorPos);
                  // 保存当前节点（光标前的文本）
                  const labelBefore = textBefore.trim() || "新节点";
                  let newRoot = updateNodeInTree(doc.rootNode, node.id, (n) => ({ ...n, label: labelBefore }));
                  // 在当前节点后创建同级节点（光标后的文本）
                  const parent = findParentInTree(newRoot, node.id);
                  if (parent) {
                    const newSibling: MindMapNode = { id: genId(), label: textAfter, children: [] };
                    newRoot = updateNodeInTree(newRoot, parent.id, (p) => {
                      const newChildren = [...p.children];
                      const idx = newChildren.findIndex((c) => c.id === node.id);
                      newChildren.splice(idx + 1, 0, newSibling);
                      return { ...p, children: newChildren };
                    });
                    updateRootNode(docId, newRoot);
                    setEditingId(newSibling.id);
                    setEditValue(textAfter);
                  } else {
                    updateRootNode(docId, newRoot);
                    setEditingId(null);
                  }
                }
                if (e.key === "Escape") setEditingId(null);
                if (e.key === "Tab") {
                  e.preventDefault();
                  commitEdit();
                  if (e.shiftKey) {
                    outdentNode(node.id);
                  } else {
                    indentNode(node.id);
                  }
                }
              }}
            />
          ) : (
            <span
              className={cn(
                "flex-1 py-1 px-1 -ml-1 rounded cursor-text transition-colors hover:bg-[var(--color-gray-50)]",
                isRoot ? "text-title-md text-[var(--color-text-primary)]"
                  : depth === 1 ? "text-body-md font-medium text-[var(--color-text-primary)]"
                  : "text-body-md text-[var(--color-text-secondary)]"
              )}
              onClick={(e) => startEdit(node, e)}
            >
              {node.label || <span className="text-[var(--color-text-tertiary)] italic">空节点</span>}
            </span>
          )}

          {/* Hover actions */}
          <div className="shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <button onClick={() => addChild(node.id)} className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-gray-100)] hover:text-[var(--color-text-secondary)]" title="添加子节点">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
            <button onClick={() => { setSelectedNodeId(node.id); setPanelOpen(true); }} className="rounded p-1 text-[var(--color-primary-500)] hover:bg-[var(--color-primary-50)]" title="AI 生成">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
            </button>
            <button onClick={() => { imageTargetRef.current = node.id; imageInputRef.current?.click(); }} className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-gray-100)] hover:text-[var(--color-text-secondary)]" title="上传图片">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </button>
            {!isRoot && (
              <button onClick={() => deleteNode(node.id)} className="rounded p-1 text-[var(--color-error-500)] hover:bg-red-50" title="删除">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* Node images */}
        {node.images && node.images.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1 mb-1" style={{ paddingLeft: `${depth * 24 + 22}px` }}>
            {node.images.map((img, i) => (
              <div key={i} className="group/img relative">
                <img
                  src={img}
                  alt=""
                  className="h-16 w-16 rounded-[var(--radius-sm)] object-cover border border-[var(--color-border-default)] cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setPreviewImage(img)}
                />
                <button
                  onClick={() => removeImageFromNode(node.id, i)}
                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-[var(--color-error-500)] text-white group-hover/img:flex"
                >
                  <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Children with collapse animation */}
        {hasChildren && !isCollapsed && (
          <div className="relative">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}

        {/* Collapsed indicator */}
        {hasChildren && isCollapsed && (
          <div
            className="ml-6 text-body-xs text-[var(--color-text-tertiary)] cursor-pointer hover:text-[var(--color-primary-600)] py-0.5"
            style={{ paddingLeft: `${depth * 24}px` }}
            onClick={() => toggleCollapse(node.id)}
          >
            {node.children.length} 个子节点...
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--color-bg-surface)]">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageUpload}
      />
      <div className="mx-auto max-w-3xl px-8 py-6">
        {renderNode(doc.rootNode, 0)}
      </div>

      {/* Image preview overlay */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="" className="max-h-[90vh] max-w-[90vw] rounded-[var(--radius-lg)] object-contain shadow-[var(--shadow-xl)]" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-bg-surface)] shadow-[var(--shadow-md)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
