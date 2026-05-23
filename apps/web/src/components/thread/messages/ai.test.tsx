import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssistantMessage, AssistantMessageLoading } from './ai';

const useQueryStateMock = vi.fn();
const setBranchMock = vi.fn();
const handleRegenerateMock = vi.fn();
let streamContextValue: any;

vi.mock('nuqs', () => ({
  parseAsBoolean: {
    withDefault: () => ({}),
  },
  useQueryState: (...args: unknown[]) => useQueryStateMock(...args),
}));

vi.mock('@/providers/Stream', () => ({
  useStreamContext: () => streamContextValue,
}));

vi.mock('../markdown-text', () => ({
  MarkdownText: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('./shared', () => ({
  BranchSwitcher: ({ onSelect }: { onSelect: (branch: string) => void }) => (
    <button onClick={() => onSelect('branch-b')}>switch branch</button>
  ),
  CommandBar: ({ handleRegenerate }: { handleRegenerate?: () => void }) => (
    <button onClick={handleRegenerate}>regenerate</button>
  ),
}));

vi.mock('./tool-calls', () => ({
  ToolCalls: ({ toolCalls }: { toolCalls: Array<{ name: string }> }) => (
    <div data-testid="tool-calls">{toolCalls.map((tool) => tool.name).join(',')}</div>
  ),
  ToolResult: ({ message }: { message: { content: string } }) => (
    <div data-testid="tool-result">{message.content}</div>
  ),
}));

vi.mock('@langchain/langgraph-sdk/react-ui', () => ({
  LoadExternalComponent: ({ message }: { message: { id: string } }) => (
    <div data-testid="custom-component">{message.id}</div>
  ),
}));

vi.mock('../agent-inbox', () => ({
  ThreadView: ({ interrupt }: { interrupt: { description?: string } }) => (
    <div data-testid="thread-view">{interrupt.description ?? 'thread-view'}</div>
  ),
}));

vi.mock('./generic-interrupt', () => ({
  GenericInterruptView: ({ interrupt }: { interrupt: { reason?: string } }) => (
    <div data-testid="generic-interrupt">{interrupt.reason ?? 'generic'}</div>
  ),
}));

describe('AssistantMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQueryStateMock.mockReturnValue([false, vi.fn()]);
    streamContextValue = {
      values: {
        ui: [{ id: 'ui-1', metadata: { message_id: 'm-1' } }],
      },
      messages: [{ id: 'm-1', type: 'ai', content: 'Hello' }],
      getMessagesMetadata: vi.fn(() => ({
        branch: 'branch-a',
        branchOptions: ['branch-a', 'branch-b'],
        firstSeenState: {
          parent_checkpoint: { checkpoint_id: 'cp-1' },
        },
      })),
      setBranch: setBranchMock,
      interrupt: undefined,
    };
  });

  it('renders markdown content, tool calls, custom UI and regenerate action', () => {
    render(
      <AssistantMessage
        message={{
          id: 'm-1',
          type: 'ai',
          content: 'Hello from AI',
          tool_calls: [{ id: 'call-1', name: 'search_docs', args: { q: 'a' } }],
        } as any}
        isLoading={false}
        handleRegenerate={handleRegenerateMock}
      />
    );

    expect(screen.getByText('Hello from AI')).toBeInTheDocument();
    expect(screen.getByTestId('tool-calls')).toHaveTextContent('search_docs');
    expect(screen.getByTestId('custom-component')).toHaveTextContent('ui-1');

    screen.getByText('switch branch').click();
    expect(setBranchMock).toHaveBeenCalledWith('branch-b');

    screen.getByText('regenerate').click();
    expect(handleRegenerateMock).toHaveBeenCalledWith({ checkpoint_id: 'cp-1' });
  });

  it('returns null for tool results when tool calls are hidden', () => {
    useQueryStateMock.mockReturnValue([true, vi.fn()]);

    const { container } = render(
      <AssistantMessage
        message={{ id: 'tool-1', type: 'tool', content: 'result' } as any}
        isLoading={false}
        handleRegenerate={handleRegenerateMock}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders tool result messages when visible', () => {
    render(
      <AssistantMessage
        message={{ id: 'tool-1', type: 'tool', content: 'result' } as any}
        isLoading={false}
        handleRegenerate={handleRegenerateMock}
      />
    );

    expect(screen.getByTestId('tool-result')).toHaveTextContent('result');
  });

  it('renders thread view for agent inbox interrupts on the last message', () => {
    streamContextValue.interrupt = {
      value: {
        description: 'needs action',
        action_request: {},
        config: {
          allow_respond: true,
          allow_accept: true,
          allow_edit: false,
          allow_ignore: true,
        },
      },
    };

    render(
      <AssistantMessage
        message={{ id: 'm-1', type: 'ai', content: 'Hello' } as any}
        isLoading={false}
        handleRegenerate={handleRegenerateMock}
      />
    );

    expect(screen.getByTestId('thread-view')).toHaveTextContent('needs action');
  });

  it('renders generic interrupt view for non-agent interrupts', () => {
    streamContextValue.interrupt = {
      value: {
        reason: 'plain interrupt',
      },
    };

    render(
      <AssistantMessage
        message={{ id: 'm-1', type: 'ai', content: 'Hello' } as any}
        isLoading={false}
        handleRegenerate={handleRegenerateMock}
      />
    );

    expect(screen.getByTestId('generic-interrupt')).toHaveTextContent('plain interrupt');
  });
});

describe('AssistantMessageLoading', () => {
  it('renders animated loading dot', () => {
    const { container } = render(<AssistantMessageLoading />);
    expect(container.querySelector('.animate-\\[pulse_1\\.5s_ease-in-out_infinite\\]')).toBeTruthy();
  });
});
