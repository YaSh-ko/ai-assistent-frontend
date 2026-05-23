import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadMoreMenu } from './thread-more-menu';

const toastMessage = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
const toggleFavorite = vi.fn();
const updateThreadCategory = vi.fn();
const deleteThread = vi.fn();
const openSpy = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    message: (...args: unknown[]) => toastMessage(...args),
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock('@/providers/Thread', () => ({
  useThreads: () => ({
    favoriteIds: [],
    toggleFavorite,
    threads: [{ thread_id: 'thread-1', metadata: { category: 'general' } }],
    updateThreadCategory,
  }),
}));

vi.mock('@/lib/api-client', () => ({
  chatApi: {
    deleteLangGraphThread: (...args: unknown[]) => deleteThread(...args),
  },
}));

vi.mock('./utils', () => ({
  getContentString: (value: unknown) => (typeof value === 'string' ? value : ''),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, disabled }: any) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuSub: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSubTrigger: ({ children, disabled }: any) => <button type="button" disabled={disabled}>{children}</button>,
  DropdownMenuPortal: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuSubContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('ThreadMoreMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteThread.mockResolvedValue(true);
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function showModal(this: HTMLDialogElement) {
        openSpy();
        this.open = true;
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: function close(this: HTMLDialogElement) {
        this.open = false;
      },
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('disables actions when thread is missing', () => {
    render(
      <ThreadMoreMenu
        threadId={null}
        threadContext={null}
        messages={[]}
        onThreadDeleted={vi.fn()}
      />,
    );

    expect(screen.getByText('Добавить в избранное')).toBeDisabled();
  });

  it('toggles favorite for active thread', () => {
    render(
      <ThreadMoreMenu
        threadId="thread-1"
        threadContext={{ type: 'general', title: 'Чат' }}
        messages={[]}
        onThreadDeleted={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Добавить в избранное'));
    expect(toggleFavorite).toHaveBeenCalledWith('thread-1');
    expect(toastSuccess).toHaveBeenCalledWith('Добавлено в избранное');
  });

  it('exports markdown and deletes thread', async () => {
    const onDeleted = vi.fn();
    render(
      <ThreadMoreMenu
        threadId="thread-1"
        threadContext={{ type: 'general', title: 'Чат' }}
        messages={[
          { type: 'human', content: 'Привет' } as any,
          { type: 'ai', content: 'Ответ' } as any,
        ]}
        onThreadDeleted={onDeleted}
      />,
    );

    fireEvent.click(screen.getByText('Экспортировать в MarkDown'));
    expect(toastSuccess).toHaveBeenCalledWith('Файл MarkDown сохранён');

    const deleteButtons = screen.getAllByText('Удалить');
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(deleteButtons[1]);

    await waitFor(() => {
      expect(deleteThread).toHaveBeenCalledWith('thread-1');
      expect(onDeleted).toHaveBeenCalled();
    });
  });

  it('updates space and handles export guards', async () => {
    render(
      <ThreadMoreMenu
        threadId="thread-1"
        threadContext={{ type: 'general', title: 'Чат' }}
        messages={[]}
        onThreadDeleted={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('События'));
    await waitFor(() => expect(updateThreadCategory).toHaveBeenCalledWith('thread-1', 'entry'));
    expect(toastSuccess).toHaveBeenCalledWith('Пространство обновлено');

    fireEvent.click(screen.getByText('Экспортировать в PDF'));
    fireEvent.click(screen.getByText('Экспортировать в DOCX'));
    expect(toastMessage).toHaveBeenCalledWith('Нет сообщений для экспорта');
  });
});

