import { describe, it, expect } from 'vitest';
import { isAgentInboxInterruptSchema } from './agent-inbox-interrupt';

const validInterrupt = {
  action_request: { action: 'test', args: {} },
  config: {
    allow_respond: true,
    allow_accept: true,
    allow_edit: false,
    allow_ignore: false,
  },
};

describe('isAgentInboxInterruptSchema', () => {
  it('returns true for a valid interrupt object', () => {
    expect(isAgentInboxInterruptSchema(validInterrupt)).toBe(true);
  });

  it('returns true for an array with a valid interrupt', () => {
    expect(isAgentInboxInterruptSchema([validInterrupt])).toBe(true);
  });

  it('returns falsy for null', () => {
    expect(isAgentInboxInterruptSchema(null)).toBeFalsy();
  });

  it('returns falsy for undefined', () => {
    expect(isAgentInboxInterruptSchema(undefined)).toBeFalsy();
  });

  it('returns false for a plain string', () => {
    expect(isAgentInboxInterruptSchema('not an interrupt')).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isAgentInboxInterruptSchema({})).toBe(false);
  });

  it('returns false when action_request is missing', () => {
    const { action_request: _, ...noActionRequest } = validInterrupt;
    expect(isAgentInboxInterruptSchema(noActionRequest)).toBe(false);
  });

  it('returns false when config is missing', () => {
    const { config: _, ...noConfig } = validInterrupt;
    expect(isAgentInboxInterruptSchema(noConfig)).toBe(false);
  });

  it('returns false when allow_respond is missing from config', () => {
    const bad = {
      ...validInterrupt,
      config: { allow_accept: true, allow_edit: false, allow_ignore: false },
    };
    expect(isAgentInboxInterruptSchema(bad)).toBe(false);
  });

  it('returns false when config is not an object', () => {
    const bad = { ...validInterrupt, config: 'invalid' };
    expect(isAgentInboxInterruptSchema(bad)).toBe(false);
  });

  it('returns false when action_request is not an object', () => {
    const bad = { ...validInterrupt, action_request: 'bad' };
    expect(isAgentInboxInterruptSchema(bad)).toBe(false);
  });

  it('returns falsy for an empty array', () => {
    expect(isAgentInboxInterruptSchema([])).toBeFalsy();
  });
});
