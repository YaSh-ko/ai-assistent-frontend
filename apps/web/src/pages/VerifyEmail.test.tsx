import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import VerifyEmail from './VerifyEmail';

vi.mock('@/components/ParticlesBackground', () => ({ default: () => null }));
vi.mock('@/lib/api-client', () => ({
  authApi: {
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
  },
  default: { verifyEmail: vi.fn(), resendVerification: vi.fn() },
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    authEvent: vi.fn(),
    authError: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import { authApi } from '@/lib/api-client';

const TEXT = {
  confirmEmailTitle: '\u041f\u041e\u0414\u0422\u0412\u0415\u0420\u0416\u0414\u0415\u041d\u0418\u0415 EMAIL',
  emailLabel: '\u042d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u043d\u0430\u044f \u043f\u043e\u0447\u0442\u0430',
  sendEmail: '\u041e\u0422\u041f\u0420\u0410\u0412\u0418\u0422\u042c \u041f\u0418\u0421\u042c\u041c\u041e',
  enterEmail: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 email-\u0430\u0434\u0440\u0435\u0441',
  checkingEmail:
    '\u041f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u043c \u0432\u0430\u0448 email-\u0430\u0434\u0440\u0435\u0441...',
  emailConfirmed: 'EMAIL \u041f\u041e\u0414\u0422\u0412\u0415\u0420\u0416\u0414\u0415\u041d',
  verificationError:
    '\u041e\u0428\u0418\u0411\u041a\u0410 \u041f\u041e\u0414\u0422\u0412\u0415\u0420\u0416\u0414\u0415\u041d\u0418\u042f',
  genericError:
    '\u0427\u0442\u043e-\u0442\u043e \u043f\u043e\u0448\u043b\u043e \u043d\u0435 \u0442\u0430\u043a. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435',
  expiredLink:
    '\u0421\u0441\u044b\u043b\u043a\u0430 \u043d\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043b\u044c\u043d\u0430 \u0438\u043b\u0438 \u0443\u0441\u0442\u0430\u0440\u0435\u043b\u0430',
};

describe('VerifyEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.localStorage?.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('without token (resend form)', () => {
    it('renders the resend verification form when no token', () => {
      render(
        <MemoryRouter initialEntries={['/verify-email']}>
          <VerifyEmail />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: TEXT.confirmEmailTitle })).toBeInTheDocument();
      expect(screen.getByLabelText(TEXT.emailLabel)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: TEXT.sendEmail })).toBeInTheDocument();
    });

    it('shows error when email is empty on submit', async () => {
      render(
        <MemoryRouter initialEntries={['/verify-email']}>
          <VerifyEmail />
        </MemoryRouter>
      );

      fireEvent.submit(screen.getByLabelText(TEXT.emailLabel).closest('form')!);

      await waitFor(() => {
        expect(screen.getByText(TEXT.enterEmail)).toBeInTheDocument();
      });
    });

    it('calls resendVerification with email and shows alert on success', async () => {
      vi.mocked(authApi.resendVerification).mockResolvedValueOnce({
        response: { ok: true, status: 200 } as Response,
        data: {},
      });
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(
        <MemoryRouter initialEntries={['/verify-email']}>
          <VerifyEmail />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(TEXT.emailLabel), {
        target: { value: 'user@example.com' },
      });
      fireEvent.submit(screen.getByLabelText(TEXT.emailLabel).closest('form')!);

      await waitFor(() => {
        expect(authApi.resendVerification).toHaveBeenCalledWith('user@example.com');
      });
      expect(alertMock).toHaveBeenCalled();

      alertMock.mockRestore();
    });

    it('shows error when resendVerification fails', async () => {
      vi.mocked(authApi.resendVerification).mockResolvedValueOnce({
        response: { ok: false, status: 500 } as Response,
        data: { message: 'Server error' },
      });

      render(
        <MemoryRouter initialEntries={['/verify-email']}>
          <VerifyEmail />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(TEXT.emailLabel), {
        target: { value: 'user@example.com' },
      });
      fireEvent.submit(screen.getByLabelText(TEXT.emailLabel).closest('form')!);

      await waitFor(() => {
        expect(screen.getByText(TEXT.genericError)).toBeInTheDocument();
      });
    });
  });

  describe('with token', () => {
    it('shows loading state while verifying', () => {
      vi.mocked(authApi.verifyEmail).mockImplementationOnce(() => new Promise(() => {}));

      render(
        <MemoryRouter initialEntries={['/verify-email?token=abc123']}>
          <VerifyEmail />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: TEXT.confirmEmailTitle })).toBeInTheDocument();
      expect(screen.getByText(TEXT.checkingEmail)).toBeInTheDocument();
    });

    it('shows success state after email verified', async () => {
      vi.mocked(authApi.verifyEmail).mockResolvedValueOnce({
        response: { ok: true, status: 200 } as Response,
        data: { session: { token: 'test-token' } },
      });

      render(
        <MemoryRouter initialEntries={['/verify-email?token=abc123']}>
          <VerifyEmail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: TEXT.emailConfirmed })).toBeInTheDocument();
      });
      expect(globalThis.localStorage.getItem('auth_token')).toBe('test-token');
    });

    it('stores session token in localStorage on success', async () => {
      vi.mocked(authApi.verifyEmail).mockResolvedValueOnce({
        response: { ok: true, status: 200 } as Response,
        data: { session: { token: 'my-session-token' } },
      });

      render(
        <MemoryRouter initialEntries={['/verify-email?token=abc123']}>
          <VerifyEmail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(globalThis.localStorage.getItem('auth_token')).toBe('my-session-token');
      });
    });

    it('redirects to /chat after 3 seconds on success', async () => {
      vi.useFakeTimers();
      vi.mocked(authApi.verifyEmail).mockResolvedValueOnce({
        response: { ok: true, status: 200 } as Response,
        data: {},
      });

      render(
        <MemoryRouter initialEntries={['/verify-email?token=abc123']}>
          <VerifyEmail />
        </MemoryRouter>
      );

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByRole('heading', { name: TEXT.emailConfirmed })).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/chat');
    });

    it('shows error state when verification fails', async () => {
      vi.mocked(authApi.verifyEmail).mockResolvedValueOnce({
        response: { ok: false, status: 400 } as Response,
        data: { message: 'Token expired' },
      });

      render(
        <MemoryRouter initialEntries={['/verify-email?token=badtoken']}>
          <VerifyEmail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: TEXT.verificationError })).toBeInTheDocument();
      });
      expect(screen.getByText(TEXT.expiredLink)).toBeInTheDocument();
    });

    it('shows error when verifyEmail throws network error', async () => {
      vi.mocked(authApi.verifyEmail).mockRejectedValueOnce(new Error('Network error'));

      render(
        <MemoryRouter initialEntries={['/verify-email?token=abc123']}>
          <VerifyEmail />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: TEXT.verificationError })).toBeInTheDocument();
      });
      expect(screen.getByText(TEXT.genericError)).toBeInTheDocument();
    });
  });
});
