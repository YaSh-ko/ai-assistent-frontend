import { fireEvent, render, screen } from '@testing-library/react';
import type { HTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ChatHints } from './chat-hints';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe('ChatHints', () => {
  it('renders skeleton while loading', () => {
    const onSelect = vi.fn();
    render(<ChatHints hints={[]} isLoading onSelect={onSelect} />);
    expect(document.querySelectorAll('.animate-pulse').length).toBe(3);
  });

  it('returns null when there are no hints', () => {
    const onSelect = vi.fn();
    const { container } = render(<ChatHints hints={[]} isLoading={false} onSelect={onSelect} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders hints and calls onSelect', () => {
    const onSelect = vi.fn();
    render(<ChatHints hints={['Первый', 'Второй']} isLoading={false} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Первый' }));
    expect(onSelect).toHaveBeenCalledWith('Первый');
    expect(screen.getByRole('button', { name: 'Второй' })).toBeInTheDocument();
  });
});

