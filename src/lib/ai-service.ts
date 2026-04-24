import type { AIProviderConfig, AIMessage, MindMapNode } from "@/types";
import { genId } from "@/lib/id";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

/** 将思维导图树序列化为文本 */
export function serializeMindMap(node: MindMapNode, indent = 0): string {
  const prefix = "  ".repeat(indent);
  let result = `${prefix}- ${node.label}\n`;
  for (const child of node.children) {
    result += serializeMindMap(child, indent + 1);
  }
  return result;
}

/** 从 AI 回复中提取描述文本（去掉 JSON 代码块） */
export function extractDescription(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, "").trim();
}

/** 不应作为上下文发送给 AI 的系统确认消息 */
const IGNORED_MESSAGES = new Set(["已应用修改。", "已取消修改。", "..."]);

/** 将历史消息转为 ChatMessage 数组（用于上下文理解） */
export function buildContextMessages(
  history: AIMessage[],
  limit = 10
): ChatMessage[] {
  const recent = history.slice(-limit);
  return recent
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        !IGNORED_MESSAGES.has(m.content)
    )
    .map((m) => {
      if (m.role === "user" && m.images?.length) {
        const parts: ContentPart[] = [{ type: "text", text: m.content }];
        for (const img of m.images) {
          parts.push({ type: "image_url", image_url: { url: img } });
        }
        return { role: "user" as const, content: parts };
      }
      return { role: m.role as "user" | "assistant", content: m.content };
    });
}

/** 解析 AI 返回的 JSON 为 MindMapNode 树 */
export function parseAIResponseToTree(json: string): MindMapNode | null {
  try {
    const match = json.match(/```json\s*([\s\S]*?)```/) || json.match(/(\{[\s\S]*\})/);
    if (!match) return null;
    const parsed = JSON.parse(match[1]);
    return validateNode(parsed);
  } catch {
    return null;
  }
}

function validateNode(obj: unknown): MindMapNode | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.label !== "string") return null;
  const children = Array.isArray(o.children)
    ? (o.children.map(validateNode).filter(Boolean) as MindMapNode[])
    : [];
  return {
    id: genId(),
    label: o.label,
    children,
  };
}

/** 统一的 AI API 调用（兼容 OpenAI 格式，DeepSeek/ChatGPT/千问都支持） */
export async function chatWithAI(
  config: AIProviderConfig,
  messages: ChatMessage[],
  onChunk?: (text: string) => void
): Promise<string> {
  const url = `${config.baseUrl}/v1/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: !!onChunk,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API 错误 (${response.status}): ${err}`);
  }

  // Streaming
  if (onChunk && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = ""; // 缓冲跨 chunk 的不完整行
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      // 最后一段可能是不完整的行，保留到下次
      buffer = parts.pop() ?? "";
      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6).trim();
        if (data === "[DONE]") break;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onChunk(fullText);
          }
        } catch {
          // skip malformed chunks
        }
      }
    }
    // 处理缓冲区中剩余的最后一行
    if (buffer.trim().startsWith("data: ")) {
      const data = buffer.trim().slice(6).trim();
      if (data && data !== "[DONE]") {
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onChunk(fullText);
          }
        } catch {
          // skip malformed
        }
      }
    }
    return fullText;
  }

  // Non-streaming
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/** 判断思维导图是否只有根节点（无实质子节点） */
function isMinimalMap(node: MindMapNode): boolean {
  return node.children.length === 0;
}

/** 构建「整个画布 AI 处理」的 prompt */
export function buildCanvasPrompt(
  rootNode: MindMapNode,
  userMessage: string,
  contextMessages: ChatMessage[] = [],
  images: string[] = []
): ChatMessage[] {
  const mapText = serializeMindMap(rootNode);
  const minimal = isMinimalMap(rootNode);

  const systemMsg: ChatMessage = {
    role: "system",
    content: `你是一个思维导图助手。用户会给你一个思维导图的当前内容和一个指令。
你需要理解当前思维导图的内容，然后根据用户的指令返回完整的思维导图 JSON。

${minimal ? `当前思维导图只有一个根节点，还没有任何子节点。你需要围绕根节点的主题和用户的指令，主动生成丰富、有层次的子节点结构（至少 3-5 个一级子节点，每个子节点下可以有 2-3 个更细的子节点）。不要只返回根节点，必须生成有意义的子节点内容。` : `请在现有内容的基础上进行修改和扩展。`}

JSON 格式要求：
{
  "label": "节点文本",
  "children": [子节点数组]
}

注意：不需要 id 字段，系统会自动生成。返回的 JSON 必须包含完整的树结构，根节点下必须有 children。

当前思维导图内容：
${mapText}

请只返回 JSON，用 \`\`\`json 包裹。在 JSON 之前用一句话简要说明你做了什么。`,
  };

  const userContent: ContentPart[] = [{ type: "text", text: userMessage }];
  for (const img of images) {
    userContent.push({ type: "image_url", image_url: { url: img } });
  }

  return [
    systemMsg,
    ...contextMessages,
    { role: "user", content: images.length ? userContent : userMessage },
  ];
}

/** 构建「节点级 AI 生成」的 prompt */
export function buildNodeExpandPrompt(
  rootNode: MindMapNode,
  targetNodeId: string,
  userMessage: string,
  contextMessages: ChatMessage[] = [],
  images: string[] = []
): ChatMessage[] {
  const mapText = serializeMindMap(rootNode);

  function findNode(node: MindMapNode, id: string): MindMapNode | null {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  }

  const targetNode = findNode(rootNode, targetNodeId);
  const targetLabel = targetNode?.label ?? "未知节点";

  const systemMsg: ChatMessage = {
    role: "system",
    content: `你是一个思维导图助手。用户选中了一个节点，需要你基于整个思维导图的上下文来拓展这个节点。

当前完整思维导图：
${mapText}

用户选中的节点是：「${targetLabel}」(ID: ${targetNodeId})

请为这个节点生成要添加的子节点。只返回新增的子节点数据，不要包含已有内容。
返回格式：
\`\`\`json
{
  "label": "${targetLabel}",
  "children": [
    {"label": "新子节点1", "children": []},
    {"label": "新子节点2", "children": [
      {"label": "孙节点1", "children": []}
    ]}
  ]
}
\`\`\`

重要：children 数组中只放新增的子节点，不要重复已有的子节点。每个节点不需要 id 字段。
请只返回 JSON，用 \`\`\`json 包裹。在 JSON 之前用一句话简要说明你生成了什么。`,
  };

  const msgText = userMessage || `请拓展「${targetLabel}」这个节点`;
  const userContent: ContentPart[] = [{ type: "text", text: msgText }];
  for (const img of images) {
    userContent.push({ type: "image_url", image_url: { url: img } });
  }

  return [
    systemMsg,
    ...contextMessages,
    { role: "user", content: images.length ? userContent : msgText },
  ];
}
