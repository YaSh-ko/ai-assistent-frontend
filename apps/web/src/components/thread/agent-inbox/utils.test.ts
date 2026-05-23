import { describe, it, expect } from 'vitest';
import {
  prettifyText,
  isArrayOfMessages,
  baseMessageObject,
  unknownToPrettyDate,
  constructOpenInStudioURL,
  haveArgsChanged,
  createDefaultHumanResponse,
} from './utils';

describe('prettifyText', () => {
  it('converts snake_case to Title Case', () => {
    expect(prettifyText('hello_world')).toBe('Hello World');
  });

  it('handles single word', () => {
    expect(prettifyText('hello')).toBe('Hello');
  });

  it('handles multiple underscores', () => {
    expect(prettifyText('one_two_three')).toBe('One Two Three');
  });

  it('handles already spaced text', () => {
    expect(prettifyText('hello world')).toBe('Hello World');
  });

  it('handles empty string', () => {
    expect(prettifyText('')).toBe('');
  });
});

describe('isArrayOfMessages', () => {
  it('returns true for array of objects with required fields', () => {
    const messages = [
      { id: '1', type: 'human', content: 'hello', additional_kwargs: {} },
      { id: '2', type: 'ai', content: 'hi', additional_kwargs: {} },
    ];
    expect(isArrayOfMessages(messages as any)).toBe(true);
  });

  it('returns false for array missing required fields', () => {
    const messages = [{ id: '1', content: 'hello' }];
    expect(isArrayOfMessages(messages as any)).toBe(false);
  });

  it('returns true for empty array (vacuous truth of .every)', () => {
    expect(isArrayOfMessages([])).toBe(true);
  });
});

describe('baseMessageObject', () => {
  it('handles plain object with type and content', () => {
    const item = { type: 'human', content: 'hello' };
    const result = baseMessageObject(item);
    expect(result).toContain('human');
    expect(result).toContain('hello');
  });

  it('handles string input', () => {
    expect(baseMessageObject('raw string')).toBe('raw string');
  });

  it('handles plain object without type/content (JSON serialized)', () => {
    const item = { foo: 'bar' };
    const result = baseMessageObject(item);
    expect(result).toContain('foo');
  });

  it('handles object with tool_calls', () => {
    const item = { type: 'ai', content: 'using tool', tool_calls: [{ name: 'search' }] };
    const result = baseMessageObject(item);
    expect(result).toContain('Tool calls');
  });

  it('handles object with empty content', () => {
    const item = { type: 'ai', content: '' };
    const result = baseMessageObject(item);
    expect(result).toContain('ai');
  });
});

describe('unknownToPrettyDate', () => {
  it('formats a valid date string', () => {
    const result = unknownToPrettyDate('2024-01-15T10:30:00Z');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('formats a Date object', () => {
    const date = new Date('2024-06-01T12:00:00Z');
    const result = unknownToPrettyDate(date);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('returns a string for valid timestamp number', () => {
    const result = unknownToPrettyDate(1700000000000);
    expect(result).toBeDefined();
  });
});

describe('constructOpenInStudioURL', () => {
  it('builds URL with deployment URL', () => {
    const url = constructOpenInStudioURL('https://my-deploy.com');
    expect(url).toContain('smith.langchain.com');
    expect(url).toContain('baseUrl=https%3A%2F%2Fmy-deploy.com');
  });

  it('appends threadId to path when provided', () => {
    const url = constructOpenInStudioURL('https://my-deploy.com', 'thread-abc');
    expect(url).toContain('thread-abc');
  });

  it('strips trailing slash from deploymentUrl', () => {
    const url = constructOpenInStudioURL('https://my-deploy.com/');
    expect(url).toContain('baseUrl=https%3A%2F%2Fmy-deploy.com');
    expect(url).not.toContain('baseUrl=https%3A%2F%2Fmy-deploy.com%2F');
  });

  it('works without threadId', () => {
    const url = constructOpenInStudioURL('https://my-deploy.com');
    expect(url).not.toContain('undefined');
  });
});

describe('haveArgsChanged', () => {
  it('returns false when args equal initial values', () => {
    const args = { name: 'Alice', age: '30' };
    const initial = { name: 'Alice', age: '30' };
    expect(haveArgsChanged(args, initial)).toBe(false);
  });

  it('returns true when a string arg has changed', () => {
    const args = { name: 'Bob' };
    const initial = { name: 'Alice' };
    expect(haveArgsChanged(args, initial)).toBe(true);
  });

  it('returns true when a number arg has changed', () => {
    const args = { count: 5 };
    const initial = { count: '3' };
    expect(haveArgsChanged(args as any, initial)).toBe(true);
  });

  it('returns false for non-object args', () => {
    expect(haveArgsChanged('string', {})).toBe(false);
    expect(haveArgsChanged(null, {})).toBe(false);
    expect(haveArgsChanged(undefined, {})).toBe(false);
  });

  it('serializes object values as JSON for comparison', () => {
    const args = { data: { key: 'val' } };
    const initial = { data: '{"key":"val"}' };
    expect(haveArgsChanged(args as any, initial)).toBe(false);
  });
});

describe('createDefaultHumanResponse', () => {
  const makeRef = (val: Record<string, string>) => ({ current: val });

  const makeInterrupt = (config: {
    allow_respond: boolean;
    allow_accept: boolean;
    allow_edit: boolean;
    allow_ignore: boolean;
  }) => ({
    action_request: { action: 'test', args: { key: 'value' } },
    config,
  });

  it('includes response type when allow_respond is true', () => {
    const interrupt = makeInterrupt({
      allow_respond: true,
      allow_accept: false,
      allow_edit: false,
      allow_ignore: false,
    });
    const ref = makeRef({});
    const { responses } = createDefaultHumanResponse(interrupt as any, ref as any);
    expect(responses.some((r) => r.type === 'response')).toBe(true);
  });

  it('includes ignore type when allow_ignore is true', () => {
    const interrupt = makeInterrupt({
      allow_respond: false,
      allow_accept: false,
      allow_edit: false,
      allow_ignore: true,
    });
    const ref = makeRef({});
    const { responses } = createDefaultHumanResponse(interrupt as any, ref as any);
    expect(responses.some((r) => r.type === 'ignore')).toBe(true);
  });

  it('sets defaultSubmitType to response when only allow_respond', () => {
    const interrupt = makeInterrupt({
      allow_respond: true,
      allow_accept: false,
      allow_edit: false,
      allow_ignore: false,
    });
    const { defaultSubmitType } = createDefaultHumanResponse(interrupt as any, makeRef({}) as any);
    expect(defaultSubmitType).toBe('response');
  });

  it('sets hasAccept true when allow_accept is true', () => {
    const interrupt = makeInterrupt({
      allow_respond: false,
      allow_accept: true,
      allow_edit: false,
      allow_ignore: false,
    });
    const { hasAccept } = createDefaultHumanResponse(interrupt as any, makeRef({}) as any);
    expect(hasAccept).toBe(true);
  });

  it('sets defaultSubmitType to undefined when nothing allowed', () => {
    const interrupt = makeInterrupt({
      allow_respond: false,
      allow_accept: false,
      allow_edit: false,
      allow_ignore: false,
    });
    const { defaultSubmitType } = createDefaultHumanResponse(interrupt as any, makeRef({}) as any);
    expect(defaultSubmitType).toBeUndefined();
  });

  it('adds edit response when allow_edit and allow_accept are true', () => {
    const interrupt = makeInterrupt({
      allow_respond: false,
      allow_accept: true,
      allow_edit: true,
      allow_ignore: false,
    });
    const ref = makeRef({ key: 'value' });
    const { responses } = createDefaultHumanResponse(interrupt as any, ref as any);
    expect(responses.some((r) => r.type === 'edit')).toBe(true);
  });

  it('adds edit without acceptAllowed when allow_edit=true and allow_accept=false', () => {
    const interrupt = makeInterrupt({
      allow_respond: false,
      allow_accept: false,
      allow_edit: true,
      allow_ignore: false,
    });
    const ref = makeRef({});
    const { responses } = createDefaultHumanResponse(interrupt as any, ref as any);
    const editResponse = responses.find((r) => r.type === 'edit');
    expect(editResponse).toBeDefined();
    expect(editResponse?.acceptAllowed).toBe(false);
  });

  it('populates ref with new key from processEditArgs when key not in ref', () => {
    const interrupt = makeInterrupt({
      allow_respond: false,
      allow_accept: true,
      allow_edit: true,
      allow_ignore: false,
    });
    const ref = makeRef({});
    createDefaultHumanResponse(interrupt as any, ref as any);
    expect(ref.current).toHaveProperty('key', 'value');
  });

  it('logs error when ref value does not match interrupt args', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const interrupt = makeInterrupt({
      allow_respond: false,
      allow_accept: true,
      allow_edit: true,
      allow_ignore: false,
    });
    const ref = makeRef({ key: 'different-value' });
    createDefaultHumanResponse(interrupt as any, ref as any);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('KEY AND VALUE FOUND'),
      expect.anything()
    );
    consoleSpy.mockRestore();
  });

  it('sets defaultSubmitType to edit when only allow_edit (no accept)', () => {
    const interrupt = makeInterrupt({
      allow_respond: false,
      allow_accept: false,
      allow_edit: true,
      allow_ignore: false,
    });
    const { defaultSubmitType } = createDefaultHumanResponse(interrupt as any, makeRef({}) as any);
    expect(defaultSubmitType).toBe('edit');
  });
});

describe('unknownToPrettyDate extra cases', () => {
  it('returns undefined for invalid date string (catch path)', () => {
    const result = unknownToPrettyDate('not-a-valid-date-at-all-xyz');
    expect(result).toBeUndefined();
  });

  it('returns undefined for ordinary small numbers', () => {
    expect(unknownToPrettyDate(42)).toBeUndefined();
  });

  it('returns undefined for null', () => {
    expect(unknownToPrettyDate(null)).toBeUndefined();
  });

  it('returns undefined for boolean values', () => {
    expect(unknownToPrettyDate(true)).toBeUndefined();
  });
});

describe('baseMessageObject extra cases', () => {
  it('handles object with non-string content', () => {
    const item = { type: 'ai', content: [{ text: 'hi' }] };
    const result = baseMessageObject(item);
    expect(result).toContain('ai');
  });

  it('handles object with empty string content (no content part)', () => {
    const item = { type: 'ai', content: '' };
    const result = baseMessageObject(item);
    expect(result).toBe('ai:');
  });
});
