import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import type { Message } from "@langchain/langgraph-sdk";

const FALLBACK_HINTS = [
  "Как я себя чувствую сегодня?",
  "Что меня больше всего занимает сейчас?",
  "Что я хочу изменить в своей жизни?",
];

/**
 * Хук для получения динамических подсказок-вопросов от LLM.
 *
 * @param messages - история сообщений чата
 * @param enabled  - включена ли генерация (false — не делает запросов)
 * @returns { hints, isLoading, refresh }
 */
export function useHints(messages: Message[], enabled: boolean) {
  const [hints, setHints] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const prevLengthRef = useRef<number>(-1);
  // При 4xx-ответе помечаем API как недоступный и больше не повторяем запросы
  const apiUnavailableRef = useRef(false);

  const fetchHints = useCallback(async (msgs: Message[]) => {
    if (apiUnavailableRef.current) {
      setHints(FALLBACK_HINTS);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    try {
      const recent = msgs.slice(-6).map((m) => ({
        type: m.type,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      }));

      const response = await apiRequest("/ai/api/v1/hints", {
        method: "POST",
        body: JSON.stringify({ messages: recent }),
      });

      // 4xx → API недоступен, переключаемся на fallback навсегда
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          apiUnavailableRef.current = true;
        }
        setHints(FALLBACK_HINTS);
        return;
      }

      const data = await response.json();
      const result: string[] = Array.isArray(data.hints) ? data.hints : [];
      setHints(result.length > 0 ? result : FALLBACK_HINTS);
    } catch {
      setHints(FALLBACK_HINTS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const lastMsg = messages.at(-1);
    const isInitial = messages.length === 0;
    const isAfterAI = lastMsg?.type === "ai";

    if (!isInitial && !isAfterAI) return;
    if (messages.length === prevLengthRef.current) return;

    prevLengthRef.current = messages.length;
    fetchHints(messages);
  }, [enabled, messages, fetchHints]);

  const refresh = useCallback(() => {
    apiUnavailableRef.current = false;
    fetchHints(messages);
  }, [fetchHints, messages]);

  return { hints, isLoading, refresh };
}
