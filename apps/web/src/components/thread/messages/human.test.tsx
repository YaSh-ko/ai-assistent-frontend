import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HumanMessage } from './human';

const submitMock = vi.fn();
const setBranchMock = vi.fn();
const getMessagesMetadataMock = vi.fn();

vi.mock('@/providers/Stream', () => ({
  useStreamContext: () => ({
    submit: submitMock,
    setBranch: setBranchMock,
    getMessagesMetadata: getMessagesMetadataMock,
  }),
}));

vi.mock('./shared', () => ({
  BranchSwitcher: ({ onSelect }: { onSelect: (branch: string) => void }) => (
    <button onClick={() => onSelect('branch-b')}>switch branch</button>
  ),
  CommandBar: ({
    isEditing,
    setIsEditing,
    handleSubmitEdit,
  }: {
    isEditing?: boolean;
    setIsEditing?: (value: boolean) => void;
    handleSubmitEdit?: () => void;
  }) => (
    <div>
      <button onClick={() => setIsEditing?.(true)}>edit</button>
      {isEditing ? <button onClick={handleSubmitEdit}>save</button> : null}
    </div>
  ),
}));

describe('HumanMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMessagesMetadataMock.mockReturnValue({
      branch: 'branch-a',
      branchOptions: ['branch-a', 'branch-b'],
      firstSeenState: {
        parent_checkpoint: { checkpoint_id: 'cp-1' },
        values: { messages: [{ id: 'existing', type: 'human', content: 'old' }] },
      },
    });
  });

  it('renders content and allows branch switching', () => {
    render(
      <HumanMessage
        message={{ id: 'm-1', type: 'human', content: 'Initial message' } as any}
        isLoading={false}
      />
    );

    expect(screen.getByText('Initial message')).toBeInTheDocument();

    fireEvent.click(screen.getByText('switch branch'));
    expect(setBranchMock).toHaveBeenCalledWith('branch-b');
  });

  it('enters edit mode and submits edited content', async () => {
    render(
      <HumanMessage
        message={{ id: 'm-1', type: 'human', content: 'Initial message' } as any}
        isLoading={false}
      />
    );

    fireEvent.click(screen.getByText('edit'));

    const textarea = screen.getByDisplayValue('Initial message');
    fireEvent.change(textarea, { target: { value: 'Edited message' } });
    fireEvent.click(screen.getByText('save'));

    await waitFor(() => {
      expect(submitMock).toHaveBeenCalledWith(
        { messages: [{ type: 'human', content: 'Edited message' }] },
        expect.objectContaining({
          checkpoint: { checkpoint_id: 'cp-1' },
          streamMode: ['values'],
          optimisticValues: expect.any(Function),
        })
      );
    });

    const optimisticValues = submitMock.mock.calls[0][1].optimisticValues;
    expect(optimisticValues({ fallback: true })).toEqual({
      messages: [
        { id: 'existing', type: 'human', content: 'old' },
        { type: 'human', content: 'Edited message' },
      ],
    });
  });

  it('submits edit on ctrl+enter', async () => {
    render(
      <HumanMessage
        message={{ id: 'm-1', type: 'human', content: 'Initial message' } as any}
        isLoading={false}
      />
    );

    fireEvent.click(screen.getByText('edit'));
    const textarea = screen.getByDisplayValue('Initial message');
    fireEvent.change(textarea, { target: { value: 'Hotkey save' } });
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    await waitFor(() => {
      expect(submitMock).toHaveBeenCalled();
    });
  });

  it('optimisticValues returns prev when firstSeenState.values is undefined', async () => {
    getMessagesMetadataMock.mockReturnValue({
      branch: 'branch-a',
      branchOptions: ['branch-a'],
      firstSeenState: {
        parent_checkpoint: { checkpoint_id: 'cp-1' },
        values: undefined,
      },
    });

    render(
      <HumanMessage
        message={{ id: 'm-1', type: 'human', content: 'Hello' } as any}
        isLoading={false}
      />
    );

    fireEvent.click(screen.getByText('edit'));
    const textarea = screen.getByDisplayValue('Hello');
    fireEvent.change(textarea, { target: { value: 'Updated' } });
    fireEvent.click(screen.getByText('save'));

    await waitFor(() => {
      expect(submitMock).toHaveBeenCalled();
    });

    const optimisticValues = submitMock.mock.calls[0][1].optimisticValues;
    const prev = { messages: [{ type: 'human', content: 'prev' }] };
    expect(optimisticValues(prev)).toEqual(prev);
  });
});
