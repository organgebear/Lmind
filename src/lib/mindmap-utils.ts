import { MindMapNode } from "@/types";
import { type Node, type Edge } from "@xyflow/react";
import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";
import { genId } from "@/lib/id";

const elk = new ELK();

const ELK_OPTIONS = {
  "elk.algorithm": "mrtree",
  "elk.direction": "RIGHT",
  "elk.spacing.nodeNode": "40",
  "elk.layered.spacing.nodeNodeBetweenLayers": "100",
  "elk.spacing.edgeNode": "30",
};

const NODE_WIDTH = 300; // 固定节点宽度
const CHAR_WIDTH = 14; // 估算每个字符宽度
const LINE_HEIGHT = 22; // 每行文字高度
const NODE_PADDING_Y = 20; // 上下 padding 总和
const ROOT_PADDING_X = 48; // 根节点左右 padding
const CHILD_PADDING_X = 32; // 子节点左右 padding

/** 根据文字长度估算节点高度（多行） */
function estimateNodeHeight(label: string, depth: number): number {
  const paddingX = depth === 0 ? ROOT_PADDING_X : CHILD_PADDING_X;
  const contentWidth = NODE_WIDTH - paddingX;
  const charsPerLine = Math.max(1, Math.floor(contentWidth / CHAR_WIDTH));
  const lines = Math.ceil(label.length / charsPerLine);
  return Math.max(40, lines * LINE_HEIGHT + NODE_PADDING_Y);
}

/** 将 MindMapNode 树转换为 ReactFlow 的 nodes + edges */
export function mindmapToFlow(root: MindMapNode): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const seen = new Set<string>();

  function traverse(node: MindMapNode, depth: number) {
    let nodeId = node.id;
    if (seen.has(nodeId)) {
      nodeId = genId();
      node.id = nodeId;
    }
    seen.add(nodeId);

    nodes.push({
      id: nodeId,
      type: "mindmapNode",
      data: { label: node.label, depth, images: node.images },
      position: { x: 0, y: 0 },
    });

    if (!node.collapsed) {
      for (const child of node.children) {
        traverse(child, depth + 1);
        edges.push({
          id: `${nodeId}-${child.id}`,
          source: nodeId,
          target: child.id,
          type: "default",
        });
      }
    }
  }

  traverse(root, 0);
  return { nodes, edges };
}

/** 使用 elkjs 自动布局 */
export async function layoutNodes(
  nodes: Node[],
  edges: Edge[]
): Promise<Node[]> {
  const elkGraph: ElkNode = {
    id: "root",
    layoutOptions: ELK_OPTIONS,
    children: nodes.map((n) => {
      const { label, depth } = n.data as { label: string; depth: number };
      return {
        id: n.id,
        width: NODE_WIDTH,
        height: estimateNodeHeight(label, depth),
      };
    }),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const layout = await elk.layout(elkGraph);

  return nodes.map((node) => {
    const elkNode = layout.children?.find((n) => n.id === node.id);
    return {
      ...node,
      position: { x: elkNode?.x ?? 0, y: elkNode?.y ?? 0 },
    };
  });
}
