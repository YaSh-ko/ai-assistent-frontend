import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getApiKey } from './api-key';

describe('getApiKey', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
  });

  it('returns null when key is not set', () => {
    expect(getApiKey()).toBeNull();
  });

  it('returns the stored key', () => {
    globalThis.localStorage.setItem('lg:chat:apiKey', 'my-secret-key');
    expect(getApiKey()).toBe('my-secret-key');
  });

  it('returns null when window is unavailable', () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(getApiKey()).toBeNull();
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });

  it('returns null when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage error');
    });
    expect(getApiKey()).toBeNull();
    vi.restoreAllMocks();
  });
});
