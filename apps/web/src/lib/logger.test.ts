import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LogLevel } from './logger';

describe('LogLevel enum', () => {
  it('has correct numeric values', () => {
    expect(LogLevel.DEBUG).toBe(0);
    expect(LogLevel.INFO).toBe(1);
    expect(LogLevel.WARN).toBe(2);
    expect(LogLevel.ERROR).toBe(3);
  });
});

describe('Logger', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls console.log for debug messages in dev mode', async () => {
    vi.stubEnv('DEV', true);
    const { logger } = await import('./logger');
    logger.debug('test debug');
    expect(console.log).toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('calls console.info for info messages', async () => {
    vi.stubEnv('DEV', true);
    const { logger } = await import('./logger');
    logger.info('test info');
    expect(console.info).toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('calls console.warn for warn messages', async () => {
    vi.stubEnv('DEV', true);
    const { logger } = await import('./logger');
    logger.warn('test warn');
    expect(console.warn).toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('calls console.error for error messages', async () => {
    const { logger } = await import('./logger');
    logger.error('test error');
    expect(console.error).toHaveBeenCalled();
  });

  it('apiRequest calls debug internally', async () => {
    vi.stubEnv('DEV', true);
    const { logger } = await import('./logger');
    logger.apiRequest('GET', '/test');
    expect(console.log).toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('apiResponse calls error for 4xx status', async () => {
    const { logger } = await import('./logger');
    logger.apiResponse(404, '/test');
    expect(console.error).toHaveBeenCalled();
  });

  it('apiResponse calls debug for 2xx status in dev mode', async () => {
    vi.stubEnv('DEV', true);
    const { logger } = await import('./logger');
    logger.apiResponse(200, '/test');
    expect(console.log).toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('authEvent calls info', async () => {
    const { logger } = await import('./logger');
    logger.authEvent('login');
    expect(console.info).toHaveBeenCalled();
  });

  it('authError calls error', async () => {
    const { logger } = await import('./logger');
    logger.authError('login failed', new Error('bad'));
    expect(console.error).toHaveBeenCalled();
  });

  it('debug with additional data passes data to console.log', async () => {
    vi.stubEnv('DEV', true);
    const { logger } = await import('./logger');
    const data = { key: 'value' };
    logger.debug('msg', data);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('DEBUG'), data);
    vi.unstubAllEnvs();
  });

  it('does not call console.log for debug messages in production mode', async () => {
    vi.stubEnv('DEV', false);
    const { logger } = await import('./logger');
    logger.debug('hidden debug');
    expect(console.log).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('info with data passes data to console.info', async () => {
    const { logger } = await import('./logger');
    const data = { userId: 42 };
    logger.info('user info', data);
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining('INFO'), data);
  });

  it('warn with data passes data to console.warn', async () => {
    vi.stubEnv('DEV', true);
    const { logger } = await import('./logger');
    const data = { warning: 'low memory' };
    logger.warn('resource warning', data);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('WARN'), data);
    vi.unstubAllEnvs();
  });

  it('error with data passes data to console.error', async () => {
    const { logger } = await import('./logger');
    const error = new Error('test error');
    logger.error('something failed', error);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('ERROR'), error);
  });
});
