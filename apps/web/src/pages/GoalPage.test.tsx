import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GoalPage from './GoalPage';
import { goalsApi } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  goalsApi: {
    getById: vi.fn(),
    getRelatedEntries: vi.fn(),
    getConcepts: vi.fn(),
  },
}));

vi.mock('@/components/ui/loading-animation', () => ({
  default: ({ text }: { text: string }) => <div>{text}</div>,
}));

function renderPage(path = '/goals/g1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/goals/:id" element={<GoalPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GoalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    vi.mocked(goalsApi.getById).mockReturnValue(new Promise(() => {}));
    vi.mocked(goalsApi.getRelatedEntries).mockReturnValue(new Promise(() => {}));
    vi.mocked(goalsApi.getConcepts).mockReturnValue(new Promise(() => {}));

    renderPage();
    expect(screen.getByText('Загрузка...')).toBeInTheDocument();
  });

  it('shows error text when API fails', async () => {
    vi.mocked(goalsApi.getById).mockRejectedValue(new Error('fail'));
    vi.mocked(goalsApi.getRelatedEntries).mockResolvedValue([]);
    vi.mocked(goalsApi.getConcepts).mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Не удалось загрузить цель')).toBeInTheDocument();
    });
  });

  it('renders goal details and SMART sections', async () => {
    vi.mocked(goalsApi.getById).mockResolvedValue({
      id: 'g1',
      title: 'Выучить TS',
      description: 'S: Писать типы\nM: 20 задач',
      status: 'active',
      priority: 'high',
      target_date: '2026-03-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    });
    vi.mocked(goalsApi.getRelatedEntries).mockResolvedValue([{ id: 'e1', content: 'Сделал практику' }]);
    vi.mocked(goalsApi.getConcepts).mockResolvedValue([{ id: 'c1', name: 'Type System' }]);

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Выучить TS')[0]).toBeInTheDocument();
    });
    expect(screen.getByText('Писать типы')).toBeInTheDocument();
    expect(screen.getByText('20 задач')).toBeInTheDocument();
    expect(screen.getByText('Сделал практику')).toBeInTheDocument();
    expect(screen.getByText('Type System')).toBeInTheDocument();
  });
});

