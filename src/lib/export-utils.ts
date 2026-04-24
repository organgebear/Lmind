import type { MindMapNode } from "@/types";
import JSZip from "jszip";

/** 将 MindMapNode 转换为 XMind content.json 格式 */
function toXMindTopic(node: MindMapNode): Record<string, unknown> {
  const topic: Record<string, unknown> = {
    id: node.id,
    title: node.label,
    structureClass: "org.xmind.ui.map.unbalanced",
  };

  if (node.notes) {
    topic.notes = { plain: { content: node.notes } };
  }

  if (node.children.length > 0) {
    topic.children = {
      attached: node.children.map(toXMindTopic),
    };
  }

  return topic;
}

/** 导出为 .xmind 文件 */
export async function exportToXMind(rootNode: MindMapNode, title: string): Promise<Blob> {
  const content = [
    {
      id: "sheet-1",
      title: title,
      rootTopic: toXMindTopic(rootNode),
    },
  ];

  const manifest = {
    "file-entries": {
      "content.json": {},
      "metadata.json": {},
    },
  };

  const metadata = {
    creator: { name: "Lmind", version: "1.0.0" },
  };

  const zip = new JSZip();
  zip.file("content.json", JSON.stringify(content));
  zip.file("metadata.json", JSON.stringify(metadata));
  zip.file("manifest.json", JSON.stringify(manifest));

  return zip.generateAsync({ type: "blob", mimeType: "application/x-xmind" });
}

/** 导出为 Markdown */
export function exportToMarkdown(rootNode: MindMapNode): string {
  let md = "";

  function traverse(node: MindMapNode, depth: number) {
    if (depth === 0) {
      md += `# ${node.label}\n\n`;
    } else if (depth <= 5) {
      md += `${"#".repeat(depth + 1)} ${node.label}\n\n`;
    } else {
      md += `${"  ".repeat(depth - 6)}- ${node.label}\n`;
    }
    for (const child of node.children) {
      traverse(child, depth + 1);
    }
  }

  traverse(rootNode, 0);
  return md;
}

/** 触发浏览器下载 */
export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
