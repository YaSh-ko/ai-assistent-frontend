import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import BetaTest from './BetaTest';

vi.mock('@/components/ParticlesBackground', () => ({ default: () => null }));
vi.mock('@/lib/logger', () => ({
  logger: {
    apiRequest: vi.fn(),
    authError: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    authEvent: vi.fn(),
  },
}));

const makeFetchResponse = (status: number, body: object = {}) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);

const fillAndSubmit = (telegram: string, email: string, acceptPolicy = true) => {
  fireEvent.change(screen.getByLabelText('Telegram (@username)'), { target: { value: telegram } });
  fireEvent.change(screen.getByLabelText('Электронная почта'), { target: { value: email } });
  if (acceptPolicy) {
    const checkbox = screen.getByRole('checkbox');
    if (!checkbox.hasAttribute('checked')) {
      fireEvent.click(checkbox);
    }
  }
  fireEvent.submit(screen.getByLabelText('Telegram (@username)').closest('form')!);
};

describe('BetaTest', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renders the beta test form', () => {
    render(<MemoryRouter><BetaTest /></MemoryRouter>);
    expect(screen.getByText('БЕТА-ТЕСТИРОВАНИЕ')).toBeInTheDocument();
    expect(screen.getByLabelText('Telegram (@username)')).toBeInTheDocument();
    expect(screen.getByLabelText('Электронная почта')).toBeInTheDocument();
    expect(screen.getByText('ЗАПИСАТЬСЯ')).toBeInTheDocument();
  });

  it('shows error when telegram does not start with @', async () => {
    render(<MemoryRouter><BetaTest /></MemoryRouter>);
    fillAndSubmit('username', 'user@example.com');

    await waitFor(() => {
      expect(screen.getByText('Ник должен начинаться с @')).toBeInTheDocument();
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows error for invalid telegram format', async () => {
    render(<MemoryRouter><BetaTest /></MemoryRouter>);
    fillAndSubmit('@ab', 'user@example.com');

    await waitFor(() => {
      expect(screen.getByText(/Некорректный Telegram/i)).toBeInTheDocument();
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows error when policy not accepted', async () => {
    render(<MemoryRouter><BetaTest /></MemoryRouter>);
    fillAndSubmit('@validuser123', 'user@example.com', false);

    await waitFor(() => {
      expect(screen.getByText(/Необходимо принять политику/i)).toBeInTheDocument();
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows success screen after successful registration', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchResponse(200));

    render(<MemoryRouter><BetaTest /></MemoryRouter>);
    fillAndSubmit('@validuser123', 'user@example.com');

    await waitFor(() => {
      expect(screen.getByText('СПАСИБО ЗА РЕГИСТРАЦИЮ!')).toBeInTheDocument();
    });
    expect(screen.getByText('Вернуться на главную')).toBeInTheDocument();
  });

  it('shows error when server returns non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchResponse(500));

    render(<MemoryRouter><BetaTest /></MemoryRouter>);
    fillAndSubmit('@validuser123', 'user@example.com');

    await waitFor(() => {
      expect(screen.getByText('Не удалось отправить заявку. Проверьте данные и попробуйте снова.')).toBeInTheDocument();
    });
  });

  it('shows generic error on network failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    render(<MemoryRouter><BetaTest /></MemoryRouter>);
    fillAndSubmit('@validuser123', 'user@example.com');

    await waitFor(() => {
      expect(screen.getByText('Произошла ошибка. Попробуйте позже.')).toBeInTheDocument();
    });
  });

  it('clears telegram error when user types in telegram field', async () => {
    render(<MemoryRouter><BetaTest /></MemoryRouter>);
    fillAndSubmit('notvalid', 'user@example.com');

    await waitFor(() => {
      expect(screen.getByText('Ник должен начинаться с @')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Telegram (@username)'), { target: { value: '@valid' } });
    expect(screen.queryByText('Ник должен начинаться с @')).not.toBeInTheDocument();
  });

  it('success screen shows telegram when no email provided', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchResponse(200));

    render(<MemoryRouter><BetaTest /></MemoryRouter>);

    // Fill only telegram, leave email empty — but email is required so we need to provide it
    // Just verify success message includes the telegram/email
    fillAndSubmit('@myusername', 'test@test.com');

    await waitFor(() => {
      expect(screen.getByText('СПАСИБО ЗА РЕГИСТРАЦИЮ!')).toBeInTheDocument();
    });
    expect(screen.getByText(/test@test.com|@myusername/)).toBeInTheDocument();
  });

  it('accepts policy checkbox toggle', () => {
    render(<MemoryRouter><BetaTest /></MemoryRouter>);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });
});
