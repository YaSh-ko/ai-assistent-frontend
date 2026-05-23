import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ProtectedRoute from './ProtectedRoute';
import { apiRequest } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  apiRequest: vi.fn(),
  getAuthToken: vi.fn(() => globalThis.localStorage.getItem('auth_token')),
  clearAuthToken: vi.fn(() => {
    globalThis.localStorage.removeItem('auth_token');
    globalThis.sessionStorage?.removeItem('auth_token');
  }),
  default: {},
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
    vi.clearAllMocks();
  });

  it('shows loading state while checking auth', () => {
    globalThis.localStorage.setItem('auth_token', 'test-token');
    vi.mocked(apiRequest).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <ProtectedRoute><div>Protected</div></ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Загрузка...')).toBeInTheDocument();
  });

  it('renders children when token is valid', async () => {
    globalThis.localStorage.setItem('auth_token', 'valid-token');
    vi.mocked(apiRequest).mockResolvedValue({ ok: true } as Response);

    render(
      <MemoryRouter>
        <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('redirects to sign-in when no token in localStorage', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ProtectedRoute><div>Secret</div></ProtectedRoute>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Secret')).not.toBeInTheDocument();
    });
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('removes token and redirects when API returns non-ok', async () => {
    globalThis.localStorage.setItem('auth_token', 'bad-token');
    vi.mocked(apiRequest).mockResolvedValue({ ok: false } as Response);

    render(
      <MemoryRouter>
        <ProtectedRoute><div>Protected</div></ProtectedRoute>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Protected')).not.toBeInTheDocument();
    });
    expect(globalThis.localStorage.getItem('auth_token')).toBeNull();
  });

  it('removes token and redirects when API throws', async () => {
    globalThis.localStorage.setItem('auth_token', 'token');
    vi.mocked(apiRequest).mockRejectedValue(new Error('Network error'));

    render(
      <MemoryRouter>
        <ProtectedRoute><div>Protected</div></ProtectedRoute>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Protected')).not.toBeInTheDocument();
    });
    expect(globalThis.localStorage.getItem('auth_token')).toBeNull();
  });
});
