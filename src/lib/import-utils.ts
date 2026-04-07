import type { MindMapNode } from "@/types";
import JSZip from "jszip";
import { genId } from "@/lib/id";

/** 解析 Markdown 标题层级为思维导图树 */
export function parseMarkdownToMindMap(md: string): MindMapNode {
  const lines = md.split("\n").filter((l) => l.trim());
  const root: MindMapNode = {
    id: genId(),
    label: "导入的文档",
    children: [],
  };

  // Stack: [node, depth]
  const stack: [MindMapNode, number][] = [[root, 0]];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    const listMatch = line.match(/^(\s*)[-*+]\s+(.+)/);

    let depth: number;
    let label: string;

    if (headingMatch) {
      depth = headingMatch[1].length; // 1-6
      label = headingMatch[2].trim();
    } else if (listMatch) {
      const indent = listMatch[1].length;
      depth = 7 + Math.floor(indent / 2); // list items are deeper than headings
      label = listMatch[2].trim();
    } else {
      continue;
    }

    const node: MindMapNode = {
      id: genId(),
      label,
      children: [],
    };

    // Find parent: pop stack until we find a node with smaller depth
    while (stack.length > 1 && stack[stack.length - 1][1] >= depth) {
      stack.pop();
    }

    const parent = stack[stack.length - 1][0];
    parent.children.push(node);
    stack.push([node, depth]);
  }

  // If root has exactly one child, promote it
  if (root.children.length === 1) {
    const child = root.children[0];
    root.label = child.label;
    root.children = child.children;
  }

  return root;
}

/** 解析 .xmind 文件为思维导图树 */
export async function parseXMindToMindMap(file: File): Promise<MindMapNode> {
  const zip = await JSZip.loadAsync(file);
  const contentFile = zip.file("content.json");
  if (!contentFile) {
    throw new Error("无效的 XMind 文件：找不到 content.json");
  }

  const content = await contentFile.async("text");
  const sheets = JSON.parse(content);

  if (!Array.isArray(sheets) || sheets.length === 0) {
    throw new Error("XMind 文件中没有找到画布");
  }

  const rootTopic = sheets[0].rootTopic;
  if (!rootTopic) {
    throw new Error("XMind 文件中没有找到根节点");
  }

  return convertXMindTopic(rootTopic);
}

function convertXMindTopic(topic: XMindTopic): MindMapNode {
  const children: MindMapNode[] = [];

  // XMind uses "children.attached" for child topics
  const attached = topic.children?.attached;
  if (Array.isArray(attached)) {
    for (const child of attached) {
      children.push(convertXMindTopic(child));
    }
  }

  return {
    id: genId(),
    label: topic.title || "未命名",
    children,
    notes: topic.notes?.plain?.content,
  };
}

interface XMindTopic {
  title?: string;
  notes?: { plain?: { content?: string } };
  children?: { attached?: XMindTopic[] };
}
