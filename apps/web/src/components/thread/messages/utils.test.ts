import { describe, it, expect } from 'vitest';
import { isComplexValue } from './utils';

describe('isComplexValue', () => {
  it('returns true for an array', () => {
    expect(isComplexValue([1, 2, 3])).toBe(true);
  });

  it('returns true for an empty array', () => {
    expect(isComplexValue([])).toBe(true);
  });

  it('returns true for a plain object', () => {
    expect(isComplexValue({ key: 'value' })).toBe(true);
  });

  it('returns true for an empty object', () => {
    expect(isComplexValue({})).toBe(true);
  });

  it('returns false for null', () => {
    expect(isComplexValue(null)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isComplexValue('hello')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isComplexValue(42)).toBe(false);
  });

  it('returns false for boolean', () => {
    expect(isComplexValue(true)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isComplexValue(undefined)).toBe(false);
  });
});
