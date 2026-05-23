import { fireEvent, render, screen } from '@testing-library/react';
import type { HTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ContextBanner } from './context-banner';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe('ContextBanner', () => {
  it('does not render when context is missing', () => {
    const { container } = render(<ContextBanner context={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders title and description', () => {
    render(
      <ContextBanner
        context={{ type: 'meeting', title: 'Планирование', description: 'Обсуждение целей' }}
      />,
    );

    expect(screen.getByText('Планирование')).toBeInTheDocument();
    expect(screen.getByText('Обсуждение целей')).toBeInTheDocument();
  });

  it('calls onDismiss when close button clicked', () => {
    const onDismiss = vi.fn();
    render(
      <ContextBanner
        context={{ type: 'event', title: 'Событие' }}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByTitle('Скрыть контекст'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

