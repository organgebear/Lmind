"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  SelectionMode,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeChange,
} from "@xyflow/react";
import MindMapNodeComponent from "./MindMapNode";
import { mindmapToFlow, layoutNodes } from "@/lib/mindmap-utils";
import { useDocumentStore } from "@/stores/document-store";
import { useAIStore } from "@/stores/ai-store";
import { genId } from "@/lib/id";
import type { MindMapNode } from "@/types";

const nodeTypes = { mindmapNode: MindMapNodeComponent };

const defaultEdgeOptions = {
  style: { stroke: "var(--color-gray-300)", strokeWidth: 2 },
};

interface MindMapCanvasProps {
  docId: string;
}

export default function MindMapCanvas({ docId }: MindMapCanvasProps) {
  const { documents, updateRootNode } = useDocumentStore();
  const { setPanelOpen, setSelectedNodeId } = useAIStore();
  const doc = documents.find((d) => d.id === docId);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const updateNodeInTree = useCallback(
    (root: MindMapNode, nodeId: string, updater: (n: MindMapNode) => MindMapNode): MindMapNode => {
      if (root.id === nodeId) return updater(root);
      return { ...root, children: root.children.map((c) => updateNodeInTree(c, nodeId, updater)) };
    },
    []
  );

  const editNodeLabel = useCallback(
    (nodeId: string, newLabel: string) => {
      if (!doc) return;
      const updated = updateNodeInTree(doc.rootNode, nodeId, (n) => ({ ...n, label: newLabel }));
      updateRootNode(docId, updated);
    },
    [doc, docId, updateNodeInTree, updateRootNode]
  );

  useEffect(() => {
    if (!doc) return;
    const { nodes: flowNodes, edges: flowEdges } = mindmapToFlow(doc.rootNode);
    layoutNodes(flowNodes, flowEdges).then((laid) => {
      const withCallbacks = laid.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onEdit: (newLabel: string) => editNodeLabel(n.id, newLabel),
          onImagePreview: (src: string) => setPreviewImage(src),
        },
      }));
      setNodes(withCallbacks);
      setEdges(flowEdges);
    });
  }, [doc, setNodes, setEdges, editNodeLabel]);

  const addChild = useCallback(
    (parentId: string) => {
      if (!doc) return;
      const newChild: MindMapNode = { id: genId(), label: "新节点", children: [] };
      const updated = updateNodeInTree(doc.rootNode, parentId, (n) => ({
        ...n,
        children: [...n.children, newChild],
      }));
      updateRootNode(docId, updated);
      setContextMenu(null);
    },
    [doc, docId, updateNodeInTree, updateRootNode]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      if (!doc || nodeId === "root") return;
      const removeFromTree = (node: MindMapNode): MindMapNode => ({
        ...node,
        children: node.children.filter((c) => c.id !== nodeId).map(removeFromTree),
      });
      updateRootNode(docId, removeFromTree(doc.rootNode));
      setContextMenu(null);
    },
    [doc, docId, updateRootNode]
  );

  const renameNode = useCallback(
    (nodeId: string) => {
      if (!doc) return;
      const name = prompt("节点名称");
      if (!name) return;
      const updated = updateNodeInTree(doc.rootNode, nodeId, (n) => ({ ...n, label: name }));
      updateRootNode(docId, updated);
      setContextMenu(null);
    },
    [doc, docId, updateNodeInTree, updateRootNode]
  );

  /** AI 生成：选中节点 → 打开 AI 面板 → 设置选中节点 */
  const aiGenerate = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      setPanelOpen(true);
      setContextMenu(null);
    },
    [setSelectedNodeId, setPanelOpen]
  );

  /** 给节点添加图片 */
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!contextMenu) return;
      const files = e.target.files;
      if (!files) return;
      Array.from(files).forEach((file) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = () => {
          addImageToNode(contextMenu.nodeId, reader.result as string);
        };
        reader.readAsDataURL(file);
      });
      if (imageInputRef.current) imageInputRef.current.value = "";
      setContextMenu(null);
    },
    [contextMenu, addImageToNode]
  );

  /** Ctrl+V 粘贴图片到选中节点 */
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || !doc) return;
      // 找到当前选中的 ReactFlow 节点
      const selectedNode = nodes.find((n) => n.selected);
      if (!selectedNode) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onload = () => {
            addImageToNode(selectedNode.id, reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [doc, nodes, addImageToNode]);

  /** Tab 键为选中节点添加子节点 */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      const selectedNode = nodes.find((n) => n.selected);
      if (!selectedNode) return;
      e.preventDefault();
      addChild(selectedNode.id);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [nodes, addChild]);

  /** 左键单击节点弹出操作菜单 */
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
    },
    []
  );

  /** 拦截 onNodesChange，将 ReactFlow 的节点删除同步到 store */
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // 阻止删除 root 节点，收集其余要删除的节点 ID
      const toDelete = new Set<string>();
      const filtered = changes.filter((c) => {
        if (c.type === "remove") {
          if (c.id === "root") return false; // 保护根节点
          toDelete.add(c.id);
        }
        return true;
      });

      // 同步删除到 document store（直接读最新 state，避免闭包过期）
      if (toDelete.size > 0) {
        const currentDoc = useDocumentStore.getState().documents.find((d) => d.id === docId);
        if (currentDoc) {
          const removeFromTree = (node: MindMapNode): MindMapNode => ({
            ...node,
            children: node.children.filter((c) => !toDelete.has(c.id)).map(removeFromTree),
          });
          updateRootNode(docId, removeFromTree(currentDoc.rootNode));
        }
      }

      onNodesChange(filtered);
    },
    [docId, updateRootNode, onNodesChange]
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
    },
    []
  );

  const onPaneClick = useCallback(() => setContextMenu(null), []);

  if (!doc) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--color-text-secondary)]">
        文档不存在
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageUpload}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodeContextMenu={onNodeContextMenu}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        deleteKeyCode={["Delete", "Backspace"]}
        selectionOnDrag={false}
        selectionKeyCode="Control"
        multiSelectionKeyCode="Control"
        selectionMode={SelectionMode.Partial}
        fitView
        fitViewOptions={{ padding: 0.2, minZoom: 0.5 }}
        minZoom={0.3}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] py-1 shadow-[var(--shadow-lg)] min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button onClick={() => addChild(contextMenu.nodeId)} className="flex w-full items-center gap-2 px-3 py-2 text-body-md hover:bg-[var(--color-gray-50)]">
            <svg className="h-4 w-4 text-[var(--color-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            添加子节点
          </button>
          <button onClick={() => renameNode(contextMenu.nodeId)} className="flex w-full items-center gap-2 px-3 py-2 text-body-md hover:bg-[var(--color-gray-50)]">
            <svg className="h-4 w-4 text-[var(--color-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            重命名
          </button>
          <button onClick={() => imageInputRef.current?.click()} className="flex w-full items-center gap-2 px-3 py-2 text-body-md hover:bg-[var(--color-gray-50)]">
            <svg className="h-4 w-4 text-[var(--color-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            上传图片
          </button>
          <div className="my-1 border-t border-[var(--color-border-subtle)]" />
          <button onClick={() => aiGenerate(contextMenu.nodeId)} className="flex w-full items-center gap-2 px-3 py-2 text-body-md text-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
            AI 生成
          </button>
          {contextMenu.nodeId !== "root" && (
            <>
              <div className="my-1 border-t border-[var(--color-border-subtle)]" />
              <button onClick={() => deleteNode(contextMenu.nodeId)} className="flex w-full items-center gap-2 px-3 py-2 text-body-md text-[var(--color-error-500)] hover:bg-red-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                删除
              </button>
            </>
          )}
        </div>
      )}

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
