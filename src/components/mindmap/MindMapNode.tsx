"use client";

import { memo, useState, useRef, useEffect, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

function MindMapNodeComponent({ data, selected }: NodeProps) {
  const { label, depth, images, onEdit, onImagePreview } = data as {
    label: string;
    depth: number;
    images?: string[];
    onEdit?: (newLabel: string) => void;
    onImagePreview?: (src: string) => void;
  };
  const isRoot = depth === 0;
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);
  const clickOffsetRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (editing && editRef.current) {
      const el = editRef.current;
      el.focus();
      // Try to place cursor near the double-click position
      const offset = clickOffsetRef.current;
      if (offset) {
        const sel = window.getSelection();
        let range: Range | null = null;
        if (document.caretPositionFromPoint) {
          const pos = document.caretPositionFromPoint(offset.x, offset.y);
          if (pos) {
            range = document.createRange();
            range.setStart(pos.offsetNode, pos.offset);
            range.collapse(true);
          }
        } else if (document.caretRangeFromPoint) {
          range = document.caretRangeFromPoint(offset.x, offset.y);
        }
        if (range) {
          sel?.removeAllRanges();
          sel?.addRange(range);
          clickOffsetRef.current = null;
          return;
        }
      }
      // Fallback: place cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
      clickOffsetRef.current = null;
    }
  }, [editing]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    const text = editRef.current?.textContent?.trim() || "";
    if (text && text !== label && onEdit) {
      onEdit(text);
    }
  }, [label, onEdit]);

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border px-4 py-2.5 text-body-md shadow-[var(--shadow-xs)] transition-all w-[300px]",
        isRoot
          ? "border-[var(--color-primary-600)] bg-[var(--color-primary-600)] text-white font-semibold text-center"
          : "border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-primary-400)] hover:shadow-[var(--shadow-sm)]",
        selected && !isRoot && "!border-[var(--color-primary-600)] ring-2 ring-[var(--color-primary-200)]",
        selected && isRoot && "ring-2 ring-white/50",
        editing && "!cursor-text"
      )}
      style={editing ? { pointerEvents: "all" } : undefined}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (onEdit) {
          clickOffsetRef.current = { x: e.clientX, y: e.clientY };
          setEditing(true);
        }
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-[var(--color-primary-600)] !w-2 !h-2 !border-white !border-2"
      />
      {editing ? (
        <div
          ref={editRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            "outline-none min-w-[60px] whitespace-pre-wrap break-words cursor-text nopan nodrag",
            isRoot ? "text-white text-center font-semibold" : "text-[var(--color-text-primary)]"
          )}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); }
            if (e.key === "Escape") { setEditing(false); }
          }}
        >
          {label}
        </div>
      ) : (
        <span className="whitespace-pre-wrap break-words">{label}</span>
      )}
      {/* Node images */}
      {images && images.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt=""
              className="h-12 w-12 rounded object-cover border border-[var(--color-border-default)] cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onImagePreview?.(img); }}
            />
          ))}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-[var(--color-primary-600)] !w-2 !h-2 !border-white !border-2"
      />
    </div>
  );
}

export default memo(MindMapNodeComponent);
