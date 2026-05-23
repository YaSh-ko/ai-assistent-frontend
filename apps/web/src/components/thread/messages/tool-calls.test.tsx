import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToolCalls, ToolResult } from './tool-calls';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
      <div {...props}>{children}</div>
    ),
    button: ({
      children,
      initial: _initial,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>) => (
      <button {...props}>{children}</button>
    ),
  },
}));

describe('ToolCalls', () => {
  it('returns nothing when tool calls are empty', () => {
    const { container } = render(<ToolCalls toolCalls={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders headers, ids and arguments', () => {
    render(
      <ToolCalls
        toolCalls={[
          {
            id: 'call-1',
            name: 'search_docs',
            type: 'tool_call',
            args: { query: 'react', limit: 3, filters: { scope: 'web' } },
          },
          {
            id: 'call-2',
            name: 'empty_tool',
            type: 'tool_call',
            args: {},
          },
        ]}
      />
    );

    expect(screen.getByText('search_docs')).toBeInTheDocument();
    expect(screen.getByText('call-1')).toBeInTheDocument();
    expect(screen.getByText('query')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('filters')).toBeInTheDocument();
    expect(screen.getByText('{}')).toBeInTheDocument();
  });
});

describe('ToolResult', () => {
  it('renders long plain-text content collapsed and expands on click', () => {
    const longText = `${'line\n'.repeat(5)}${'x'.repeat(520)}`;
    render(
      <ToolResult
        message={{
          type: 'tool',
          id: 'msg-1',
          name: 'fetch_data',
          tool_call_id: 'tool-123',
          content: longText,
        } as any}
      />
    );

    expect(screen.getByText('Tool Result:')).toBeInTheDocument();
    expect(screen.getByText('fetch_data')).toBeInTheDocument();
    expect(screen.getByText('tool-123')).toBeInTheDocument();
    expect(screen.getByText(/\.{3}$/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));

    expect(
      screen.getByText((_, element) => element?.tagName === 'CODE' && element.textContent === longText)
    ).toBeInTheDocument();
  });

  it('renders json arrays collapsed to five rows and expands to show all items', () => {
    render(
      <ToolResult
        message={{
          type: 'tool',
          id: 'msg-2',
          content: JSON.stringify([{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }, { n: 5 }, { n: 6 }]),
        } as any}
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.queryByText('5')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
