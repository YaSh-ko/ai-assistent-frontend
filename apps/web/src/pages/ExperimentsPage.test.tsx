import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ExperimentsPage from './ExperimentsPage';
import { graphApi } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  graphApi: { getRhizome: vi.fn() },
  getAuthToken: vi.fn(() => null),
  clearAuthToken: vi.fn(),
  apiRequest: vi.fn(),
  default: {},
}));

vi.mock('@/components/ui/loading-animation', () => ({
  default: ({ text }: { text: string }) => <div>{text}</div>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const baseExp = {
  id: '1',
  title: 'Тест эксперимент',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
};

describe('ExperimentsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('показывает загрузку', () => {
    vi.mocked(graphApi.getRhizome).mockReturnValue(new Promise(() => {}));
    render(<MemoryRouter><ExperimentsPage /></MemoryRouter>);
    expect(screen.getByText('Загрузка экспериментов...')).toBeInTheDocument();
  });

  it('показывает ошибку при сбое API', async () => {
    vi.mocked(graphApi.getRhizome).mockRejectedValue(new Error('fail'));
    render(<MemoryRouter><ExperimentsPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Не удалось загрузить эксперименты')).toBeInTheDocument();
    });
    expect(screen.getByText('Повторить')).toBeInTheDocument();
  });

  it('показывает пустой список когда нет экспериментов', async () => {
    vi.mocked(graphApi.getRhizome).mockResolvedValue({ nodes: [] });
    render(<MemoryRouter><ExperimentsPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Пока нет ветвлений')).toBeInTheDocument();
    });
    expect(screen.getByText('Создать первое ветвление →')).toBeInTheDocument();
  });

  it('рендерит карточку эксперимента с базовыми данными', async () => {
    vi.mocked(graphApi.getRhizome).mockResolvedValue({ nodes: [baseExp] });
    render(<MemoryRouter><ExperimentsPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Тест эксперимент')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Активный').length).toBeGreaterThan(0);
  });

  it('рендерит карточку с описанием и результатом', async () => {
    const exp = { ...baseExp, description: 'Описание теста', outcome: 'Хороший результат' };
    vi.mocked(graphApi.getRhizome).mockResolvedValue({ nodes: [exp] });
    render(<MemoryRouter><ExperimentsPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Описание теста')).toBeInTheDocument();
      expect(screen.getByText('Хороший результат')).toBeInTheDocument();
    });
  });

  it('показывает "Описание отсутствует" когда description null', async () => {
    const exp = { ...baseExp, description: null };
    vi.mocked(graphApi.getRhizome).mockResolvedValue({ nodes: [exp] });
    render(<MemoryRouter><ExperimentsPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Описание отсутствует')).toBeInTheDocument();
    });
  });

  it('рендерит прогресс-бар успешности (зелёный >= 70)', async () => {
    const exp = { ...baseExp, success: 80 };
    vi.mocked(graphApi.getRhizome).mockResolvedValue({ nodes: [exp] });
    render(<MemoryRouter><ExperimentsPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('80%')).toBeInTheDocument();
    });
  });

  it('рендерит прогресс-бар успешности (жёлтый >= 40)', async () => {
    const exp = { ...baseExp, success: 50 };
    vi.mocked(graphApi.getRhizome).mockResolvedValue({ nodes: [exp] });
    render(<MemoryRouter><ExperimentsPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  it('рендерит прогресс-бар успешности (красный < 40)', async () => {
    const exp = { ...baseExp, success: 20 };
    vi.mocked(graphApi.getRhizome).mockResolvedValue({ nodes: [exp] });
    render(<MemoryRouter><ExperimentsPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('20%')).toBeInTheDocument();
    });
  });

  it('использует started_at для даты если есть', async () => {
    const exp = { ...baseExp, started_at: '2024-03-15T00:00:00Z' };
    vi.mocked(graphApi.getRhizome).mockResolvedValue({ nodes: [exp] });
    render(<MemoryRouter><ExperimentsPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Тест эксперимент')).toBeInTheDocument();
    });
  });

  it('показывает ended_at если есть', async () => {
    const exp = { ...baseExp, ended_at: '2024-06-01T00:00:00Z' };
    vi.mocked(graphApi.getRhizome).mockResolvedValue({ nodes: [exp] });
    render(<MemoryRouter><ExperimentsPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText(/→/)).toBeInTheDocument();
    });
  });

  it('фильтрует по статусу active', async () => {
    const exps = [
      { ...baseExp, id: '1', status: 'active', title: 'Активный эксперимент' },
      { ...baseExp, id: '2', status: 'completed', title: 'Завершённый эксперимент' },
    ];
    vi.mocked(graphApi.getRhizome).mockResolvedValue({ nodes: exps });
    render(<MemoryRouter><ExperimentsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Активный эксперимент')).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Активные/));
    expect(screen.getByText('Активный эксперимент')).toBeInTheDocument();
    expect(screen.queryByText('Завершённый эксперимент')).not.toBeInTheDocument();
  });

  it('показывает "Нет экспериментов в этой категории" при пустом фильтре', async () => {
    const exp = { ...baseExp, status: 'active', title: 'Активный эксперимент' };
    vi.mocked(graphApi.getRhizome).mockResolvedValue({ nodes: [exp] });
    render(<MemoryRouter><ExperimentsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Активный эксперимент')).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Завершённые/));
    expect(screen.getByText('Нет ветвлений в этой категории')).toBeInTheDocument();
  });

  it('рендерит статус completed', async () => {
    const exp = { ...baseExp, status: 'completed' };
    vi.mocked(graphApi.getRhizome).mockResolvedValue({ nodes: [exp] });
    render(<MemoryRouter><ExperimentsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Завершён')).toBeInTheDocument());
  });

  it('рендерит статус paused', async () => {
    const exp = { ...baseExp, status: 'paused' };
    vi.mocked(graphApi.getRhizome).mockResolvedValue({ nodes: [exp] });
    render(<MemoryRouter><ExperimentsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText('На паузе').length).toBeGreaterThan(0));
  });

  it('рендерит неизвестный статус с fallback цветом', async () => {
    const exp = { ...baseExp, status: 'unknown_status' };
    vi.mocked(graphApi.getRhizome).mockResolvedValue({ nodes: [exp] });
    render(<MemoryRouter><ExperimentsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('unknown_status')).toBeInTheDocument());
  });
});
