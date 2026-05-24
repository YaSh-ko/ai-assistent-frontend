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
  ChevronDown,
} from "lucide-react";
import { ThreadMoreMenu } from "./thread-more-menu";
import { useThreads } from "@/providers/Thread";
import { useQueryState, parseAsBoolean } from "nuqs";
// StickToBottom removed — using manual scroll
import ThreadHistory from "./history";
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import ParticlesBackground from "@/components/ParticlesBackground";
import { useHints } from "@/hooks/useHints";
import { ChatHints } from "./chat-hints";
import { type ThreadContext } from "./context-banner";
import { DetectorProposalChip } from "./detector-proposal-chip";
import { chatApi } from "@/lib/api-client";
import { useDetectorProposal } from "@/hooks/useDetectorProposal";

const AI_PERSONA_STORAGE_KEY = "delez_ai_persona_v1";

type AssistantPersonaConfig = {
  persona: string;
  role: string;
};

function readAssistantPersonaConfig(): AssistantPersonaConfig | null {
  try {
    const raw = localStorage.getItem(AI_PERSONA_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AssistantPersonaConfig>;
    if (!parsed.persona || !parsed.role) return null;
    return { persona: parsed.persona, role: parsed.role };
  } catch (error) {
    console.error("Не удалось прочитать персону ИИ", error);
    return null;
  }
}

function buildHiddenPersonaMessage(): Message | null {
  const cfg = readAssistantPersonaConfig();
  if (!cfg) return null;
  return {
    id: `${DO_NOT_RENDER_ID_PREFIX}${uuidv4()}`,
    type: "human",
    content: `[Персона ассистента]\nСтиль: ${cfg.persona}\nРоль: ${cfg.role}\nСледуй этим настройкам в ответе.`,
  };
}

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
        "h-11 w-11 rounded-[12px] border-white/20 bg-[#000019]/45 text-white/90 shadow-none backdrop-blur-sm hover:bg-white/10 hover:border-white/30",
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
      className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white text-[#000019] px-6 py-3 rounded-lg text-sm font-medium z-20 shadow-lg pointer-events-none"
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
  chatStarted
}: Readonly<{
  input: string;
  setInput: (value: string) => void;
  onSubmit: () => void;
  isListening: boolean;
  onVoiceInput: () => void;
  chatStarted?: boolean;
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
    if (chatStarted) {
      return "Поделитесь мыслями…";
    }
    return isDesktop ? "Дорогой дневник..." : "Спросите Delёz";
  };

  return (
    <div className="flex justify-center w-full max-w-3xl mx-auto pb-2 px-4">
      <VoiceInputIndicator isListening={isListening} />
      <div className="flex-1 bg-[#000019] rounded-[20px] border border-white/20 shadow-xs relative z-10 px-3 sm:px-4 py-2 flex flex-col gap-0">
        <div className={`flex gap-2 ${input.length > 60 || input.includes('\n') ? 'flex-col' : 'flex-row items-center'}`}>
          <form
            onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
            className="flex-1"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              className="w-full bg-transparent border-none outline-none resize-none text-[16px] leading-normal text-white placeholder:text-white/50 overflow-y-auto max-h-[120px] pr-1 pt-1"
              rows={1}
            />
          </form>
          <div className={`flex items-center gap-2 flex-shrink-0  ${input.length > 60 || input.includes('\n') ? 'justify-end' : ''}`}>
            <VoiceInputButton isListening={isListening} onVoiceInput={onVoiceInput} />
            <button
              type="button"
              onClick={onSubmit}
              className="flex items-center justify-center flex-shrink-0 cursor-pointer bg-transparent border-none p-0"
            >
              <img src="/arrow_right.png" alt="Send" className="h-8 w-8 object-contain brightness-200 -translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarButton({
  chatHistoryOpen,
  setChatHistoryOpen,
  isLargeScreen
}: Readonly<{
  chatHistoryOpen: boolean;
  setChatHistoryOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  isLargeScreen: boolean;
}>) {
  const shouldHide = chatHistoryOpen && isLargeScreen;

  if (shouldHide) return null;

  return (
    <Button
      className="hover:bg-transparent focus:bg-transparent active:bg-transparent p-0 w-auto h-auto"
      variant="ghost"
      size="icon"
      onClick={() => setChatHistoryOpen((p) => !p)}
    >
      <img src="/Vector.png" alt="Sidebar" className="w-5 h-5" />
    </Button>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  entry: "События",
  goal: "Цели/Желания",
  experiment: "Эксперименты",
  analysis: "Анализ",
  general: "Чатики",
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
            chatHistoryOpen={chatHistoryOpen}
            setChatHistoryOpen={setChatHistoryOpen}
            isLargeScreen={isLargeScreen}
          />
        </div>
        <motion.button
          className="flex gap-2 items-center cursor-pointer"
          onClick={() => setThreadId(null)}
          animate={{
            marginLeft: chatHistoryOpen ? 0 : 48,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
        >

        </motion.button>
      </div>

      {threadId && currentTitle && (
        <div className="flex-1 flex justify-center items-center min-w-0">
          <div className="flex items-center gap-1.5">
            {categoryLabel && (
              <span className="text-white/70 text-sm border border-white/20 rounded-full px-3 py-1 flex-shrink-0">
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
                className="bg-transparent border-b border-white/40 text-white/90 text-base font-medium outline-none text-center w-48 sm:w-64"
              />
            ) : (
              <>
                <span className="text-white/90 text-base font-medium truncate max-w-[180px] sm:max-w-xs">
                  {currentTitle}
                </span>
                <button
                  onClick={startEdit}
                  className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0"
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

export function Thread() {
  const [threadId, setThreadId] = useQueryState("threadId");
  const [chatHistoryOpen, setChatHistoryOpen] = useQueryState(
    "chatHistoryOpen",
    parseAsBoolean.withDefault(false),
  );
  const [input, setInput] = useState("");
  const [firstTokenReceived, setFirstTokenReceived] = useState(false);
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [threadContext, setThreadContext] = useState<ThreadContext | null>(null);

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

  // Загружаем контекст треда (используется в ThreadMoreMenu)
  useEffect(() => {
    if (!threadId) {
      setThreadContext(null);
      return;
    }
    chatApi.getThreadContext(threadId)
      .then((data) => {
        if (data?.title) {
          setThreadContext({
            type: data.type ?? "general",
            title: data.title,
            description: data.description || undefined
          });
        } else {
          setThreadContext(null);
        }
      })
      .catch(() => setThreadContext(null));
  }, [threadId]);

  const {
    proposal: detectorProposal,
    isSaving: detectorSaving,
    confirm: confirmDetector,
    decline: declineDetector,
    dismissChip: dismissDetectorChip,
  } = useDetectorProposal();

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
    const hiddenPersona = buildHiddenPersonaMessage();
    const personaMessages = hiddenPersona ? [hiddenPersona] : [];

    const toolMessages = ensureToolCallsHaveResponses(stream.messages);
    stream.submit(
      { messages: [...toolMessages, ...personaMessages, newHumanMessage] },
      {
        streamMode: ["values"],
        optimisticValues: (prev) => ({
          ...prev,
          messages: [
            ...(prev.messages ?? []),
            ...toolMessages,
            ...personaMessages,
            newHumanMessage,
          ],
        }),
      },
    );

    setInput("");
  }, [input, isLoading, stream, dismissDetectorChip]);

  const handleRegenerate = useCallback((
    parentCheckpoint: Checkpoint | null | undefined,
  ) => {
    prevMessageLength.current = prevMessageLength.current - 1;
    setFirstTokenReceived(false);
    stream.submit(undefined, {
      checkpoint: parentCheckpoint,
      streamMode: ["values"],
    });
  }, [stream]);

  const chatStarted = !!messages.length;
  const hasNoAIOrToolMessages = !messages.some(
    (m) => m.type === "ai" || m.type === "tool",
  );

  // Подсказки — загружаем сразу и обновляем после каждого ответа AI
  const { hints, isLoading: hintsLoading } = useHints(messages, !isLoading);

  const handleHintSelect = useCallback((hint: string) => {
    setInput(hint);
    // Небольшая задержка, чтобы input успел обновиться в DOM
    setTimeout(() => {
      const newHumanMessage = {
        id: uuidv4(),
        type: "human" as const,
        content: hint,
      };
      const hiddenPersona = buildHiddenPersonaMessage();
      const personaMessages = hiddenPersona ? [hiddenPersona] : [];
      const toolMessages = ensureToolCallsHaveResponses(stream.messages);
      stream.submit(
        { messages: [...toolMessages, ...personaMessages, newHumanMessage] },
        {
          streamMode: ["values"],
          optimisticValues: (prev: any) => ({
            ...prev,
            messages: [
              ...(prev.messages ?? []),
              ...toolMessages,
              ...personaMessages,
              newHumanMessage,
            ],
          }),
        },
      );
      setInput("");
    }, 0);
  }, [stream, setInput]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length]);

  const sidebarWidth = 300;
  const sidebarOffset = chatHistoryOpen && isLargeScreen ? sidebarWidth : 0;
  const mainWidth = chatHistoryOpen && isLargeScreen ? `calc(100% - ${sidebarWidth}px)` : "100%";
  const footerMarginLeft = chatHistoryOpen && isLargeScreen ? 150 : 0;

  return (
    <div className="flex w-full h-full overflow-hidden">
      <div className="relative lg:flex hidden bg-[#000019]">
        <motion.div
          className="absolute h-full overflow-hidden z-40 bg-[#000019]"
          style={{ width: sidebarWidth }}
          animate={{ x: chatHistoryOpen ? 0 : -sidebarWidth }}
          initial={{ x: -sidebarWidth }}
          transition={
            isLargeScreen
              ? { type: "spring", stiffness: 300, damping: 30 }
              : { duration: 0 }
          }
        >
          <div className="relative h-full bg-[#000019]" style={{ width: sidebarWidth }}>
            <ThreadHistory />
          </div>
        </motion.div>
      </div>
      <motion.div
        className={cn(
          "flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#000019]",
          !chatStarted && "grid-rows-[1fr]",
        )}
        layout={isLargeScreen}
        animate={{
          marginLeft: sidebarOffset,
          width: mainWidth,
        }}
        transition={
          isLargeScreen
            ? { type: "spring", stiffness: 300, damping: 30 }
            : { duration: 0 }
        }
      >
        <motion.div
          className="fixed top-0 left-0 right-0 z-30 bg-[#000019]"
          animate={{ marginLeft: sidebarOffset }}
          transition={isLargeScreen ? { type: "spring", stiffness: 300, damping: 30 } : { duration: 0 }}
        >
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
        </motion.div>
        <div className="pt-[60px]" />

        <div className="relative flex-1 overflow-hidden">
          <ParticlesBackground variant="chat" />
          <div
            ref={scrollRef}
            className={cn(
              "absolute inset-0 overflow-y-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              !chatStarted && "flex flex-col justify-center items-center",
            )}
          >
            {chatStarted ? (
              <div className="pt-8 pb-[180px] px-4 max-w-full sm:max-w-3xl mx-auto flex flex-col gap-4 w-full">
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
              <div className="flex flex-col items-center gap-10 w-full px-4 -translate-y-[10vh]">
                <div className="relative flex items-center justify-center">
                  <h2 className="text-white/80 text-2xl sm:text-3xl font-medium text-center">
                    Как ты себя чувствуешь?
                  </h2>
                </div>
                <div className="flex flex-col items-center gap-3 w-full">
                  <div className="relative w-full max-w-3xl mx-auto">
                    <img
                      src="/penguin.png"
                      alt="Пингвин"
                      className="absolute bottom-full right-12 w-24 sm:w-28 object-contain pointer-events-none select-none z-10"
                    />
                  <ChatInput
                    input={input}
                    setInput={setInput}
                    onSubmit={handleSubmit}
                    isListening={isListening}
                    onVoiceInput={handleVoiceInput}
                    chatStarted={false}
                  />
                  </div>
                  <ChatHints
                    hints={hints}
                    isLoading={hintsLoading}
                    onSelect={handleHintSelect}
                  />
                </div>
              </div>
            )}
          </div>

          {chatStarted && (
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-2 sm:gap-4 bg-gradient-to-t from-[#000019] from-70% to-transparent pt-8 pb-0 w-full z-10">
              <div className="flex flex-col items-center gap-2 pb-6 sm:pb-0 sm:-mb-[40px] w-full sm:-translate-y-[60px]">
                <div className="w-full max-w-3xl px-4 mb-1">
                  <DetectorProposalChip
                    proposal={detectorProposal}
                    isSaving={detectorSaving}
                    onConfirm={() => void confirmDetector()}
                    onDecline={() => void declineDetector()}
                  />
                </div>
                {!isLoading && (
                  <>
                    <div className="w-full max-w-3xl px-4 flex justify-end mb-1 sm:mb-2">
                      <ScrollToBottom
                        scrollRef={scrollRef}
                        className="animate-in fade-in-0 zoom-in-95"
                      />
                    </div>
                  <ChatHints
                    hints={hints}
                    isLoading={hintsLoading}
                    onSelect={handleHintSelect}
                  />
                  </>
                )}
                <ChatInput
                  input={input}
                  setInput={setInput}
                  onSubmit={handleSubmit}
                  isListening={isListening}
                  onVoiceInput={handleVoiceInput}
                  chatStarted={true}
                />
              </div>
            </div>
          )}

          <motion.span
            className="fixed bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 text-white text-[10px] sm:text-xs opacity-70 z-20 text-center w-full px-4 sm:w-auto sm:px-0"
            animate={{
              marginLeft: footerMarginLeft,
            }}
            transition={
              isLargeScreen
                ? { type: "spring", stiffness: 300, damping: 30 }
                : { duration: 0 }
            }
          >
            Delёz может допускать ошибки. Обращайтесь к уму-разуму!
          </motion.span>
        </div>
      </motion.div>
    </div>
  );
}
