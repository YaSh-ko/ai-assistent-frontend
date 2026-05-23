import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import { NotFoundPage } from './NotFound';

vi.mock('@/components/ParticlesBackground', () => ({ default: () => null }));
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 404 title', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders error description', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByText(/Страница, которую вы ищете/i)).toBeInTheDocument();
  });

  it('renders navigation buttons', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByText(/На главную/i)).toBeInTheDocument();
    expect(screen.getByText(/Чат/i)).toBeInTheDocument();
  });

  it('navigates to / when "На главную" clicked', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    fireEvent.click(screen.getByText(/На главную/i).closest('button')!);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('navigates to /chat when "Чат" clicked', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    fireEvent.click(screen.getByText(/Чат/i).closest('button')!);
    expect(mockNavigate).toHaveBeenCalledWith('/chat');
  });
});
