import { v4 as uuidv4 } from "uuid";
import { useEffect, useRef, useCallback, useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStreamContext } from "@/providers/Stream";
import { Button } from "../ui/button";
import { Checkpoint, Message } from "@langchain/langgraph-sdk";
import { AssistantMessage, AssistantMessageLoading } from "./messages/ai";
import { HumanMessage } from "./messages/human";
import {
  DO_NOT_RENDER_ID_PREFIX,
  ensureToolCallsHaveResponses,
} from "@/lib/ensure-tool-responses";

import {
  ArrowUp,
  ChevronDown,
  PanelLeft,
} from "lucide-react";
import { ThreadMoreMenu } from "./thread-more-menu";
import { useThreads } from "@/providers/Thread";
import { useQueryState, parseAsBoolean } from "nuqs";
// StickToBottom removed — using manual scroll
import ThreadHistory from "./history";
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { type ThreadContext } from "./context-banner";
import { GoalFocusChip } from "./goal-focus-chip";
import { DetectorProposalChip } from "./detector-proposal-chip";
import { chatApi } from "@/lib/api-client";
import { useDetectorProposal } from "@/hooks/useDetectorProposal";
import { useGoalFocus, type GoalFocusMetadata } from "@/hooks/useGoalFocus";

function ScrollToBottom({ scrollRef, className }: Readonly<{ scrollRef: React.RefObject<HTMLDivElement | null>; className?: string }>) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      setShow(!isNearBottom);
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [scrollRef]);

  if (!show) return null;
  return (
    <Button
      variant="outline"
      className={cn(
        "h-11 w-11 rounded-xl border-zinc-700 bg-zinc-900/90 text-zinc-200 shadow-none backdrop-blur-sm hover:bg-zinc-800 hover:border-zinc-600",
        className,
      )}
      onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })}
    >
      <ChevronDown className="w-6 h-6 text-white" />
    </Button>
  );
}

function VoiceInputIndicator({ isListening }: Readonly<{ isListening: boolean }>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.8 }}
      animate={{
        opacity: isListening ? 1 : 0,
        y: isListening ? 0 : 10,
        scale: isListening ? 1 : 0.8
      }}
      transition={{
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1]
      }}
      className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-zinc-950 px-6 py-3 rounded-lg text-sm font-medium z-20 shadow-lg pointer-events-none"
    >
      Говорите...
    </motion.div>
  );
}

function VoiceInputButton({
  isListening,
  onVoiceInput
}: Readonly<{
  isListening: boolean;
  onVoiceInput: () => void;
}>) {
  return (
    <motion.button
      type="button"
      onClick={onVoiceInput}
      className="cursor-pointer outline-none focus:outline-none active:opacity-100 bg-transparent hover:bg-transparent focus:bg-transparent border-none flex-shrink-0 relative"
      title={isListening ? "Остановить запись" : "Начать голосовой ввод"}
      animate={{
        scale: isListening ? 1.25 : 1
      }}
      transition={{
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1]
      }}
    >
      <img
        src="/image 3.png"
        alt="Voice Input"
        className={cn(
          "h-4 sm:h-5 w-auto transition-opacity duration-300 ease-in-out",
          !isListening && "opacity-70 hover:opacity-100"
        )}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: isListening ? 1 : 0,
          scale: isListening ? 1 : 0
        }}
        transition={{
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1],
          delay: isListening ? 0.1 : 0
        }}
        className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full"
      />
    </motion.button>
  );
}

function ChatInput({
  input,
  setInput,
  onSubmit,
  isListening,
  onVoiceInput,
  chatStarted,
  goalFocus,
  onClearGoalFocus,
}: Readonly<{
  input: string;
  setInput: (value: string) => void;
  onSubmit: () => void;
  isListening: boolean;
  onVoiceInput: () => void;
  chatStarted?: boolean;
  goalFocus?: ThreadContext | null;
  onClearGoalFocus?: () => void;
}>) {
  const isDesktop = useMediaQuery("(min-width: 640px)");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (input === "" && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input]);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    const maxHeight = 120; // ~4 lines
    const newHeight = Math.min(e.target.scrollHeight, maxHeight);
    e.target.style.height = newHeight + 'px';
  }, [setInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.metaKey &&
      !e.nativeEvent.isComposing
    ) {
      e.preventDefault();
      onSubmit();
    }
  }, [onSubmit]);

  const getPlaceholder = () => {
    if (goalFocus) {
      return chatStarted
        ? "Шаг, уточнение цели или вопрос по плану…"
        : "Обсудим цель и следующие шаги…";
    }
    if (chatStarted) {
      return "Поделитесь мыслями…";
    }
    return isDesktop ? "Опишите цель, шаг или наблюдение…" : "Напишите ассистенту";
  };

  const canSend = input.trim().length > 0;

  return (
    <div className="flex justify-center w-full max-w-3xl mx-auto pb-2 px-4">
      <VoiceInputIndicator isListening={isListening} />
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="flex-1 relative rounded-2xl border border-zinc-800 bg-zinc-900/95 shadow-lg backdrop-blur-sm px-4 py-3 flex flex-col gap-2"
      >
        {goalFocus && onClearGoalFocus && (
          <GoalFocusChip context={goalFocus} onDismiss={onClearGoalFocus} />
        )}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          className="w-full bg-transparent border-none outline-none resize-none text-[16px] leading-relaxed text-zinc-100 placeholder:text-zinc-500 overflow-y-auto max-h-[120px]"
          rows={1}
        />
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/80">
          <VoiceInputButton isListening={isListening} onVoiceInput={onVoiceInput} />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Отправить"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full transition-all flex-shrink-0",
              canSend
                ? "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 active:scale-95"
                : "bg-zinc-800 text-zinc-600 cursor-not-allowed",
            )}
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </form>
    </div>
  );
}

function SidebarButton({
  setChatHistoryOpen,
  isLargeScreen,
}: Readonly<{
  setChatHistoryOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  isLargeScreen: boolean;
}>) {
  if (isLargeScreen) return null;

  return (
    <Button
      className="hover:bg-transparent focus:bg-transparent active:bg-transparent p-0 w-auto h-auto"
      variant="ghost"
      size="icon"
      onClick={() => setChatHistoryOpen((p) => !p)}
      aria-label="Открыть список чатов"
    >
      <PanelLeft className="w-5 h-5 text-zinc-400" strokeWidth={1.75} />
    </Button>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  entry: "События",
  goal: "Цели/Желания",
  experiment: "Эксперименты",
  analysis: "Разбор",
  general: "Чаты",
};

function ChatHeader({
  chatHistoryOpen,
  setChatHistoryOpen,
  setThreadId,
  isLargeScreen,
  threadId,
  threadContext,
  messages,
  refreshThreads,
}: Readonly<{
  chatHistoryOpen: boolean;
  setChatHistoryOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  setThreadId: (value: string | null) => void;
  isLargeScreen: boolean;
  threadId: string | null;
  threadContext: ThreadContext | null;
  messages: Message[];
  refreshThreads: () => Promise<void>;
}>) {
  const { threads, updateThreadTitle } = useThreads();
  const [isEditing, setIsEditing] = useState(false);

  const currentThread = threads.find((t) => t.thread_id === threadId);
  const values = currentThread?.values as Record<string, unknown> | undefined;
  const currentTitle = typeof values?.title === "string" && values.title !== threadId
    ? values.title
    : null;
  const currentCategory = (currentThread?.metadata as Record<string, unknown> | undefined)?.category as string | undefined;

  const categoryLabel = currentCategory ? CATEGORY_LABELS[currentCategory] ?? currentCategory : null;

  const [editValue, setEditValue] = useState("");

  const startEdit = useCallback(() => {
    setEditValue(currentTitle ?? "");
    setIsEditing(true);
  }, [currentTitle]);

  const commitEdit = useCallback(async () => {
    if (!threadId) return;
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== currentTitle) {
      await updateThreadTitle(threadId, trimmed);
    }
    setIsEditing(false);
  }, [threadId, editValue, currentTitle, updateThreadTitle]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setIsEditing(false);
  }, [commitEdit]);

  return (
    <div className="flex items-center justify-between gap-3 p-2 z-10 relative">
      <div className="flex items-center justify-start gap-2 relative">
        <div className="absolute left-[10px] z-10">
          <SidebarButton
            setChatHistoryOpen={setChatHistoryOpen}
            isLargeScreen={isLargeScreen}
          />
        </div>
      </div>

      {threadId && currentTitle && (
        <div className="flex-1 flex justify-center items-center min-w-0">
          <div className="flex items-center gap-1.5">
            {categoryLabel && (
              <span className="text-emerald-400/90 text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 rounded-full px-3 py-1 flex-shrink-0">
                {categoryLabel}
              </span>
            )}
            {isEditing ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
                className="bg-transparent border-b border-emerald-500/50 text-zinc-100 text-base font-medium outline-none text-center w-48 sm:w-64"
              />
            ) : (
              <>
                <span className="text-zinc-100 text-base font-medium truncate max-w-[180px] sm:max-w-xs">
                  {currentTitle}
                </span>
                <button
                  onClick={startEdit}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
                  title="Переименовать"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <ThreadMoreMenu
          threadId={threadId}
          threadContext={threadContext}
          messages={messages}
          onThreadDeleted={async () => {
            setThreadId(null);
            await refreshThreads();
          }}
          className="p-4 h-auto w-auto hover:bg-transparent"
        />
      </div>

      <div className="absolute inset-x-0 top-full h-5 bg-gradient-to-b from-background to-background/0" />
    </div>
  );
}

function MessagesList({
  messages,
  isLoading,
  handleRegenerate,
  stream,
  hasNoAIOrToolMessages,
  firstTokenReceived
}: Readonly<{
  messages: Message[];
  isLoading: boolean;
  handleRegenerate: (parentCheckpoint: Checkpoint | null | undefined) => void;
  stream: any;
  hasNoAIOrToolMessages: boolean;
  firstTokenReceived: boolean;
}>) {
  return (
    <>
      {messages
        .filter((m) => !m.id?.startsWith(DO_NOT_RENDER_ID_PREFIX))
        .map((message, index) =>
          message.type === "human" ? (
            <HumanMessage
              key={message.id || `${message.type}-${index}`}
              message={message}
              isLoading={isLoading}
            />
          ) : (
            <AssistantMessage
              key={message.id || `${message.type}-${index}`}
              message={message}
              isLoading={isLoading}
              handleRegenerate={handleRegenerate}
            />
          ),
        )}
      {hasNoAIOrToolMessages && !!stream.interrupt && (
        <AssistantMessage
          key="interrupt-msg"
          message={undefined}
          isLoading={isLoading}
          handleRegenerate={handleRegenerate}
        />
      )}
      {isLoading && !firstTokenReceived && (
        <AssistantMessageLoading />
      )}
    </>
  );
}

function buildStreamMetadata(goalMetadata: GoalFocusMetadata | null) {
  return { thread_context: goalMetadata ?? null };
}

export function Thread() {
  const [threadId, setThreadId] = useQueryState("threadId");
  const [goalId, setGoalId] = useQueryState("goalId");
  const [chatHistoryOpen, setChatHistoryOpen] = useQueryState(
    "chatHistoryOpen",
    parseAsBoolean.withDefault(true),
  );
  const [input, setInput] = useState("");
  const [firstTokenReceived, setFirstTokenReceived] = useState(false);
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [threadContext, setThreadContext] = useState<ThreadContext | null>(null);
  const [goalFocusBanner, setGoalFocusBanner] = useState<ThreadContext | null>(null);
  const [goalMetadata, setGoalMetadata] = useState<GoalFocusMetadata | null>(null);

  useGoalFocus(goalId, setGoalFocusBanner, setGoalMetadata);

  /** Чат, в котором включили фокус цели (сброс при переключении треда). */
  const goalFocusThreadRef = useRef<string | null | undefined>(undefined);

  const clearGoalFocus = useCallback(() => {
    setGoalId(null);
    setGoalFocusBanner(null);
    setGoalMetadata(null);
    goalFocusThreadRef.current = undefined;
  }, [setGoalId]);

  useEffect(() => {
    if (goalId) {
      goalFocusThreadRef.current = threadId ?? null;
    } else {
      goalFocusThreadRef.current = undefined;
    }
  }, [goalId]);

  useEffect(() => {
    if (!goalId || goalFocusThreadRef.current === undefined) return;

    const bound = goalFocusThreadRef.current;
    if (bound === null && threadId) {
      goalFocusThreadRef.current = threadId;
      return;
    }
    if (threadId !== bound) {
      clearGoalFocus();
    }
  }, [threadId, goalId, clearGoalFocus]);

  // Голосовой ввод
  const {
    isListening,
    transcript,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const stream = useStreamContext();
  const messages = stream.messages;
  const isLoading = stream.isLoading;
  const { getThreads, setThreads } = useThreads();

  const lastError = useRef<string | undefined>(undefined);
  const prevMessageLength = useRef(0);

  // Обновляем input когда получаем transcript
  useEffect(() => {
    if (transcript) {
      setInput(prev => {
        const separator = prev.trim() ? ' ' : '';
        return prev + separator + transcript;
      });
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  // Обработчик голосового ввода
  const handleVoiceInput = useCallback(() => {
    if (!isSpeechSupported) {
      toast.error("Голосовой ввод не поддерживается в вашем браузере");
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isSpeechSupported, isListening, stopListening, startListening]);

  // Обработка ошибок стрима
  useEffect(() => {
    if (!stream.error) {
      lastError.current = undefined;
      return;
    }

    try {
      const message = (stream.error as any).message;
      if (!message || lastError.current === message) {
        return;
      }

      lastError.current = message;
      toast.error("Произошла ошибка. Попробуй ещё раз.", {
        description: (
          <p>
            <strong>Детали:</strong> <code>{message}</code>
          </p>
        ),
        richColors: true,
        closeButton: true,
      });
    } catch {
      // no-op
    }
  }, [stream.error]);

  // Отслеживание получения первого токена
  useEffect(() => {
    const hasNewAIMessage = messages.length !== prevMessageLength.current &&
      messages?.length &&
      messages[messages.length - 1].type === "ai";

    if (hasNewAIMessage) {
      setFirstTokenReceived(true);
    }

    prevMessageLength.current = messages.length;
  }, [messages]);

  // Контекст треда из API (только без активного фокуса цели)
  useEffect(() => {
    if (goalId || !threadId) {
      if (!goalId) setThreadContext(null);
      return;
    }
    chatApi.getThreadContext(threadId)
      .then((data) => {
        if (data?.title && data.type !== "general") {
          setThreadContext({
            type: (data.type ?? "general") as ThreadContext["type"],
            title: data.title,
            description: data.description || undefined,
            entity_id: data.entity_id || data.entry_id || undefined,
          });
        } else {
          setThreadContext(null);
        }
      })
      .catch(() => setThreadContext(null));
  }, [threadId, goalId]);

  const {
    proposal: detectorProposal,
    isSaving: detectorSaving,
    confirm: confirmDetector,
    decline: declineDetector,
    dismissChip: dismissDetectorChip,
  } = useDetectorProposal(threadId, goalMetadata);

  const handleSubmit = useCallback((e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    dismissDetectorChip();
    setFirstTokenReceived(false);

    const newHumanMessage: Message = {
      id: uuidv4(),
      type: "human",
      content: input,
    };
    const toolMessages = ensureToolCallsHaveResponses(stream.messages);
    stream.submit(
      { messages: [...toolMessages, newHumanMessage] },
      {
        streamMode: ["values"],
        metadata: buildStreamMetadata(goalMetadata) as Record<string, unknown>,
        optimisticValues: (prev) => ({
          ...prev,
          messages: [
            ...(prev.messages ?? []),
            ...toolMessages,
            newHumanMessage,
          ],
        }),
      },
    );

    setInput("");
  }, [input, isLoading, stream, dismissDetectorChip, goalMetadata]);

  const handleRegenerate = useCallback((
    parentCheckpoint: Checkpoint | null | undefined,
  ) => {
    prevMessageLength.current = prevMessageLength.current - 1;
    setFirstTokenReceived(false);
    stream.submit(undefined, {
      checkpoint: parentCheckpoint,
      streamMode: ["values"],
      metadata: buildStreamMetadata(goalMetadata),
    });
  }, [stream, goalMetadata]);

  const chatStarted = !!messages.length;
  const hasNoAIOrToolMessages = !messages.some(
    (m) => m.type === "ai" || m.type === "tool",
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length]);

  return (
    <div className="flex w-full h-full min-h-0 overflow-hidden">
      <ThreadHistory
        collapsed={!chatHistoryOpen}
        onToggleCollapse={() => setChatHistoryOpen((p) => !p)}
      />

      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative bg-[var(--growth-bg)]",
          !chatStarted && "grid-rows-[1fr]",
        )}
      >
        <div className="shrink-0 z-30 bg-[var(--growth-bg)] border-b border-zinc-800/60">
          <ChatHeader
            chatHistoryOpen={chatHistoryOpen}
            setChatHistoryOpen={setChatHistoryOpen}
            setThreadId={setThreadId}
            isLargeScreen={isLargeScreen}
            threadId={threadId ?? null}
            threadContext={threadContext}
            messages={messages}
            refreshThreads={async () => {
              try {
                const next = await getThreads();
                setThreads(next);
              } catch (e) {
                console.error(e);
              }
            }}
          />
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div
            ref={scrollRef}
            className={cn(
              "absolute inset-0 overflow-y-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              !chatStarted && "flex flex-col justify-center items-center",
            )}
          >
            {chatStarted ? (
              <div className="pt-8 pb-[200px] px-2 sm:px-4 max-w-full sm:max-w-3xl mx-auto flex flex-col gap-5 w-full">
                <MessagesList
                  messages={messages}
                  isLoading={isLoading}
                  handleRegenerate={handleRegenerate}
                  stream={stream}
                  hasNoAIOrToolMessages={hasNoAIOrToolMessages}
                  firstTokenReceived={firstTokenReceived}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-8 w-full px-4 -translate-y-[8vh]">
                <div className="flex flex-col items-center gap-3 w-full max-w-lg">
                  <h2 className="text-zinc-100 text-2xl sm:text-3xl font-semibold text-center tracking-tight">
                    {goalFocusBanner ? "Обсудим шаги к цели" : "Что развиваем сегодня?"}
                  </h2>
                  <p className="text-zinc-500 text-sm sm:text-base text-center leading-relaxed">
                    {goalFocusBanner
                      ? "Пока плашка над полем ввода активна — ответы и подсказки сохранения идут в эту цель"
                      : "Наблюдения и цели — ассистент свяжет их в графе знаний"}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-3 w-full">
                  <div className="relative w-full max-w-3xl mx-auto">
                  <ChatInput
                    input={input}
                    setInput={setInput}
                    onSubmit={handleSubmit}
                    isListening={isListening}
                    onVoiceInput={handleVoiceInput}
                    chatStarted={false}
                    goalFocus={goalFocusBanner}
                    onClearGoalFocus={goalFocusBanner ? clearGoalFocus : undefined}
                  />
                  </div>
                </div>
              </div>
            )}
          </div>

          {chatStarted && (
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-2 sm:gap-4 bg-gradient-to-t from-zinc-950 from-75% via-zinc-950/80 to-transparent pt-8 pb-0 w-full z-10">
              <div className="flex flex-col items-center gap-2 pb-6 sm:pb-0 sm:-mb-[40px] w-full sm:-translate-y-[60px]">
                <div className="relative z-20 w-full max-w-3xl px-4 mb-1">
                  <DetectorProposalChip
                    proposal={detectorProposal}
                    isSaving={detectorSaving}
                    onConfirm={() => void confirmDetector()}
                    onDecline={() => void declineDetector()}
                  />
                </div>
                {!isLoading && (
                    <div className="w-full max-w-3xl px-4 flex justify-end mb-1 sm:mb-2">
                      <ScrollToBottom
                        scrollRef={scrollRef}
                        className="animate-in fade-in-0 zoom-in-95"
                      />
                    </div>
                )}
                <ChatInput
                  input={input}
                  setInput={setInput}
                  onSubmit={handleSubmit}
                  isListening={isListening}
                  onVoiceInput={handleVoiceInput}
                  chatStarted={true}
                  goalFocus={goalFocusBanner}
                  onClearGoalFocus={goalFocusBanner ? clearGoalFocus : undefined}
                />
              </div>
            </div>
          )}

          <span className="fixed bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 text-zinc-500 text-[10px] sm:text-xs z-20 text-center w-full px-4 sm:w-auto sm:px-0 pointer-events-none">
            Ассистент может ошибаться — проверяйте важные решения сами.
          </span>
        </div>
      </div>
    </div>
  );
}
