import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GoalsPage from './GoalsPage';
import { goalsApi } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  goalsApi: {
    getAll: vi.fn(),
  },
}));

vi.mock('@/components/ui/loading-animation', () => ({
  default: ({ text }: { text: string }) => <div>{text}</div>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('GoalsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state', async () => {
    vi.mocked(goalsApi.getAll).mockResolvedValue({ goals: [] });
    render(<MemoryRouter><GoalsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Целей пока нет')).toBeInTheDocument();
    });
  });

  it('renders error state', async () => {
    vi.mocked(goalsApi.getAll).mockRejectedValue(new Error('fail'));
    render(<MemoryRouter><GoalsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Не удалось загрузить цели')).toBeInTheDocument();
    });
  });

  it('renders goal cards and handles graph button', async () => {
    vi.mocked(goalsApi.getAll).mockResolvedValue({
      goals: [
        { id: 'g1', title: 'Цель 1', description: 'Описание', status: 'completed', created_at: '2026-01-01T00:00:00Z' },
      ],
    });
    render(<MemoryRouter><GoalsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Цель 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Граф'));
    expect(mockNavigate).toHaveBeenCalledWith('/graph');
  });
});

