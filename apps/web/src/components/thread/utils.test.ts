import { describe, it, expect } from 'vitest';
import { getContentString } from './utils';

describe('getContentString', () => {
  it('returns string content directly', () => {
    expect(getContentString('hello world')).toBe('hello world');
  });

  it('joins text blocks from content array', () => {
    const content = [
      { type: 'text', text: 'Hello' },
      { type: 'text', text: 'World' },
    ];
    expect(getContentString(content as any)).toBe('Hello World');
  });

  it('filters out non-text blocks', () => {
    const content = [
      { type: 'image_url', url: 'http://example.com/img.png' },
      { type: 'text', text: 'Caption' },
    ];
    expect(getContentString(content as any)).toBe('Caption');
  });

  it('returns empty string for array with no text blocks', () => {
    const content = [
      { type: 'image_url', url: 'http://example.com/img.png' },
    ];
    expect(getContentString(content as any)).toBe('');
  });

  it('returns empty string for empty array', () => {
    expect(getContentString([])).toBe('');
  });

  it('returns empty string for empty string input', () => {
    expect(getContentString('')).toBe('');
  });
});
