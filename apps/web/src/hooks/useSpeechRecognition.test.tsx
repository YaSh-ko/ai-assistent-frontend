import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSpeechRecognition } from './useSpeechRecognition';

const makeMockRecognition = () => ({
  continuous: false,
  interimResults: false,
  lang: '',
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  onstart: null as any,
  onend: null as any,
  onresult: null as any,
  onerror: null as any,
});

describe('useSpeechRecognition', () => {
  let mockRecognition: ReturnType<typeof makeMockRecognition>;

  beforeEach(() => {
    mockRecognition = makeMockRecognition();
    // Must use regular function (not arrow) so it can be called with `new`
    vi.stubGlobal('SpeechRecognition', vi.fn(function () { return mockRecognition; }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns isSupported=true when SpeechRecognition is available', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(true);
  });

  it('returns isSupported=false when SpeechRecognition is unavailable', () => {
    vi.unstubAllGlobals();
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(false);
  });

  it('uses webkitSpeechRecognition as fallback', () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('webkitSpeechRecognition', vi.fn(function () { return makeMockRecognition(); }));
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(true);
  });

  it('configures recognition with Russian language', () => {
    renderHook(() => useSpeechRecognition());
    expect(mockRecognition.lang).toBe('ru-RU');
    expect(mockRecognition.continuous).toBe(false);
    expect(mockRecognition.interimResults).toBe(false);
  });

  it('starts with isListening=false and empty transcript', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isListening).toBe(false);
    expect(result.current.transcript).toBe('');
  });

  it('startListening calls recognition.start', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => { result.current.startListening(); });
    expect(mockRecognition.start).toHaveBeenCalled();
  });

  it('stopListening calls recognition.stop when listening', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => { mockRecognition.onstart?.(new Event('start')); });
    act(() => { result.current.stopListening(); });
    expect(mockRecognition.stop).toHaveBeenCalled();
  });

  it('stopListening does not call stop when not listening', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => { result.current.stopListening(); });
    expect(mockRecognition.stop).not.toHaveBeenCalled();
  });

  it('onstart sets isListening=true', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => { mockRecognition.onstart?.(new Event('start')); });
    expect(result.current.isListening).toBe(true);
  });

  it('onend sets isListening=false', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => { mockRecognition.onstart?.(new Event('start')); });
    act(() => { mockRecognition.onend?.(new Event('end')); });
    expect(result.current.isListening).toBe(false);
  });

  it('onerror sets isListening=false', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => { mockRecognition.onstart?.(new Event('start')); });
    act(() => { mockRecognition.onerror?.({ error: 'no-speech', message: '' } as any); });
    expect(result.current.isListening).toBe(false);
  });

  it('onresult updates transcript with final results', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    const event = { results: [{ isFinal: true, 0: { transcript: 'Привет мир' } }], resultIndex: 0 };
    act(() => { mockRecognition.onresult?.(event as any); });
    expect(result.current.transcript).toBe('Привет мир');
  });

  it('onresult ignores non-final results', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    const event = { results: [{ isFinal: false, 0: { transcript: 'interim' } }], resultIndex: 0 };
    act(() => { mockRecognition.onresult?.(event as any); });
    expect(result.current.transcript).toBe('');
  });

  it('resetTranscript clears transcript', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    const event = { results: [{ isFinal: true, 0: { transcript: 'Hello' } }], resultIndex: 0 };
    act(() => { mockRecognition.onresult?.(event as any); });
    act(() => { result.current.resetTranscript(); });
    expect(result.current.transcript).toBe('');
  });

  it('aborts recognition on unmount', () => {
    const { unmount } = renderHook(() => useSpeechRecognition());
    unmount();
    expect(mockRecognition.abort).toHaveBeenCalled();
  });

  it('startListening does not start if already listening', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => { mockRecognition.onstart?.(new Event('start')); });
    act(() => { result.current.startListening(); });
    expect(mockRecognition.start).not.toHaveBeenCalled();
  });
});
