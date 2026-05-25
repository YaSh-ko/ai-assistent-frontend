import type { Message } from "@langchain/langgraph-sdk";

export function getContentString(content: Message["content"]): string {
  if (typeof content === "string") return content;
  const texts = content
    .filter((c): c is { type: "text"; text: string } => c.type === "text")
    .map((c) => c.text);
  return texts.join(" ");
}

/** Заголовок чата в сайдбаре: без эмодзи, одна строка с обрезкой */
export function formatSidebarThreadTitle(text: string, maxLength = 56): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const withoutEmoji = normalized
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[\u2600-\u27BF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const cleaned = withoutEmoji || normalized;
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trim()}…`;
}
