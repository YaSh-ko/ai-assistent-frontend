import { describe, it, expect, vi } from 'vitest';
import { ensureToolCallsHaveResponses, DO_NOT_RENDER_ID_PREFIX } from './ensure-tool-responses';

vi.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

const makeAiMessage = (tool_calls: any[]) => ({
  type: 'ai' as const,
  id: 'ai-1',
  content: '',
  tool_calls,
});

const makeToolMessage = () => ({
  type: 'tool' as const,
  id: 'tool-1',
  tool_call_id: 'tc-1',
  name: 'some_tool',
  content: 'result',
});

const makeHumanMessage = () => ({
  type: 'human' as const,
  id: 'human-1',
  content: 'hello',
});

describe('ensureToolCallsHaveResponses', () => {
  it('returns empty array when all AI messages have following tool messages', () => {
    const messages = [
      makeAiMessage([{ id: 'tc-1', name: 'tool_a', args: {} }]),
      makeToolMessage(),
    ];
    const result = ensureToolCallsHaveResponses(messages as any);
    expect(result).toHaveLength(0);
  });

  it('creates tool response when AI message has tool calls without following tool message', () => {
    const messages = [
      makeAiMessage([{ id: 'tc-1', name: 'tool_a', args: {} }]),
    ];
    const result = ensureToolCallsHaveResponses(messages as any);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('tool');
    expect(result[0].name).toBe('tool_a');
    expect(result[0].tool_call_id).toBe('tc-1');
    expect(result[0].id).toContain(DO_NOT_RENDER_ID_PREFIX);
  });

  it('creates multiple tool responses for multiple tool calls', () => {
    const messages = [
      makeAiMessage([
        { id: 'tc-1', name: 'tool_a', args: {} },
        { id: 'tc-2', name: 'tool_b', args: {} },
      ]),
    ];
    const result = ensureToolCallsHaveResponses(messages as any);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('tool_a');
    expect(result[1].name).toBe('tool_b');
  });

  it('ignores non-AI messages', () => {
    const messages = [makeHumanMessage()];
    const result = ensureToolCallsHaveResponses(messages as any);
    expect(result).toHaveLength(0);
  });

  it('ignores AI messages with empty tool_calls array', () => {
    const messages = [makeAiMessage([])];
    const result = ensureToolCallsHaveResponses(messages as any);
    expect(result).toHaveLength(0);
  });

  it('handles tool_call_id being undefined (uses empty string)', () => {
    const messages = [
      makeAiMessage([{ id: undefined, name: 'tool_a', args: {} }]),
    ];
    const result = ensureToolCallsHaveResponses(messages as any);
    expect(result[0].tool_call_id).toBe('');
  });

  it('returns empty array for empty input', () => {
    expect(ensureToolCallsHaveResponses([])).toHaveLength(0);
  });

  it('DO_NOT_RENDER_ID_PREFIX is correct value', () => {
    expect(DO_NOT_RENDER_ID_PREFIX).toBe('do-not-render-');
  });
});
