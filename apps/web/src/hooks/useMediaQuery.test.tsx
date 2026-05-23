import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';

const makeMatchMedia = (matches: boolean) => {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  return {
    matches,
    addEventListener: vi.fn((_event: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb);
    }),
    removeEventListener: vi.fn((_event: string, cb: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(cb);
      if (idx !== -1) listeners.splice(idx, 1);
    }),
    _trigger: (newMatches: boolean) => {
      listeners.forEach((cb) => cb({ matches: newMatches } as MediaQueryListEvent));
    },
  };
};

describe('useMediaQuery', () => {
  let mockMedia: ReturnType<typeof makeMatchMedia>;

  beforeEach(() => {
    mockMedia = makeMatchMedia(false);
    vi.stubGlobal('matchMedia', vi.fn(() => mockMedia));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when media query does not match', () => {
    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
    expect(result.current).toBe(false);
  });

  it('returns true when media query matches', () => {
    mockMedia = makeMatchMedia(true);
    vi.stubGlobal('matchMedia', vi.fn(() => mockMedia));
    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('updates when media query changes', () => {
    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
    expect(result.current).toBe(false);

    act(() => {
      mockMedia._trigger(true);
    });

    expect(result.current).toBe(true);
  });

  it('removes event listener on unmount', () => {
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));
    unmount();
    expect(mockMedia.removeEventListener).toHaveBeenCalled();
  });

  it('subscribes to the correct event type', () => {
    renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(mockMedia.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
