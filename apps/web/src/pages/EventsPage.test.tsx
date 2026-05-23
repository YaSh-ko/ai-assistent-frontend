import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import EventsPage from './EventsPage';
import { entriesApi } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  entriesApi: {
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

describe('EventsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state', async () => {
    vi.mocked(entriesApi.getAll).mockResolvedValue({ entries: [] });
    render(<MemoryRouter><EventsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Событий пока нет')).toBeInTheDocument();
    });
  });

  it('renders error state', async () => {
    vi.mocked(entriesApi.getAll).mockRejectedValue(new Error('fail'));
    render(<MemoryRouter><EventsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Не удалось загрузить события')).toBeInTheDocument();
    });
  });

  it('renders event card and handles graph navigation', async () => {
    vi.mocked(entriesApi.getAll).mockResolvedValue({
      entries: [
        {
          id: 'e1',
          title: 'Событие 1',
          description: 'Описание события',
          event_date: '2026-01-01T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    });
    render(<MemoryRouter><EventsPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Событие 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Граф'));
    expect(mockNavigate).toHaveBeenCalledWith('/graph');
  });
});

