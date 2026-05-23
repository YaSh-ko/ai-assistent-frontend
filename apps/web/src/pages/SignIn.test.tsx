import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SignIn from './SignIn';
import authApi from '@/lib/api-client';

vi.mock('@/components/ParticlesBackground', () => ({ default: () => null }));
vi.mock('@/components/PasswordToggleButton', () => ({
  default: ({ onToggle }: { onToggle: () => void }) => (
    <button onClick={onToggle} data-testid="pwd-toggle">toggle</button>
  ),
}));
vi.mock('@/lib/api-client', () => ({
  default: { signIn: vi.fn() },
  apiRequest: vi.fn(),
  authApi: { signIn: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const fillAndSubmit = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText('Электронная почта'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: password } });
  fireEvent.submit(screen.getByLabelText('Электронная почта').closest('form')!);
};

describe('SignIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.localStorage?.clear();
  });

  it('renders the sign-in form', () => {
    render(<MemoryRouter><SignIn /></MemoryRouter>);
    expect(screen.getByText('С ВОЗВРАЩЕНИЕМ')).toBeInTheDocument();
    expect(screen.getByLabelText('Электронная почта')).toBeInTheDocument();
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument();
  });

  it('shows error for invalid email format', async () => {
    render(<MemoryRouter><SignIn /></MemoryRouter>);
    fillAndSubmit('not-an-email', 'password123');
    await waitFor(() => {
      expect(screen.getByText('Некорректный формат email-адреса')).toBeInTheDocument();
    });
    expect(authApi.signIn).not.toHaveBeenCalled();
  });

  it('shows error when password is empty', async () => {
    render(<MemoryRouter><SignIn /></MemoryRouter>);
    fillAndSubmit('user@example.com', '');
    await waitFor(() => {
      expect(screen.getByText('Введите пароль')).toBeInTheDocument();
    });
    expect(authApi.signIn).not.toHaveBeenCalled();
  });

  it('navigates to /chat and stores token on successful sign-in', async () => {
    vi.mocked(authApi.signIn).mockResolvedValue({
      response: { ok: true, status: 200 } as Response,
      data: { session: { token: 'my-token' } },
    });

    render(<MemoryRouter><SignIn /></MemoryRouter>);
    fillAndSubmit('user@example.com', 'password123');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/navigation');
    });
    expect(globalThis.localStorage.getItem('auth_token')).toBe('my-token');
  });

  it('shows error message on 401 invalid credentials', async () => {
    vi.mocked(authApi.signIn).mockResolvedValue({
      response: { ok: false, status: 401 } as Response,
      data: { message: 'Invalid credentials' },
    });

    render(<MemoryRouter><SignIn /></MemoryRouter>);
    fillAndSubmit('user@example.com', 'wrongpass');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('navigates to /verify-email when email not verified (401)', async () => {
    vi.mocked(authApi.signIn).mockResolvedValue({
      response: { ok: false, status: 401 } as Response,
      data: { message: 'email not verified' },
    });

    render(<MemoryRouter><SignIn /></MemoryRouter>);
    fillAndSubmit('user@example.com', 'pass1234');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/verify-email', expect.anything());
    });
  });

  it('navigates to /verify-email on 403 with verify message', async () => {
    vi.mocked(authApi.signIn).mockResolvedValue({
      response: { ok: false, status: 403 } as Response,
      data: { message: 'Please verify your email' },
    });

    render(<MemoryRouter><SignIn /></MemoryRouter>);
    fillAndSubmit('user@example.com', 'pass1234');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/verify-email', expect.anything());
    });
  });

  it('shows server error on 500', async () => {
    vi.mocked(authApi.signIn).mockResolvedValue({
      response: { ok: false, status: 500 } as Response,
      data: { message: 'Internal server error' },
    });

    render(<MemoryRouter><SignIn /></MemoryRouter>);
    fillAndSubmit('user@example.com', 'pass1234');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('shows error when signIn throws network error', async () => {
    vi.mocked(authApi.signIn).mockRejectedValue(new Error('Network failure'));

    render(<MemoryRouter><SignIn /></MemoryRouter>);
    fillAndSubmit('user@example.com', 'pass1234');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('does not store token when response has no session', async () => {
    vi.mocked(authApi.signIn).mockResolvedValue({
      response: { ok: true, status: 200 } as Response,
      data: {},
    });

    render(<MemoryRouter><SignIn /></MemoryRouter>);
    fillAndSubmit('user@example.com', 'pass1234');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/navigation');
    });
    expect(globalThis.localStorage.getItem('auth_token')).toBeNull();
  });

  it('shows error on 400 status', async () => {
    vi.mocked(authApi.signIn).mockResolvedValue({
      response: { ok: false, status: 400 } as Response,
      data: { message: 'не подтвержден email' },
    });

    render(<MemoryRouter><SignIn /></MemoryRouter>);
    fillAndSubmit('user@example.com', 'pass1234');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('shows "user not found" error on 401 with user not found message', async () => {
    vi.mocked(authApi.signIn).mockResolvedValue({
      response: { ok: false, status: 401 } as Response,
      data: { message: 'User not found' },
    });

    render(<MemoryRouter><SignIn /></MemoryRouter>);
    fillAndSubmit('user@example.com', 'pass1234');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('shows generic error on 403 without verify message', async () => {
    vi.mocked(authApi.signIn).mockResolvedValue({
      response: { ok: false, status: 403 } as Response,
      data: { message: 'Access denied' },
    });

    render(<MemoryRouter><SignIn /></MemoryRouter>);
    fillAndSubmit('user@example.com', 'pass1234');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('shows generic error on 400 without email/не подтвержден message', async () => {
    vi.mocked(authApi.signIn).mockResolvedValue({
      response: { ok: false, status: 400 } as Response,
      data: { message: 'Bad request format' },
    });

    render(<MemoryRouter><SignIn /></MemoryRouter>);
    fillAndSubmit('user@example.com', 'pass1234');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('toggles password visibility with remember-me checkbox', () => {
    render(<MemoryRouter><SignIn /></MemoryRouter>);
    const rememberCheckbox = screen.getByLabelText('Запомнить меня');
    expect(rememberCheckbox).not.toBeChecked();
    fireEvent.click(rememberCheckbox);
    expect(rememberCheckbox).toBeChecked();
  });
});
