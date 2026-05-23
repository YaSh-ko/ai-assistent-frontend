import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ThreadHistory from './index';

const navigateMock = vi.fn();
const setThreadIdMock = vi.fn();
const setChatHistoryOpenMock = vi.fn();
const getThreadsMock = vi.fn();
const setThreadsMock = vi.fn();
const setThreadsLoadingMock = vi.fn();
const toggleFavoriteMock = vi.fn();
const updateThreadCategoryMock = vi.fn();
const updateThreadTitleMock = vi.fn();
const createCategoryChatMock = vi.fn();

const { useThreadsMock } = vi.hoisted(() => ({
  useThreadsMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('nuqs', () => ({
  useQueryState: vi.fn((key: string, options?: { defaultValue?: unknown }) => {
    if (key === 'threadId') return [null, setThreadIdMock];
    if (key === 'chatHistoryOpen') return [false, setChatHistoryOpenMock];
    return [options?.defaultValue ?? null, vi.fn()];
  }),
  parseAsBoolean: { withDefault: (v: boolean) => ({ defaultValue: v }) },
}));

vi.mock('@/providers/Thread', () => ({
  useThreads: useThreadsMock,
}));

vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: () => true,
}));

vi.mock('@/lib/api-client', () => ({
  chatApi: {
    createCategoryChat: (...args: unknown[]) => createCategoryChatMock(...args),
  },
}));

vi.mock('../utils', () => ({
  getContentString: (content: unknown) => String(content),
}));

vi.mock('@/components/ui/dropdown-menu', () => {
  const menuApi = {
    onOpenChange: undefined as ((open: boolean) => void) | undefined,
    open: false,
  };

  return {
    DropdownMenu: ({
      children,
      open,
      onOpenChange,
    }: {
      children: ReactNode;
      open?: boolean;
      onOpenChange?: (open: boolean) => void;
    }) => {
      menuApi.open = !!open;
      menuApi.onOpenChange = onOpenChange;
      return <div>{children}</div>;
    },
    DropdownMenuTrigger: ({ children }: { children: ReactNode }) => (
      <div
        onClick={() => menuApi.onOpenChange?.(!menuApi.open)}
        onMouseDown={() => menuApi.onOpenChange?.(true)}
      >
        {children}
      </div>
    ),
    DropdownMenuContent: ({ children }: { children: ReactNode }) => (
      menuApi.open ? <div data-slot="dropdown-menu-content">{children}</div> : null
    ),
    DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
      <button type="button" onClick={onClick}>
        {children}
      </button>
    ),
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuSub: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    DropdownMenuSubTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
    DropdownMenuPortal: ({ children }: { children: ReactNode }) => <>{children}</>,
    DropdownMenuSubContent: ({ children }: { children: ReactNode }) => <div data-slot="dropdown-menu-sub-content">{children}</div>,
  };
});

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div className={className} data-testid="skeleton" />,
}));

function makeThread(id: string, title?: string, category?: string) {
  return {
    thread_id: id,
    values: title ? { title } : { messages: [{ content: id }] },
    metadata: category ? { category } : {},
  } as any;
}

describe('ThreadHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getThreadsMock.mockResolvedValue([]);
    createCategoryChatMock.mockResolvedValue({ thread_id: 'created-thread' });
    useThreadsMock.mockReturnValue({
      getThreads: getThreadsMock,
      threads: [makeThread('t-1', 'Первый тред', 'general'), makeThread('t-2', 'Второй тред', 'entry')],
      setThreads: setThreadsMock,
      threadsLoading: false,
      setThreadsLoading: setThreadsLoadingMock,
      favoriteIds: ['t-1'],
      toggleFavorite: toggleFavoriteMock,
      updateThreadCategory: updateThreadCategoryMock,
      updateThreadTitle: updateThreadTitleMock,
    });
  });

  it('загружает треды при монтировании и рендерит секции', async () => {
    render(<ThreadHistory />);

    await waitFor(() => expect(getThreadsMock).toHaveBeenCalled());
    expect(screen.getAllByText('Чатики').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Избранное').length).toBeGreaterThan(0);
  });

  it('вызывает navigate при клике назад', () => {
    render(<ThreadHistory />);
    fireEvent.click(screen.getAllByText('На главную')[0].closest('button')!);
    expect(navigateMock).toHaveBeenCalledWith('/navigation');
  });

  it('создает чат категории и обновляет список', async () => {
    getThreadsMock.mockResolvedValueOnce([makeThread('t-3', 'Новый', 'entry')]);
    render(<ThreadHistory />);

    fireEvent.click(screen.getAllByLabelText('Новый чат в разделе События')[0]);

    await waitFor(() => {
      expect(createCategoryChatMock).toHaveBeenCalledWith('entry');
      expect(setThreadsMock).toHaveBeenCalled();
      expect(setThreadIdMock).toHaveBeenCalledWith('created-thread');
    });
  });

  it('обрабатывает ошибку создания категорийного чата', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    createCategoryChatMock.mockRejectedValueOnce(new Error('fail'));
    render(<ThreadHistory />);

    fireEvent.click(screen.getAllByLabelText('Новый чат в разделе Эксперименты')[0]);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('Не удалось создать чат в категории', expect.any(Error));
    });
    errorSpy.mockRestore();
  });

  it('открывает меню треда, переключает избранное и категорию', async () => {
    updateThreadCategoryMock.mockResolvedValueOnce(undefined);
    getThreadsMock.mockResolvedValueOnce([makeThread('t-1', 'Первый тред', 'goal')]);
    render(<ThreadHistory />);

    fireEvent.mouseDown(screen.getAllByLabelText('Меню чата')[0]);
    const menu = document.querySelector('[data-slot="dropdown-menu-content"]') as HTMLElement;
    fireEvent.click(within(menu).getByText('Цели/Желания'));
    fireEvent.mouseDown(screen.getAllByLabelText('Меню чата')[0]);
    fireEvent.click(within(document.querySelector('[data-slot="dropdown-menu-content"]') as HTMLElement).getByText('Убрать из избранного'));

    await waitFor(() => {
      expect(toggleFavoriteMock).toHaveBeenCalledWith('t-1');
      expect(updateThreadCategoryMock).toHaveBeenCalledWith('t-1', 'goal');
      expect(setThreadsMock).toHaveBeenCalled();
    });
  });

  it('переименовывает тред по Enter', async () => {
    updateThreadTitleMock.mockResolvedValueOnce(undefined);
    render(<ThreadHistory />);

    fireEvent.mouseDown(screen.getAllByLabelText('Меню чата')[0]);
    fireEvent.click(screen.getByText('Переименовать'));

    const input = screen.getByDisplayValue('Первый тред');
    fireEvent.change(input, { target: { value: 'Переименованный тред' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(updateThreadTitleMock).toHaveBeenCalledWith('t-1', 'Переименованный тред');
    });
  });

  it('закрывает меню при уходе указателя вне строки и меню', async () => {
    const scheduled: Array<() => void> = [];
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((cb: TimerHandler) => {
      if (typeof cb === 'function') scheduled.push(cb as () => void);
      return 1 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    render(<ThreadHistory />);

    fireEvent.mouseDown(screen.getAllByLabelText('Меню чата')[0]);
    expect(screen.getByText('Удалить')).toBeInTheDocument();

    const outside = document.createElement('div');
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => outside),
    });
    fireEvent.pointerMove(document, { clientX: 10, clientY: 10 });
    act(() => {
      scheduled[0]?.();
    });

    expect(screen.queryByText('Удалить')).not.toBeInTheDocument();
    timeoutSpy.mockRestore();
  });
});

describe('ThreadHistory loading state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useThreadsMock.mockReturnValue({
      getThreads: getThreadsMock,
      threads: [],
      setThreads: setThreadsMock,
      threadsLoading: true,
      setThreadsLoading: setThreadsLoadingMock,
      favoriteIds: [],
      toggleFavorite: vi.fn(),
      updateThreadCategory: vi.fn(),
      updateThreadTitle: vi.fn(),
    });
  });

  it('shows skeletons when threadsLoading is true', () => {
    render(<ThreadHistory />);
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });
});
