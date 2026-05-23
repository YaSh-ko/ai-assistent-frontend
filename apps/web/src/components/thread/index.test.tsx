import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Thread } from "./index";

const submitMock = vi.fn();
const setBranchMock = vi.fn();
const toastErrorMock = vi.fn();
const ensureToolCallsHaveResponsesMock = vi.fn();
const startListeningMock = vi.fn();
const stopListeningMock = vi.fn();
const resetTranscriptMock = vi.fn();
const setThreadIdMock = vi.fn();
const setChatHistoryOpenMock = vi.fn();

let threadIdState: string | null;
let chatHistoryOpenState: boolean;
let mediaQueryValue: boolean;
let speechState: {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
};
let streamState: any;

vi.mock("uuid", () => ({
  v4: () => "uuid-123",
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("nuqs", () => ({
  useQueryState: vi.fn((key: string, options?: { defaultValue?: unknown }) => {
    if (key === "threadId") {
      return [threadIdState, setThreadIdMock];
    }
    if (key === "chatHistoryOpen") {
      return [chatHistoryOpenState, setChatHistoryOpenMock];
    }
    return [options?.defaultValue ?? null, vi.fn()];
  }),
  parseAsBoolean: { withDefault: (value: boolean) => ({ defaultValue: value }) },
}));

vi.mock("@/providers/Stream", () => ({
  useStreamContext: () => streamState,
}));

vi.mock("@/hooks/useMediaQuery", () => ({
  useMediaQuery: () => mediaQueryValue,
}));

vi.mock("@/hooks/useSpeechRecognition", () => ({
  useSpeechRecognition: () => ({
    ...speechState,
    startListening: startListeningMock,
    stopListening: stopListeningMock,
    resetTranscript: resetTranscriptMock,
  }),
}));

vi.mock("@/lib/ensure-tool-responses", () => ({
  DO_NOT_RENDER_ID_PREFIX: "do-not-render-",
  ensureToolCallsHaveResponses: (...args: unknown[]) =>
    ensureToolCallsHaveResponsesMock(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

vi.mock("./messages/ai", () => ({
  AssistantMessage: ({
    message,
    handleRegenerate,
  }: {
    message?: { id?: string };
    handleRegenerate: (checkpoint: unknown) => void;
  }) => (
    <div>
      <span>assistant-{message?.id ?? "interrupt"}</span>
      <button onClick={() => handleRegenerate({ checkpoint_id: "cp-1" })}>
        regenerate
      </button>
    </div>
  ),
  AssistantMessageLoading: () => <div>loading-indicator</div>,
}));

vi.mock("./messages/human", () => ({
  HumanMessage: ({ message }: { message: { id?: string } }) => (
    <div>human-{message.id}</div>
  ),
}));

vi.mock("./thread-more-menu", () => ({
  ThreadMoreMenu: () => (
    <button type="button" aria-label="Меню чата">
      menu
    </button>
  ),
}));

vi.mock("@/providers/Thread", () => ({
  useThreads: () => ({
    getThreads: vi.fn().mockResolvedValue([]),
    setThreads: vi.fn(),
    threads: [],
    threadsLoading: false,
    setThreadsLoading: vi.fn(),
    favoriteIds: [],
    toggleFavorite: vi.fn(),
    updateThreadCategory: vi.fn(),
  }),
}));

vi.mock("@/lib/api-client", () => ({
  chatApi: {
    getThreadContext: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("./history", () => ({
  default: () => <div>thread-history</div>,
}));

vi.mock("@/components/ParticlesBackground", () => ({
  default: () => <div data-testid="particles" />,
}));

vi.mock("@/hooks/useHints", () => ({
  useHints: () => ({ hints: [], isLoading: false, refresh: vi.fn() }),
}));

vi.mock("./chat-hints", () => ({
  ChatHints: () => null,
}));

describe("Thread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom doesn't implement scrollTo on elements
    window.HTMLDivElement.prototype.scrollTo = vi.fn();

    threadIdState = null;
    chatHistoryOpenState = false;
    mediaQueryValue = true;
    speechState = {
      isListening: false,
      transcript: "",
      isSupported: true,
    };
    streamState = {
      messages: [],
      isLoading: false,
      error: undefined,
      interrupt: undefined,
      submit: submitMock,
      setBranch: setBranchMock,
      getMessagesMetadata: vi.fn(),
    };
    ensureToolCallsHaveResponsesMock.mockReturnValue([
      {
        id: "tool-generated",
        type: "tool",
        content: "handled",
      },
    ]);
  });

  it("submits a new human message with generated tool responses", async () => {
    render(<Thread />);

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Hello thread" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(submitMock).toHaveBeenCalledWith(
        {
          messages: [
            { id: "tool-generated", type: "tool", content: "handled" },
            { id: "uuid-123", type: "human", content: "Hello thread" },
          ],
        },
        expect.objectContaining({
          streamMode: ["values"],
          optimisticValues: expect.any(Function),
        }),
      );
    });

    expect(ensureToolCallsHaveResponsesMock).toHaveBeenCalledWith([]);

    const optimisticValues = submitMock.mock.calls[0][1].optimisticValues;
    expect(optimisticValues({ messages: [{ id: "prev", type: "ai", content: "old" }] })).toEqual({
      messages: [
        { id: "prev", type: "ai", content: "old" },
        { id: "tool-generated", type: "tool", content: "handled" },
        { id: "uuid-123", type: "human", content: "Hello thread" },
      ],
    });
  });

  it("appends transcript to the input and resets it", async () => {
    const { rerender } = render(<Thread />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Manual" } });

    speechState = {
      ...speechState,
      transcript: "voice text",
    };
    rerender(<Thread />);

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toHaveValue("Manual voice text");
    });
    expect(resetTranscriptMock).toHaveBeenCalled();
  });

  it("shows unsupported voice input error", () => {
    speechState = {
      ...speechState,
      isSupported: false,
    };

    render(<Thread />);
    fireEvent.click(screen.getByAltText("Voice Input").closest("button")!);

    expect(toastErrorMock).toHaveBeenCalled();
    expect(startListeningMock).not.toHaveBeenCalled();
  });

  it("toggles voice recording when speech recognition is supported", () => {
    const { rerender } = render(<Thread />);
    fireEvent.click(screen.getByAltText("Voice Input").closest("button")!);
    expect(startListeningMock).toHaveBeenCalled();

    speechState = {
      ...speechState,
      isListening: true,
    };
    rerender(<Thread />);
    fireEvent.click(screen.getByAltText("Voice Input").closest("button")!);
    expect(stopListeningMock).toHaveBeenCalled();
  });

  it("shows stream error only once per identical message", async () => {
    const error = { message: "network failed" };
    const { rerender } = render(<Thread />);

    streamState = {
      ...streamState,
      error,
    };
    rerender(<Thread />);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledTimes(1);
    });

    rerender(<Thread />);
    expect(toastErrorMock).toHaveBeenCalledTimes(1);

    streamState = {
      ...streamState,
      error: { message: "different failure" },
    };
    rerender(<Thread />);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledTimes(2);
    });
  });

  it("renders started chat state and regenerates from assistant action", async () => {
    threadIdState = "thread-1";
    streamState = {
      ...streamState,
      messages: [
        { id: "h-1", type: "human", content: "Hi" },
        { id: "a-1", type: "ai", content: "Hello" },
      ],
      interrupt: { value: { type: "interrupt" } },
    };

    render(<Thread />);

    expect(screen.getByText("human-h-1")).toBeInTheDocument();
    expect(screen.getByText("assistant-a-1")).toBeInTheDocument();

    fireEvent.click(screen.getByText("regenerate"));

    await waitFor(() => {
      expect(submitMock).toHaveBeenCalledWith(undefined, {
        checkpoint: { checkpoint_id: "cp-1" },
        streamMode: ["values"],
      });
    });
  });

});
