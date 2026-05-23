import { Thread } from "@langchain/langgraph-sdk";
import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useState,
  Dispatch,
  SetStateAction,
  useMemo,
} from "react";
import { chatApi } from "@/lib/api-client";

const FAVORITES_STORAGE_KEY = "delez-favorite-thread-ids";

function readFavoriteIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

interface ThreadContextType {
  getThreads: () => Promise<Thread[]>;
  threads: Thread[];
  setThreads: Dispatch<SetStateAction<Thread[]>>;
  threadsLoading: boolean;
  setThreadsLoading: Dispatch<SetStateAction<boolean>>;
  updateThreadTitle: (threadId: string, title: string) => Promise<void>;
  updateThreadCategory: (threadId: string, category: string) => Promise<void>;
  favoriteIds: string[];
  toggleFavorite: (threadId: string) => void;
}

const ThreadContext = createContext<ThreadContextType | undefined>(undefined);



export function ThreadProvider({ children }: { readonly children: ReactNode }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readFavoriteIds());

  const getThreads = useCallback(async (): Promise<Thread[]> => {
    try {
      const data = await chatApi.getConversations();
      const conversations: Array<{
        id: string;
        thread_id: string;
        title?: string;
        category?: string;
        created_at: string;
        last_active_at: string;
      }> = data?.conversations ?? [];



      if (!data?.conversations) {
        console.warn("ThreadProvider: API returned success but 'conversations' field is missing or empty", data);
      }

      // Адаптируем формат нашего API к формату Thread из LangGraph SDK
      return conversations.map((c) => ({
        thread_id: c.thread_id,
        created_at: c.created_at,
        updated_at: c.last_active_at,
        status: "idle" as const,
        values: { title: c.title ?? c.thread_id },
        metadata: { conversation_id: c.id, category: c.category ?? "general" },
      } as unknown as Thread));
    } catch (e) {
      console.error("Failed to load conversations", e);
      return [];
    }
  }, []);

  const updateThreadTitle = useCallback(async (threadId: string, title: string): Promise<void> => {
    await chatApi.updateThreadTitle(threadId, title);
    setThreads((prev) =>
      prev.map((t) =>
        t.thread_id === threadId
          ? { ...t, values: { ...(t.values as object), title } }
          : t
      )
    );
  }, []);

  const updateThreadCategory = useCallback(async (threadId: string, category: string): Promise<void> => {
    await chatApi.updateThreadCategory(threadId, category);
    setThreads((prev) =>
      prev.map((t) =>
        t.thread_id === threadId
          ? { ...t, metadata: { ...(t.metadata as object), category } }
          : t
      )
    );
  }, []);

  const toggleFavorite = useCallback((threadId: string) => {
    setFavoriteIds((prev) => {
      const next = prev.includes(threadId)
        ? prev.filter((id) => id !== threadId)
        : [...prev, threadId];
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    getThreads,
    threads,
    setThreads,
    threadsLoading,
    setThreadsLoading,
    updateThreadTitle,
    updateThreadCategory,
    favoriteIds,
    toggleFavorite,
  }), [getThreads, threads, threadsLoading, updateThreadTitle, updateThreadCategory, favoriteIds, toggleFavorite]);

  return (
    <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>
  );
}

export function useThreads() {
  const context = useContext(ThreadContext);
  if (context === undefined) {
    throw new Error("useThreads must be used within a ThreadProvider");
  }
  return context;
}
