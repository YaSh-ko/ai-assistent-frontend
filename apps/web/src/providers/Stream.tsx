import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import { type Message } from "@langchain/langgraph-sdk";
import {
  uiMessageReducer,
  type UIMessage,
  type RemoveUIMessage,
} from "@langchain/langgraph-sdk/react-ui";
import { useQueryState } from "nuqs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LangGraphLogoSVG } from "@/components/icons/langgraph";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { getApiKey } from "@/lib/api-key";
import { getAuthToken } from "@/lib/api-client";
import { useThreads } from "./Thread";
import { toast } from "sonner";
import type { DetectorProposal } from "@/lib/detector-types";

export type StateType = { messages: Message[]; ui?: UIMessage[] };

export type DetectorCustomEvent = {
  type: "detector_proposal";
  proposal: DetectorProposal;
};

const useTypedStream = useStream<
  StateType,
  {
    UpdateType: {
      messages?: Message[] | Message | string;
      ui?: (UIMessage | RemoveUIMessage)[] | UIMessage | RemoveUIMessage;
    };
    CustomEventType: UIMessage | RemoveUIMessage | DetectorCustomEvent;
  }
>;

type StreamContextType = ReturnType<typeof useTypedStream>;
const StreamContext = createContext<StreamContextType | undefined>(undefined);

type DetectorProposalStreamContextValue = {
  streamProposal: DetectorProposal | null;
  clearStreamProposal: () => void;
};

const DetectorProposalStreamContext =
  createContext<DetectorProposalStreamContextValue | null>(null);

export function useDetectorProposalStream(): DetectorProposalStreamContextValue {
  const ctx = useContext(DetectorProposalStreamContext);
  if (!ctx) {
    return { streamProposal: null, clearStreamProposal: () => {} };
  }
  return ctx;
}

function isDetectorCustomEvent(
  event: UIMessage | RemoveUIMessage | DetectorCustomEvent,
): event is DetectorCustomEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    "type" in event &&
    (event as DetectorCustomEvent).type === "detector_proposal" &&
    "proposal" in event
  );
}

async function sleep(ms = 4000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkGraphStatus(
  apiUrl: string,
  apiKey: string | null,
): Promise<boolean> {
  try {
    const res = await fetch(`${apiUrl}/info`, {
      ...(apiKey && {
        headers: {
          "X-Api-Key": apiKey,
        },
      }),
    });

    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// Default values for the form
const getDefaultApiUrl = () => {
  return "/ai/api/v1";
};

const DEFAULT_API_URL = getDefaultApiUrl();
const DEFAULT_ASSISTANT_ID = "rag_chain";

const StreamSession = ({
  children,
  apiKey,
  apiUrl,
  assistantId,
}: {
  readonly children: ReactNode;
  readonly apiKey: string | null;
  readonly apiUrl: string;
  readonly assistantId: string;
}) => {
  const [threadId, setThreadId] = useQueryState("threadId");
  const { getThreads, setThreads } = useThreads();
  const [streamProposal, setStreamProposal] = useState<DetectorProposal | null>(null);
  const clearStreamProposal = useCallback(() => setStreamProposal(null), []);

  // Extract user_id from JWT token to pass as X-User-Id header
  const authHeaders = useMemo(() => {
    try {
      const token = getAuthToken();
      if (!token) return undefined;
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replaceAll('-', '+').replaceAll('_', '/');
      const payload = JSON.parse(decodeURIComponent(
        globalThis.atob(base64).split('').map((c) => '%' + ('00' + c.codePointAt(0)!.toString(16)).slice(-2)).join('')
      ));
      if (payload?.sub) {
        return { "X-User-Id": payload.sub, "Authorization": `Bearer ${token}` };
      }
    } catch { /* ignore */ }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]); // re-compute if apiUrl changes (session may have changed too)

  const streamValue = useTypedStream({
    apiUrl,
    apiKey: apiKey ?? undefined,
    assistantId,
    threadId: threadId ?? null,
    defaultHeaders: authHeaders,
    onCustomEvent: (event, options) => {
      if (isDetectorCustomEvent(event) && event.proposal?.show_chip) {
        setStreamProposal(event.proposal);
        return;
      }
      options.mutate((prev) => {
        const ui = uiMessageReducer(prev.ui ?? [], event as UIMessage | RemoveUIMessage);
        return { ...prev, ui };
      });
    },
    onThreadId: (id) => {
      setThreadId(id);
      setStreamProposal(null);
      sleep().then(() => getThreads().then(setThreads).catch(console.error));
    },
  });

  useEffect(() => {
    checkGraphStatus(apiUrl, apiKey).then((ok) => {
      if (!ok) {
        const description = `Проверь, что граф запущен по адресу ${apiUrl} и API-ключ указан корректно (если используется удаленное подключение).`;
        toast.error("Не удалось подключиться к серверу графа", {
          description,
          duration: 10000,
          richColors: true,
          closeButton: true,
        });
      }
    });
  }, [apiKey, apiUrl]);

  return (
    <StreamContext.Provider value={streamValue}>
      <DetectorProposalStreamContext.Provider
        value={{ streamProposal, clearStreamProposal }}
      >
        {children}
      </DetectorProposalStreamContext.Provider>
    </StreamContext.Provider>
  );
};

const ConfigurationForm = ({
  apiUrl,
  assistantId,
  apiKey,
  onSubmit,
}: {
  readonly apiUrl: string;
  readonly assistantId: string;
  readonly apiKey: string;
  readonly onSubmit: (data: { apiUrl: string; assistantId: string; apiKey: string }) => void;
}) => (
  <div className="flex items-center justify-center min-h-screen w-full p-4">
    <div className="animate-in fade-in-0 zoom-in-95 flex flex-col border bg-background shadow-lg rounded-lg max-w-3xl">
      <div className="flex flex-col gap-2 mt-14 p-6 border-b">
        <div className="flex items-start flex-col gap-2">
          <LangGraphLogoSVG className="h-7" />
          <h1 className="text-xl font-semibold tracking-tight">
            Ассистент
          </h1>
        </div>
        <p className="text-muted-foreground">
          Перед началом укажи адрес развертывания и идентификатор ассистента (графа).
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();

          const form = e.target as HTMLFormElement;
          const formData = new FormData(form);
          const apiUrl = formData.get("apiUrl") as string;
          const assistantId = formData.get("assistantId") as string;
          const apiKey = formData.get("apiKey") as string;

          onSubmit({ apiUrl, assistantId, apiKey });
          form.reset();
        }}
        className="flex flex-col gap-6 p-6 bg-muted/50"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="apiUrl">
            URL развертывания<span className="text-rose-500">*</span>
          </Label>
          <p className="text-muted-foreground text-sm">
            Адрес твоего развертывания LangGraph. Может быть локальным или продакшен-адресом.
          </p>
          <Input
            id="apiUrl"
            name="apiUrl"
            className="bg-background"
            defaultValue={apiUrl ?? DEFAULT_API_URL}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="assistantId">
            ID ассистента / графа<span className="text-rose-500">*</span>
          </Label>
          <p className="text-muted-foreground text-sm">
            Идентификатор графа (или его имя), из которого загружается история и в который отправляются запросы.
          </p>
          <Input
            id="assistantId"
            name="assistantId"
            className="bg-background"
            defaultValue={assistantId ?? DEFAULT_ASSISTANT_ID}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="apiKey">API-ключ LangSmith</Label>
          <p className="text-muted-foreground text-sm">
            Для локального сервера этот ключ <strong>не обязателен</strong>. Значение сохраняется в браузере и используется только для авторизации запросов к серверу LangGraph.
          </p>
          <PasswordInput
            id="apiKey"
            name="apiKey"
            defaultValue={apiKey ?? ""}
            className="bg-background"
            placeholder="lsv2_pt_..."
          />
        </div>

        <div className="flex justify-end mt-2">
          <Button type="submit" size="lg">
            Продолжить
            <ArrowRight className="size-5" />
          </Button>
        </div>
      </form>
    </div>
  </div>
);

export const StreamProvider: React.FC<{ readonly children: ReactNode }> = ({
  children,
}) => {
  // Get environment variables
  const envApiUrl: string | undefined = `${import.meta.env.VITE_AI_URL}/ai/api/v1`;
  const envAssistantId: string | undefined = import.meta.env.VITE_ASSISTANT_ID;
  const envApiKey: string | undefined = import.meta.env.VITE_LANGSMITH_API_KEY;

  // Use URL params with env var fallbacks
  const [apiUrl, setApiUrl] = useQueryState("apiUrl", {
    defaultValue: envApiUrl ?? DEFAULT_API_URL,
  });
  const [assistantId, setAssistantId] = useQueryState("assistantId", {
    defaultValue: envAssistantId ?? DEFAULT_ASSISTANT_ID,
  });

  // For API key, use localStorage with env var fallback
  const [apiKey, setApiKey] = useState(() => {
    const storedKey = getApiKey();
    return storedKey ?? envApiKey ?? "";
  });

  const updateApiKey = (key: string) => {
    globalThis.localStorage.setItem("lg:chat:apiKey", key);
    setApiKey(key);
  };

  // Determine final values to use, prioritizing URL params then env vars
  const finalApiUrl = apiUrl ?? envApiUrl ?? DEFAULT_API_URL;
  const finalAssistantId = assistantId ?? envAssistantId ?? DEFAULT_ASSISTANT_ID;

  // If we're missing any required values, show the form
  if (!finalApiUrl || !finalAssistantId) {
    return (
      <ConfigurationForm
        apiUrl={apiUrl}
        assistantId={assistantId}
        apiKey={apiKey}
        onSubmit={({ apiUrl, assistantId, apiKey }) => {
          setApiUrl(apiUrl);
          updateApiKey(apiKey);
          setAssistantId(assistantId);
        }}
      />
    );
  }

  return (
    <StreamSession
      apiKey={apiKey}
      apiUrl={finalApiUrl}
      assistantId={finalAssistantId}
    >
      {children}
    </StreamSession>
  );
};

// Create a custom hook to use the context
export const useStreamContext = (): StreamContextType => {
  const context = useContext(StreamContext);
  if (context === undefined) {
    throw new Error("useStreamContext должен использоваться внутри StreamProvider");
  }
  return context;
};

export default StreamContext;
