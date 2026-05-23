import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GenericInterruptView } from './generic-interrupt';

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

describe('GenericInterruptView', () => {
  it('renders object entries and truncates long complex values while collapsed', () => {
    render(
      <GenericInterruptView
        interrupt={{
          title: 'Need approval',
          details: {
            text: 'x'.repeat(160),
            nested: { a: 1, b: 2 },
          },
        }}
      />
    );

    expect(screen.getByText('Human Interrupt')).toBeInTheDocument();
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByText('Need approval')).toBeInTheDocument();
    expect(screen.getByText(/Truncated \d+ characters/)).toBeInTheDocument();
  });

  it('shows only first five array items until expanded', () => {
    render(
      <GenericInterruptView
        interrupt={[
          { id: 1 },
          { id: 2 },
          { id: 3 },
          { id: 4 },
          { id: 5 },
          { id: 6 },
        ]}
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.queryByText('5')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/"id": 6/)).toBeInTheDocument();
  });
});
