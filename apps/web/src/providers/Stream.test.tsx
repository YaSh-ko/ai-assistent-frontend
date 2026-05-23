import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StreamProvider, useStreamContext } from './Stream';

const useStreamMock = vi.fn();
const toastErrorMock = vi.fn();
const getApiKeyMock = vi.fn();
const getThreadsMock = vi.fn();
const setThreadsMock = vi.fn();
const setThreadIdMock = vi.fn();
const setApiUrlMock = vi.fn();
const setAssistantIdMock = vi.fn();

let queryStateValues: Record<string, unknown>;

vi.mock('@langchain/langgraph-sdk/react', () => ({
  useStream: (...args: unknown[]) => useStreamMock(...args),
}));

vi.mock('@langchain/langgraph-sdk/react-ui', () => ({
  uiMessageReducer: vi.fn((current: unknown[], event: unknown) => [...current, event]),
}));

vi.mock('nuqs', () => ({
  useQueryState: vi.fn((key: string, options?: { defaultValue?: unknown }) => {
    const value = key in queryStateValues ? queryStateValues[key] : options?.defaultValue ?? null;
    if (key === 'threadId') return [value, setThreadIdMock];
    if (key === 'apiUrl') return [value, setApiUrlMock];
    if (key === 'assistantId') return [value, setAssistantIdMock];
    return [value, vi.fn()];
  }),
}));

vi.mock('./Thread', () => ({
  useThreads: () => ({
    getThreads: getThreadsMock,
    setThreads: setThreadsMock,
    favoriteIds: [],
    toggleFavorite: vi.fn(),
    updateThreadCategory: vi.fn(),
  }),
}));

vi.mock('@/lib/api-key', () => ({
  getApiKey: () => getApiKeyMock(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

vi.mock('@/components/icons/langgraph', () => ({
  LangGraphLogoSVG: (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />,
}));

const Consumer = () => {
  const stream = useStreamContext();
  return <div data-testid="stream-value">{String(stream.isLoading)}</div>;
};

describe('StreamProvider', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    queryStateValues = {
      apiUrl: 'http://localhost:8123',
      assistantId: 'assistant-1',
      threadId: 'thread-1',
    };
    getApiKeyMock.mockReturnValue('stored-key');
    getThreadsMock.mockResolvedValue([{ thread_id: 'thread-2' }]);
    useStreamMock.mockReturnValue({
      isLoading: false,
      messages: [],
      values: {},
      submit: vi.fn(),
      setBranch: vi.fn(),
      getMessagesMetadata: vi.fn(),
      interrupt: undefined,
    });
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  it('renders children and wires stream with query params and api key', async () => {
    render(
      <StreamProvider>
        <Consumer />
      </StreamProvider>
    );

    expect(screen.getByTestId('stream-value')).toHaveTextContent('false');
    expect(useStreamMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiUrl: 'http://localhost:8123',
        apiKey: 'stored-key',
        assistantId: 'assistant-1',
        threadId: 'thread-1',
        onCustomEvent: expect.any(Function),
        onThreadId: expect.any(Function),
      })
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8123/info',
        expect.objectContaining({
          headers: { 'X-Api-Key': 'stored-key' },
        })
      );
    });
  });

  it('shows configuration form when required values are missing and saves submitted values', () => {
    queryStateValues = { apiUrl: '', assistantId: '', threadId: null };

    render(
      <StreamProvider>
        <div>child</div>
      </StreamProvider>
    );

    fireEvent.change(screen.getByLabelText(/URL развертывания/i), {
      target: { value: 'https://graph.example.com' },
    });
    fireEvent.change(screen.getByLabelText(/ID ассистента \/ графа/i), {
      target: { value: 'assistant-42' },
    });
    fireEvent.change(screen.getByLabelText(/API-ключ LangSmith/i), {
      target: { value: 'secret-key' },
    });

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    fireEvent.submit(screen.getByRole('button', { name: /Продолжить/i }).closest('form')!);

    expect(setApiUrlMock).toHaveBeenCalledWith('https://graph.example.com');
    expect(setAssistantIdMock).toHaveBeenCalledWith('assistant-42');
    expect(setItemSpy).toHaveBeenCalledWith('lg:chat:apiKey', 'secret-key');
  });

  it('shows toast when graph status check fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as Response);

    render(
      <StreamProvider>
        <Consumer />
      </StreamProvider>
    );

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Не удалось подключиться к серверу графа',
        expect.objectContaining({
          description: expect.stringContaining('http://localhost:8123'),
        })
      );
    });
  });

  it('refreshes threads after a new thread id is reported', async () => {
    vi.useFakeTimers();

    render(
      <StreamProvider>
        <Consumer />
      </StreamProvider>
    );

    const streamArgs = useStreamMock.mock.calls[0][0];
    streamArgs.onThreadId('thread-99');

    expect(setThreadIdMock).toHaveBeenCalledWith('thread-99');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(getThreadsMock).toHaveBeenCalled();
    await Promise.resolve();
    expect(setThreadsMock).toHaveBeenCalledWith([{ thread_id: 'thread-2' }]);
  });
});

describe('useStreamContext', () => {
  it('throws when used outside StreamProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ThrowingComponent = () => {
      useStreamContext();
      return null;
    };

    expect(() => render(<ThrowingComponent />)).toThrow(
      'useStreamContext должен использоваться внутри StreamProvider'
    );

    consoleSpy.mockRestore();
  });
});
