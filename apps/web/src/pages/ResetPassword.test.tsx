import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ResetPassword from './ResetPassword';

vi.mock('@/components/ParticlesBackground', () => ({ default: () => null }));
vi.mock('@/components/PasswordToggleButton', () => ({
  default: ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} data-testid={`pwd-toggle-${show ? 'hide' : 'show'}`}>
      toggle
    </button>
  ),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const makeFetchResponse = (status: number, body: Record<string, unknown> = {}) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response);

const TEXT = {
  invalidLinkTitle: '\u041d\u0415\u0414\u0415\u0419\u0421\u0422\u0412\u0418\u0422\u0415\u041b\u042c\u041d\u0410\u042f \u0421\u0421\u042b\u041b\u041a\u0410',
  requestNewLink: '\u0417\u0410\u041f\u0420\u041e\u0421\u0418\u0422\u042c \u041d\u041e\u0412\u0423\u042e \u0421\u0421\u042b\u041b\u041a\u0423',
  newPasswordTitle: '\u041d\u041e\u0412\u042b\u0419 \u041f\u0410\u0420\u041e\u041b\u042c',
  newPasswordLabel: '\u041d\u043e\u0432\u044b\u0439 \u043f\u0430\u0440\u043e\u043b\u044c',
  confirmPasswordLabel: '\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u043f\u0430\u0440\u043e\u043b\u044c',
  passwordsMismatch: '\u041f\u0430\u0440\u043e\u043b\u0438 \u043d\u0435 \u0441\u043e\u0432\u043f\u0430\u0434\u0430\u044e\u0442',
  passwordTooShort:
    '\u041f\u0430\u0440\u043e\u043b\u044c \u0441\u043b\u0438\u0448\u043a\u043e\u043c \u043a\u043e\u0440\u043e\u0442\u043a\u0438\u0439 (\u043c\u0438\u043d\u0438\u043c\u0443\u043c 8 \u0441\u0438\u043c\u0432\u043e\u043b\u043e\u0432)',
  successTitle: '\u041f\u0410\u0420\u041e\u041b\u042c \u0418\u0417\u041c\u0415\u041d\u0401\u041d',
  signInNow: '\u0412\u041e\u0419\u0422\u0418 \u0421\u0415\u0419\u0427\u0410\u0421',
  expiredLink:
    '\u0421\u0441\u044b\u043b\u043a\u0430 \u043d\u0435\u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043b\u044c\u043d\u0430 \u0438\u043b\u0438 \u0443\u0441\u0442\u0430\u0440\u0435\u043b\u0430',
  genericError:
    '\u0427\u0442\u043e-\u0442\u043e \u043f\u043e\u0448\u043b\u043e \u043d\u0435 \u0442\u0430\u043a. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435',
};

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('without token', () => {
    it('shows invalid link message when no token in URL', () => {
      render(
        <MemoryRouter initialEntries={['/reset-password']}>
          <ResetPassword />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: TEXT.invalidLinkTitle })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: TEXT.requestNewLink })).toBeInTheDocument();
    });

    it('navigates to forgot-password when button clicked', () => {
      render(
        <MemoryRouter initialEntries={['/reset-password']}>
          <ResetPassword />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: TEXT.requestNewLink }));
      expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
    });
  });

  describe('with token', () => {
    const renderWithToken = () =>
      render(
        <MemoryRouter initialEntries={['/reset-password?token=abc123']}>
          <ResetPassword />
        </MemoryRouter>
      );

    it('renders reset password form when token is present', () => {
      renderWithToken();

      expect(screen.getByRole('heading', { name: TEXT.newPasswordTitle })).toBeInTheDocument();
      expect(screen.getByLabelText(TEXT.newPasswordLabel)).toBeInTheDocument();
      expect(screen.getByLabelText(TEXT.confirmPasswordLabel)).toBeInTheDocument();
    });

    it('shows error when passwords do not match', async () => {
      renderWithToken();
      fireEvent.change(screen.getByLabelText(TEXT.newPasswordLabel), {
        target: { value: 'password123' },
      });
      fireEvent.change(screen.getByLabelText(TEXT.confirmPasswordLabel), {
        target: { value: 'different123' },
      });
      fireEvent.submit(screen.getByLabelText(TEXT.newPasswordLabel).closest('form')!);

      await waitFor(() => {
        expect(screen.getByText(TEXT.passwordsMismatch)).toBeInTheDocument();
      });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('shows error when password is too short', async () => {
      renderWithToken();
      fireEvent.change(screen.getByLabelText(TEXT.newPasswordLabel), {
        target: { value: 'abc' },
      });
      fireEvent.change(screen.getByLabelText(TEXT.confirmPasswordLabel), {
        target: { value: 'abc' },
      });
      fireEvent.submit(screen.getByLabelText(TEXT.newPasswordLabel).closest('form')!);

      await waitFor(() => {
        expect(screen.getByText(TEXT.passwordTooShort)).toBeInTheDocument();
      });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('shows success screen after successful password reset', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(makeFetchResponse(200));

      renderWithToken();
      fireEvent.change(screen.getByLabelText(TEXT.newPasswordLabel), {
        target: { value: 'newpassword123' },
      });
      fireEvent.change(screen.getByLabelText(TEXT.confirmPasswordLabel), {
        target: { value: 'newpassword123' },
      });
      fireEvent.submit(screen.getByLabelText(TEXT.newPasswordLabel).closest('form')!);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: TEXT.successTitle })).toBeInTheDocument();
      });
    });

    it('navigates to /sign-in after 3 seconds on success', async () => {
      vi.useFakeTimers();
      vi.mocked(fetch).mockResolvedValueOnce(makeFetchResponse(200));

      renderWithToken();
      fireEvent.change(screen.getByLabelText(TEXT.newPasswordLabel), {
        target: { value: 'newpassword123' },
      });
      fireEvent.change(screen.getByLabelText(TEXT.confirmPasswordLabel), {
        target: { value: 'newpassword123' },
      });
      fireEvent.submit(screen.getByLabelText(TEXT.newPasswordLabel).closest('form')!);

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByRole('heading', { name: TEXT.successTitle })).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/sign-in');
    });

    it('navigates immediately when sign-in button clicked on success screen', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(makeFetchResponse(200));

      renderWithToken();
      fireEvent.change(screen.getByLabelText(TEXT.newPasswordLabel), {
        target: { value: 'newpassword123' },
      });
      fireEvent.change(screen.getByLabelText(TEXT.confirmPasswordLabel), {
        target: { value: 'newpassword123' },
      });
      fireEvent.submit(screen.getByLabelText(TEXT.newPasswordLabel).closest('form')!);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: TEXT.signInNow })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: TEXT.signInNow }));
      expect(mockNavigate).toHaveBeenCalledWith('/sign-in');
    });

    it('shows error when server returns non-ok response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(makeFetchResponse(400, { message: 'Token expired' }));

      renderWithToken();
      fireEvent.change(screen.getByLabelText(TEXT.newPasswordLabel), {
        target: { value: 'newpassword123' },
      });
      fireEvent.change(screen.getByLabelText(TEXT.confirmPasswordLabel), {
        target: { value: 'newpassword123' },
      });
      fireEvent.submit(screen.getByLabelText(TEXT.newPasswordLabel).closest('form')!);

      await waitFor(() => {
        expect(screen.getByText(TEXT.expiredLink)).toBeInTheDocument();
      });
    });

    it('shows error on network failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      renderWithToken();
      fireEvent.change(screen.getByLabelText(TEXT.newPasswordLabel), {
        target: { value: 'newpassword123' },
      });
      fireEvent.change(screen.getByLabelText(TEXT.confirmPasswordLabel), {
        target: { value: 'newpassword123' },
      });
      fireEvent.submit(screen.getByLabelText(TEXT.newPasswordLabel).closest('form')!);

      await waitFor(() => {
        expect(screen.getByText(TEXT.genericError)).toBeInTheDocument();
      });
    });
  });
});
