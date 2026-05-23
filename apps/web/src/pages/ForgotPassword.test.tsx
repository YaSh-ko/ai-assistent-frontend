import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ForgotPassword from './ForgotPassword';

vi.mock('@/components/ParticlesBackground', () => ({ default: () => null }));

const makeFetchResponse = (status: number, body: object = {}) => {
  const headers = new Headers({ 'content-type': 'application/json' });
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers,
    json: () => Promise.resolve(body),
  } as Response);
};

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the form', () => {
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    expect(screen.getByText('ВОССТАНОВЛЕНИЕ ПАРОЛЯ')).toBeInTheDocument();
    expect(screen.getByLabelText('Электронная почта')).toBeInTheDocument();
  });

  it('shows email validation error for invalid email', async () => {
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Электронная почта'), { target: { value: 'bad-email' } });
    fireEvent.submit(screen.getByLabelText('Электронная почта').closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/Некорректный/i)).toBeInTheDocument();
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows success screen after successful request', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeFetchResponse(404))
      .mockResolvedValueOnce(makeFetchResponse(200, { success: true }));

    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Электронная почта'), { target: { value: 'user@example.com' } });
    fireEvent.submit(screen.getByLabelText('Электронная почта').closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('ПИСЬМО ОТПРАВЛЕНО')).toBeInTheDocument();
    });
  });

  it('shows "try again" button on success screen that resets state', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeFetchResponse(200, { success: true }));

    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Электронная почта'), { target: { value: 'user@example.com' } });
    fireEvent.submit(screen.getByLabelText('Электронная почта').closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('ПИСЬМО ОТПРАВЛЕНО')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('попробуйте снова'));
    expect(screen.getByText('ВОССТАНОВЛЕНИЕ ПАРОЛЯ')).toBeInTheDocument();
  });

  it('shows error when server returns 500', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeFetchResponse(500, {}));

    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Электронная почта'), { target: { value: 'user@example.com' } });
    fireEvent.submit(screen.getByLabelText('Электронная почта').closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/Ошибка сервера/i)).toBeInTheDocument();
    });
  });

  it('shows error when all endpoints return 404/405', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(404));

    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Электронная почта'), { target: { value: 'user@example.com' } });
    fireEvent.submit(screen.getByLabelText('Электронная почта').closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/Что-то пошло не так/i)).toBeInTheDocument();
    });
  });

  it('shows error when success=false in response body', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeFetchResponse(200, { success: false }));

    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Электронная почта'), { target: { value: 'user@example.com' } });
    fireEvent.submit(screen.getByLabelText('Электронная почта').closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/Не удалось отправить письмо/i)).toBeInTheDocument();
    });
  });

  it('shows error on 400 status', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeFetchResponse(400, {}));

    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Электронная почта'), { target: { value: 'user@example.com' } });
    fireEvent.submit(screen.getByLabelText('Электронная почта').closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/Неверный формат email/i)).toBeInTheDocument();
    });
  });

  it('succeeds when first endpoint throws but second returns 200', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce(makeFetchResponse(200, { success: true }));

    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Электронная почта'), { target: { value: 'user@example.com' } });
    fireEvent.submit(screen.getByLabelText('Электронная почта').closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('ПИСЬМО ОТПРАВЛЕНО')).toBeInTheDocument();
    });
  });

  it('shows generic error when all endpoints throw network errors', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Электронная почта'), { target: { value: 'user@example.com' } });
    fireEvent.submit(screen.getByLabelText('Электронная почта').closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/Что-то пошло не так/i)).toBeInTheDocument();
    });
  });

  it('shows generic error when all endpoints return 404/405 (endpoint not found)', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeFetchResponse(405))
      .mockResolvedValueOnce(makeFetchResponse(405))
      .mockResolvedValueOnce(makeFetchResponse(405))
      .mockResolvedValueOnce(makeFetchResponse(404));

    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Электронная почта'), { target: { value: 'ghost@example.com' } });
    fireEvent.submit(screen.getByLabelText('Электронная почта').closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/Что-то пошло не так/i)).toBeInTheDocument();
    });
  });
});
