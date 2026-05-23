import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import EmailSent from './EmailSent';

vi.mock('@/components/ParticlesBackground', () => ({ default: () => null }));
vi.mock('@/lib/api-client', () => ({
  authApi: {
    resendVerification: vi.fn(),
  },
  default: { resendVerification: vi.fn() },
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    authError: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    authEvent: vi.fn(),
  },
}));

import { authApi } from '@/lib/api-client';

const renderWithEmail = (email = 'user@example.com') =>
  render(
    <MemoryRouter
      initialEntries={[{ pathname: '/email-sent', state: { email } }]}
    >
      <EmailSent />
    </MemoryRouter>
  );

const renderWithoutEmail = () =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/email-sent', state: {} }]}>
      <EmailSent />
    </MemoryRouter>
  );

describe('EmailSent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders confirmation page with email', () => {
    renderWithEmail('user@example.com');
    expect(screen.getByText('ПРОВЕРЬТЕ ПОЧТУ')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('ОТПРАВИТЬ ПОВТОРНО')).toBeInTheDocument();
    expect(screen.getByText('ВВЕСТИ КОД ВРУЧНУЮ')).toBeInTheDocument();
  });

  it('does not show email address when no state email', () => {
    renderWithoutEmail();
    expect(screen.getByText('ПРОВЕРЬТЕ ПОЧТУ')).toBeInTheDocument();
    expect(screen.queryByText('user@example.com')).not.toBeInTheDocument();
  });

  it('shows error when resend button clicked with no email', async () => {
    renderWithoutEmail();
    const btn = screen.getByText('ОТПРАВИТЬ ПОВТОРНО').closest('button')!;
    expect(btn).toBeDisabled();
  });

  it('shows success message after successful resend', async () => {
    vi.mocked(authApi.resendVerification).mockResolvedValueOnce({
      response: { ok: true, status: 200 } as Response,
      data: {},
    });

    renderWithEmail();
    fireEvent.click(screen.getByText('ОТПРАВИТЬ ПОВТОРНО').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('Письмо с подтверждением отправлено повторно!')).toBeInTheDocument();
    });
    expect(authApi.resendVerification).toHaveBeenCalledWith('user@example.com');
  });

  it('shows error when resend fails with non-ok response', async () => {
    vi.mocked(authApi.resendVerification).mockResolvedValueOnce({
      response: { ok: false, status: 500 } as Response,
      data: { message: 'Server error' },
    });

    renderWithEmail();
    fireEvent.click(screen.getByText('ОТПРАВИТЬ ПОВТОРНО').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText(/ошибка|не удалось|попробуйте/i)).toBeInTheDocument();
    });
  });

  it('shows error on network failure during resend', async () => {
    vi.mocked(authApi.resendVerification).mockRejectedValueOnce(new Error('Network error'));

    renderWithEmail();
    fireEvent.click(screen.getByText('ОТПРАВИТЬ ПОВТОРНО').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText(/ошибка|не удалось|попробуйте/i)).toBeInTheDocument();
    });
  });

  it('has a link to verify-email page', () => {
    renderWithEmail();
    const link = screen.getByText('ВВЕСТИ КОД ВРУЧНУЮ');
    expect(link.closest('a')).toHaveAttribute('href', '/verify-email');
  });

  it('has a link back to sign-in', () => {
    renderWithEmail();
    const link = screen.getByText('Вернуться к входу');
    expect(link.closest('a')).toHaveAttribute('href', '/sign-in');
  });
});
