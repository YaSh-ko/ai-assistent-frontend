import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ReportPage from './ReportPage';
import { entriesApi, goalsApi, graphApi } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  entriesApi: { getAll: vi.fn() },
  goalsApi: { getAll: vi.fn() },
  graphApi: { getRhizome: vi.fn() },
}));

vi.mock('@/components/ui/loading-animation', () => ({
  default: ({ text }: { text: string }) => <div>{text}</div>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('ReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loader initially', () => {
    vi.mocked(entriesApi.getAll).mockReturnValue(new Promise(() => {}));
    vi.mocked(goalsApi.getAll).mockReturnValue(new Promise(() => {}));
    vi.mocked(graphApi.getRhizome).mockReturnValue(new Promise(() => {}));

    render(<MemoryRouter><ReportPage /></MemoryRouter>);
    expect(screen.getByText('Загрузка отчёта...')).toBeInTheDocument();
  });

  it('renders aggregated metrics', async () => {
    vi.mocked(entriesApi.getAll).mockResolvedValue({
      entries: [{ event_date: '2026-01-01T00:00:00Z' }, { event_date: '2026-02-01T00:00:00Z' }],
    });
    vi.mocked(goalsApi.getAll).mockResolvedValue({
      goals: [
        { status: 'completed' },
        { status: 'active' },
        { status: 'paused' },
      ],
    });
    vi.mocked(graphApi.getRhizome).mockResolvedValue({
      nodes: [{ type: 'Entry' }, { type: 'Goal' }, { type: 'Goal' }],
    });

    render(<MemoryRouter><ReportPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Отчёт')).toBeInTheDocument();
    });

    expect(screen.getByText('Всего событий')).toBeInTheDocument();
    expect(screen.getByText(/Распределение/)).toBeInTheDocument();
    expect(screen.getByText(/по типам узлов/)).toBeInTheDocument();
    expect(screen.getByText('Выполнено')).toBeInTheDocument();
  });

  it('navigates to graph on button click', async () => {
    vi.mocked(entriesApi.getAll).mockResolvedValue({ entries: [] });
    vi.mocked(goalsApi.getAll).mockResolvedValue({ goals: [] });
    vi.mocked(graphApi.getRhizome).mockResolvedValue({ nodes: [] });

    render(<MemoryRouter><ReportPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Отчёт')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '← Граф' }));
    expect(mockNavigate).toHaveBeenCalledWith('/graph');
  });
});

