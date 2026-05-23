import { render, screen, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ThreadProvider, useThreads } from './Thread';

vi.mock('@/lib/api-client', () => ({
  chatApi: {
    getConversations: vi.fn().mockResolvedValue({
      conversations: [
        { id: 'conv-1', thread_id: 'thread-1', title: 'Thread 1', created_at: '2024-01-01T00:00:00Z', last_active_at: '2024-01-01T00:00:00Z' },
        { id: 'conv-2', thread_id: 'thread-2', title: 'Thread 2', created_at: '2024-01-02T00:00:00Z', last_active_at: '2024-01-02T00:00:00Z' },
      ],
    }),
  },
}));

const TestConsumer = () => {
  const { threads, threadsLoading, getThreads, setThreads, setThreadsLoading } = useThreads();
  return (
    <div>
      <span data-testid="thread-count">{threads.length}</span>
      <span data-testid="loading">{String(threadsLoading)}</span>
      <button onClick={() => getThreads().then(setThreads)}>fetch</button>
      <button onClick={() => setThreadsLoading(true)}>set-loading</button>
    </div>
  );
};

describe('ThreadProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides initial empty threads and loading=false', () => {
    render(
      <ThreadProvider>
        <TestConsumer />
      </ThreadProvider>
    );
    expect(screen.getByTestId('thread-count').textContent).toBe('0');
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  it('fetches threads when getThreads is called', async () => {
    render(
      <ThreadProvider>
        <TestConsumer />
      </ThreadProvider>
    );

    await act(async () => {
      screen.getByText('fetch').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('thread-count').textContent).toBe('2');
    });
  });

  it('allows setThreadsLoading to update loading state', async () => {
    render(
      <ThreadProvider>
        <TestConsumer />
      </ThreadProvider>
    );

    await act(async () => {
      screen.getByText('set-loading').click();
    });

    expect(screen.getByTestId('loading').textContent).toBe('true');
  });
});

describe('useThreads outside provider', () => {
  it('throws when used outside ThreadProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ThrowingComponent = () => {
      useThreads();
      return null;
    };
    expect(() =>
      render(<ThrowingComponent />)
    ).toThrow('useThreads must be used within a ThreadProvider');
    consoleSpy.mockRestore();
  });
});
