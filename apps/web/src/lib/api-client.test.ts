import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest, authApi, graphApi, entriesApi } from './api-client';

const makeFetchResponse = (status: number, body: any = {}) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);

describe('apiRequest', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('calls fetch with correct URL and headers', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200) as any);
    await apiRequest('/test-endpoint');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test-endpoint'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('adds Bearer token when auth_token is in localStorage', async () => {
    globalThis.localStorage.setItem('auth_token', 'my-token');
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200) as any);
    await apiRequest('/test');
    const callArgs = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect((callArgs.headers as Record<string, string>)['Authorization']).toBe('Bearer my-token');
  });

  it('removes auth_token from localStorage on 401 response', async () => {
    localStorage.setItem('auth_token', 'stale-token');
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(401) as any);
    await apiRequest('/test');
    expect(globalThis.localStorage.getItem('auth_token')).toBeNull();
  });

  it('does not remove auth_token on successful response', async () => {
    localStorage.setItem('auth_token', 'valid-token');
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200) as any);
    await apiRequest('/test');
    expect(globalThis.localStorage.getItem('auth_token')).toBe('valid-token');
  });
});

describe('authApi.signIn', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends POST to /auth/sign-in/email with email and password', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, { token: 'abc' }) as any);
    const { data } = await authApi.signIn('user@example.com', 'password123');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/sign-in/email'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(data).toEqual({ token: 'abc' });
  });
});

describe('authApi.signUp', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends POST to /auth/sign-up', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, {}) as any);
    await authApi.signUp('user@example.com', 'password123', 'Alice');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/sign-up'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('trims and lowercases email', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, {}) as any);
    await authApi.signUp('  USER@EXAMPLE.COM  ', 'pass1234', 'Bob');
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as any).body);
    expect(body.email).toBe('user@example.com');
  });

  it('uses "User" as default name when name is empty', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, {}) as any);
    await authApi.signUp('user@example.com', 'pass1234', '');
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as any).body);
    expect(body.name).toBe('User');
  });
});

describe('authApi.verifyEmail', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends POST to /auth/verify-email with token', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, { ok: true }) as any);
    const { data } = await authApi.verifyEmail('my-token');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/verify-email'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(data).toEqual({ ok: true });
  });
});

describe('authApi.forgotPassword', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends POST to /auth/forgot-password', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, {}) as any);
    await authApi.forgotPassword('user@example.com');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/forgot-password'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('authApi.resetPassword', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends POST to /auth/reset-password', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, {}) as any);
    await authApi.resetPassword('reset-token', 'newpass123');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/reset-password'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('authApi.resendVerification', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends POST to /auth/resend-verification', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, {}) as any);
    await authApi.resendVerification('user@example.com');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/resend-verification'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('authApi.checkUserExists', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('returns true when check endpoint returns exists=true', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchResponse(200, { exists: true }) as any);
    const result = await authApi.checkUserExists('user@example.com');
    expect(result).toBe(true);
  });

  it('returns true on network error (fail-safe)', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'));
    const result = await authApi.checkUserExists('user@example.com');
    expect(result).toBe(true);
  });

  it('returns false when login returns 404', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeFetchResponse(500, {}) as any)
      .mockResolvedValueOnce(makeFetchResponse(404, {}) as any)
      .mockResolvedValueOnce(makeFetchResponse(404, { message: 'user not found' }) as any);
    const result = await authApi.checkUserExists('ghost@example.com');
    expect(result).toBe(false);
  });
});

describe('graphApi', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('getRhizome calls /v1/graph/rhizome without params', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, { nodes: [] }) as any);
    await graphApi.getRhizome();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/graph/rhizome'),
      expect.anything(),
    );
  });

  it('getRhizome appends node_types query params', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, {}) as any);
    await graphApi.getRhizome({ node_types: ['person', 'event'] });
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain('node_types=person');
    expect(url).toContain('node_types=event');
  });

  it('getRhizome appends time_period query param', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, {}) as any);
    await graphApi.getRhizome({ time_period: 'week' });
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain('time_period=week');
  });

  it('search encodes query and uses default limit', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, { results: [] }) as any);
    await graphApi.search('hello world');
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain('query=hello%20world');
    expect(url).toContain('limit=50');
  });
});

describe('entriesApi', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('getAnalysis calls correct endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, {}) as any);
    await entriesApi.getAnalysis('entry-123');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/entries/entry-123/analysis'),
      expect.anything(),
    );
  });

  it('getIntensityMetrics calls correct endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, {}) as any);
    await entriesApi.getIntensityMetrics('entry-123');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/entries/entry-123/intensity-metrics'),
      expect.anything(),
    );
  });

  it('getRelatedSituations calls correct endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, {}) as any);
    await entriesApi.getRelatedSituations('entry-123');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/entries/entry-123/related-situations'),
      expect.anything(),
    );
  });

  it('getNegativeImpacts calls correct endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, {}) as any);
    await entriesApi.getNegativeImpacts('entry-123');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/entries/entry-123/negative-impacts'),
      expect.anything(),
    );
  });

  it('getTransformations calls correct endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, {}) as any);
    await entriesApi.getTransformations('entry-123');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/entries/entry-123/transformations'),
      expect.anything(),
    );
  });
});
