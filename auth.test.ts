import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('better-auth', () => ({
  betterAuth: vi.fn().mockReturnValue({ some: 'auth' }),
}));

vi.mock('pg', () => ({
  Pool: class {
    constructor(public config: any) {}
  },
}));

vi.mock('./lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('auth initialization', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should initialize with SendGrid when API key is present', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
    process.env.EMAIL_FROM = 'test@example.com';
    process.env.BETTER_AUTH_URL = 'https://test.com';

    const { auth } = await import('./auth');
    const { betterAuth } = await import('better-auth');

    expect(betterAuth).toHaveBeenCalledWith({
      database: expect.any(Object),
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
      },
      emailProvider: expect.objectContaining({
        type: 'sendgrid',
        apiKey: 'test-sendgrid-key',
        from: 'test@example.com',
        onError: expect.any(Function),
        onSuccess: expect.any(Function),
      }),
      baseURL: 'https://test.com',
      session: {
        expiresIn: 60 * 60 * 24 * 7,
      },
      advanced: {},
    });
  });

  it('should fallback to SMTP when SENDGRID_API_KEY is missing', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user@test.com';
    process.env.SMTP_PASSWORD = 'password';
    process.env.SMTP_FROM = 'from@test.com';
    process.env.BETTER_AUTH_URL = 'https://test.com';
    delete process.env.SENDGRID_API_KEY;

    const { auth } = await import('./auth');
    const { betterAuth } = await import('better-auth');

    expect(betterAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        emailProvider: expect.objectContaining({
          type: 'smtp',
          host: 'smtp.test.com',
          port: 587,
          secure: false,
          auth: {
            user: 'user@test.com',
            pass: 'password',
          },
          from: 'from@test.com',
          onError: expect.any(Function),
          onSuccess: expect.any(Function),
        }),
      })
    );
  });

  it('should use default SMTP values when env vars not provided', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.SMTP_FROM;

    const { auth } = await import('./auth');
    const { betterAuth } = await import('better-auth');

    expect(betterAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        emailProvider: expect.objectContaining({
          type: 'smtp',
          host: 'smtp.mail.ru',
          port: 587,
          secure: false,
          auth: {
            user: 'delez.ai@mail.ru',
            pass: 'VvFgJPKNDQUv6CDo6pbp',
          },
          from: 'delez.ai@mail.ru',
        }),
      })
    );
  });

  it('should use default baseURL when BETTER_AUTH_URL is not set', async () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    delete process.env.BETTER_AUTH_URL;

    const { auth } = await import('./auth');
    const { betterAuth } = await import('better-auth');

    expect(betterAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://api.delez-repo.ru',
      })
    );
  });
});
