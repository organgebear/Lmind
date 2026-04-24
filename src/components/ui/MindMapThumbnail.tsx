"use client";

import { useMemo } from "react";
import type { MindMapNode } from "@/types";

/* ---- layout constants ---- */
const H_GAP = 28;       // horizontal gap between levels
const V_GAP = 6;        // vertical gap between sibling nodes
const NODE_H = 18;      // node rect height
const FONT_SIZE = 8;    // label font size
const CHAR_W = 5;       // estimated char width
const MAX_LABEL = 8;    // max chars shown per node
const MAX_DEPTH = 4;    // max tree depth to render
const MAX_CHILDREN = 6; // max children per node to render

/* ---- colour palette per depth ---- */
const DEPTH_COLORS = [
  { bg: "#2970ff", text: "#fff" },
  { bg: "#e0edff", text: "#155aef" },
  { bg: "#f0f6ff", text: "#2970ff" },
  { bg: "#f5f8ff", text: "#528bff" },
  { bg: "#f9fafb", text: "#676f83" },
];

interface LayoutRect {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  depth: number;
  children: LayoutRect[];
}

/** Recursively compute layout (tree growing rightward). Returns subtree height. */
function layoutTree(
  node: MindMapNode,
  depth: number,
  x: number,
  y: number
): { rect: LayoutRect; height: number } {
  const truncated =
    node.label.length > MAX_LABEL
      ? node.label.slice(0, MAX_LABEL) + ".."
      : node.label;
  const w = Math.max(30, truncated.length * CHAR_W + 12);

  const childRects: LayoutRect[] = [];
  let childrenTotalH = 0;

  if (depth < MAX_DEPTH && node.children.length > 0 && !node.collapsed) {
    const visibleChildren = node.children.slice(0, MAX_CHILDREN);
    const childX = x + w + H_GAP;
    let childY = y;

    for (let i = 0; i < visibleChildren.length; i++) {
      const { rect: cr, height: ch } = layoutTree(
        visibleChildren[i],
        depth + 1,
        childX,
        childY
      );
      childRects.push(cr);
      childY += ch + V_GAP;
      childrenTotalH += ch + (i < visibleChildren.length - 1 ? V_GAP : 0);
    }

    // Show "+N" indicator if truncated
    if (node.children.length > MAX_CHILDREN) {
      const moreLabel = `+${node.children.length - MAX_CHILDREN}`;
      childRects.push({
        x: x + w + H_GAP,
        y: childY,
        w: moreLabel.length * CHAR_W + 12,
        h: NODE_H,
        label: moreLabel,
        depth: depth + 1,
        children: [],
      });
      childrenTotalH += V_GAP + NODE_H;
    }
  }

  const subtreeH = Math.max(NODE_H, childrenTotalH);

  // Center the parent vertically relative to its children
  const parentY = childrenTotalH > NODE_H ? y + (childrenTotalH - NODE_H) / 2 : y;

  const rect: LayoutRect = {
    x,
    y: parentY,
    w,
    h: NODE_H,
    label: truncated,
    depth,
    children: childRects,
  };

  return { rect, height: subtreeH };
}

/** Flatten the tree into a list of rects + edges */
function flatten(rect: LayoutRect): {
  rects: LayoutRect[];
  edges: { x1: number; y1: number; x2: number; y2: number }[];
} {
  const rects: LayoutRect[] = [rect];
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];

  for (const child of rect.children) {
    edges.push({
      x1: rect.x + rect.w,
      y1: rect.y + rect.h / 2,
      x2: child.x,
      y2: child.y + child.h / 2,
    });
    const sub = flatten(child);
    rects.push(...sub.rects);
    edges.push(...sub.edges);
  }

  return { rects, edges };
}

interface Props {
  rootNode: MindMapNode;
  className?: string;
}

export default function MindMapThumbnail({ rootNode, className }: Props) {
  const { rects, edges, viewBox } = useMemo(() => {
    const { rect } = layoutTree(rootNode, 0, 0, 0);
    const { rects, edges } = flatten(rect);

    // Compute bounding box
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const r of rects) {
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.w);
      maxY = Math.max(maxY, r.y + r.h);
    }

    const pad = 8;
    const vb = `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;

    return { rects, edges, viewBox: vb };
  }, [rootNode]);

  return (
    <svg
      viewBox={viewBox}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Edges */}
      {edges.map((e, i) => {
        const midX = (e.x1 + e.x2) / 2;
        return (
          <path
            key={`e${i}`}
            d={`M${e.x1},${e.y1} C${midX},${e.y1} ${midX},${e.y2} ${e.x2},${e.y2}`}
            fill="none"
            stroke="#d0d5dc"
            strokeWidth={1.2}
          />
        );
      })}
      {/* Nodes */}
      {rects.map((r, i) => {
        const colors = DEPTH_COLORS[Math.min(r.depth, DEPTH_COLORS.length - 1)];
        return (
          <g key={`n${i}`}>
            <rect
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              rx={4}
              ry={4}
              fill={colors.bg}
            />
            <text
              x={r.x + r.w / 2}
              y={r.y + r.h / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill={colors.text}
              fontSize={FONT_SIZE}
              fontFamily="system-ui, sans-serif"
              fontWeight={r.depth === 0 ? 600 : 400}
            >
              {r.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
