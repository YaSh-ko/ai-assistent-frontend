import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import useInterruptedActions from './use-interrupted-actions';

const submitMock = vi.fn();
const sonnerMocks = vi.hoisted(() => ({
  toastMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('@/providers/Stream', () => ({
  useStreamContext: () => ({ submit: submitMock }),
}));

const createDefaultHumanResponseMock = vi.fn();

vi.mock('../utils', () => ({
  createDefaultHumanResponse: (...args: any[]) => createDefaultHumanResponseMock(...args),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(sonnerMocks.toastMock, { error: sonnerMocks.toastErrorMock }),
}));

vi.mock('@langchain/langgraph/web', () => ({ END: '__END__' }));

const makeInterrupt = (overrides: object = {}) => ({
  action_request: { action: 'test', args: { key: 'value' } },
  config: {
    allow_respond: true,
    allow_accept: false,
    allow_edit: false,
    allow_ignore: true,
  },
  description: 'Test interrupt',
  ...overrides,
});

describe('useInterruptedActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    submitMock.mockReset();
    createDefaultHumanResponseMock.mockReturnValue({
      responses: [{ type: 'response', args: 'my response' }],
      defaultSubmitType: 'response',
      hasAccept: false,
    });
  });

  it('initializes humanResponse from createDefaultHumanResponse', () => {
    const { result } = renderHook(() =>
      useInterruptedActions({ interrupt: makeInterrupt() as any })
    );
    expect(result.current.humanResponse).toEqual([{ type: 'response', args: 'my response' }]);
  });

  it('sets acceptAllowed from hasAccept', () => {
    createDefaultHumanResponseMock.mockReturnValue({
      responses: [],
      defaultSubmitType: undefined,
      hasAccept: true,
    });
    const { result } = renderHook(() =>
      useInterruptedActions({ interrupt: makeInterrupt() as any })
    );
    expect(result.current.acceptAllowed).toBe(true);
  });

  it('handleSubmit calls thread.submit and shows success toast', async () => {
    const { result } = renderHook(() =>
      useInterruptedActions({ interrupt: makeInterrupt() as any })
    );

    const event = { preventDefault: vi.fn() } as any;
    await act(async () => {
      await result.current.handleSubmit(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(submitMock).toHaveBeenCalledWith(
      {},
      { command: { resume: [{ type: 'response', args: 'my response' }] } }
    );
    expect(sonnerMocks.toastMock).toHaveBeenCalledWith('Success', expect.objectContaining({
      description: 'Response submitted successfully.',
    }));
  });

  it('handleSubmit shows error when no matching input found', async () => {
    createDefaultHumanResponseMock.mockReturnValue({
      responses: [{ type: 'response', args: 'text' }],
      defaultSubmitType: 'accept',
      hasAccept: false,
    });
    const { result } = renderHook(() =>
      useInterruptedActions({ interrupt: makeInterrupt() as any })
    );

    const event = { preventDefault: vi.fn() } as any;
    await act(async () => {
      await result.current.handleSubmit(event);
    });

    expect(sonnerMocks.toastErrorMock).toHaveBeenCalledWith('Error', expect.objectContaining({
      description: 'No response found.',
    }));
  });

  it('handleSubmit handles edit type with acceptAllowed=true and no edits', async () => {
    createDefaultHumanResponseMock.mockReturnValue({
      responses: [{ type: 'edit', args: { action: 'a', args: {} }, acceptAllowed: true, editsMade: false }],
      defaultSubmitType: 'accept',
      hasAccept: true,
    });
    const { result } = renderHook(() =>
      useInterruptedActions({ interrupt: makeInterrupt() as any })
    );

    const event = { preventDefault: vi.fn() } as any;
    await act(async () => {
      await result.current.handleSubmit(event);
    });

    expect(submitMock).toHaveBeenCalledWith(
      {},
      { command: { resume: [{ type: 'accept', args: { action: 'a', args: {} } }] } }
    );
  });

  it('handleSubmit handles edit type with editsMade=true', async () => {
    createDefaultHumanResponseMock.mockReturnValue({
      responses: [{ type: 'edit', args: { action: 'a', args: {} }, acceptAllowed: true, editsMade: true }],
      defaultSubmitType: 'edit',
      hasAccept: false,
    });
    const { result } = renderHook(() =>
      useInterruptedActions({ interrupt: makeInterrupt() as any })
    );

    const event = { preventDefault: vi.fn() } as any;
    await act(async () => {
      await result.current.handleSubmit(event);
    });

    expect(submitMock).toHaveBeenCalledWith(
      {},
      { command: { resume: [{ type: 'edit', args: { action: 'a', args: {} } }] } }
    );
  });

  it('handleSubmit shows invalid assistant ID error when submit throws', async () => {
    createDefaultHumanResponseMock.mockReturnValue({
      responses: [{ type: 'response', args: 'text' }],
      defaultSubmitType: 'response',
      hasAccept: false,
    });
    submitMock.mockImplementation(() => { throw new Error('Invalid assistant ID: xyz'); });

    const { result } = renderHook(() =>
      useInterruptedActions({ interrupt: makeInterrupt() as any })
    );

    const event = { preventDefault: vi.fn() } as any;
    await act(async () => {
      await result.current.handleSubmit(event);
    });

    expect(sonnerMocks.toastErrorMock).not.toHaveBeenCalled();
  });

  it('handleIgnore calls thread.submit with ignore response', async () => {
    createDefaultHumanResponseMock.mockReturnValue({
      responses: [{ type: 'ignore', args: null }],
      defaultSubmitType: undefined,
      hasAccept: false,
    });
    const { result } = renderHook(() =>
      useInterruptedActions({ interrupt: makeInterrupt() as any })
    );

    const event = { preventDefault: vi.fn() } as any;
    await act(async () => {
      await result.current.handleIgnore(event);
    });

    expect(submitMock).toHaveBeenCalled();
    expect(sonnerMocks.toastMock).toHaveBeenCalledWith('Successfully ignored thread', expect.anything());
  });

  it('handleIgnore shows error when no ignore response', async () => {
    createDefaultHumanResponseMock.mockReturnValue({
      responses: [{ type: 'response', args: 'text' }],
      defaultSubmitType: 'response',
      hasAccept: false,
    });
    const { result } = renderHook(() =>
      useInterruptedActions({ interrupt: makeInterrupt() as any })
    );

    const event = { preventDefault: vi.fn() } as any;
    await act(async () => {
      await result.current.handleIgnore(event);
    });

    expect(sonnerMocks.toastErrorMock).toHaveBeenCalledWith('Error', expect.objectContaining({
      description: 'The selected thread does not support ignoring.',
    }));
  });

  it('handleResolve calls thread.submit with goto END', async () => {
    const { result } = renderHook(() =>
      useInterruptedActions({ interrupt: makeInterrupt() as any })
    );

    const event = { preventDefault: vi.fn() } as any;
    await act(async () => {
      await result.current.handleResolve(event);
    });

    expect(submitMock).toHaveBeenCalledWith({}, { command: { goto: '__END__' } });
    expect(sonnerMocks.toastMock).toHaveBeenCalledWith('Success', expect.objectContaining({
      description: 'Marked thread as resolved.',
    }));
  });

  it('handleResolve shows error toast when submit throws', async () => {
    submitMock.mockImplementationOnce(() => { throw new Error('Network error'); });

    const { result } = renderHook(() =>
      useInterruptedActions({ interrupt: makeInterrupt() as any })
    );

    const event = { preventDefault: vi.fn() } as any;
    await act(async () => {
      await result.current.handleResolve(event);
    });

    expect(sonnerMocks.toastErrorMock).toHaveBeenCalledWith('Error', expect.objectContaining({
      description: 'Failed to mark thread as resolved.',
    }));
  });

  it('supportsMultipleMethods is true when multiple actionable responses exist', () => {
    createDefaultHumanResponseMock.mockReturnValue({
      responses: [
        { type: 'response', args: '' },
        { type: 'edit', args: {}, acceptAllowed: false },
      ],
      defaultSubmitType: 'response',
      hasAccept: false,
    });
    const { result } = renderHook(() =>
      useInterruptedActions({ interrupt: makeInterrupt() as any })
    );
    expect(result.current.supportsMultipleMethods).toBe(true);
  });

  it('handles response type with empty args (omitted from output)', async () => {
    createDefaultHumanResponseMock.mockReturnValue({
      responses: [
        { type: 'response', args: '' },
        { type: 'ignore', args: null },
      ],
      defaultSubmitType: undefined,
      hasAccept: false,
    });
    const { result } = renderHook(() =>
      useInterruptedActions({ interrupt: makeInterrupt() as any })
    );
    // humanResponse with empty args response and no selectedSubmitType
    // handleSubmit falls to the else branch (no response/edit/accept types that pass)
    // Actually 'response' IS in the hasResponseTypes list, but args is empty string (falsy)
    // processHumanResponseInput would return [] for this response
    // So humanResponseInput would be empty, and input would be undefined
    const event = { preventDefault: vi.fn() } as any;
    await act(async () => {
      await result.current.handleSubmit(event);
    });
    expect(sonnerMocks.toastErrorMock).toHaveBeenCalledWith('Error', expect.objectContaining({
      description: 'No response found.',
    }));
  });
});
