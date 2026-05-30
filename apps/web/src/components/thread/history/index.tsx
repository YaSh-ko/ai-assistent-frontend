import { useThreads } from "@/providers/Thread";
import { Thread } from "@langchain/langgraph-sdk";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  Plus,
  Star,
  MoreHorizontal,
  Bookmark,
  BookmarkCheck,
  FolderInput,
  Trash2,
  Check,
  Pencil,
  Search,
  PanelLeftClose,
  PanelLeft,
  Home,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { formatSidebarThreadTitle, getContentString } from "../utils";
import { useQueryState, parseAsBoolean } from "nuqs";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { chatApi } from "@/lib/api-client";
import { toast } from "sonner";
import { ThreadDeleteDialog } from "../thread-delete-dialog";
import "../../../styles/thread-sidebar.css";

export const THREAD_SIDEBAR_WIDTH = 260;
export const THREAD_SIDEBAR_COLLAPSED_WIDTH = 56;
export const THREAD_SIDEBAR_TRANSITION_MS = 250;

const CATEGORIES = [
  { key: "entry", label: "Наблюдения" },
  { key: "goal", label: "Цели" },
  { key: "experiment", label: "Задачи" },
  { key: "analysis", label: "Разбор" },
  { key: "general", label: "Недавнее" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

function getThreadTitle(t: Thread): string {
  const values = t.values as Record<string, unknown> | undefined;
  let raw = "";
  if (values && typeof values.title === "string") {
    raw = values.title;
  } else if (values && Array.isArray(values.messages) && values.messages.length > 0) {
    const msgs = values.messages as Array<{ content: unknown }>;
    raw = getContentString(msgs[0].content as string);
  } else {
    raw = t.thread_id.slice(0, 8);
  }
  return formatSidebarThreadTitle(raw);
}

function shouldKeepThreadContextMenuOpen(
  clientX: number,
  clientY: number,
  anchorThreadId: string,
): boolean {
  if (typeof document === "undefined") return false;
  const el = document.elementFromPoint(clientX, clientY);
  if (!(el instanceof Element)) return false;
  const row = el.closest("[data-thread-context-menu-anchor]");
  if (
    row instanceof HTMLElement &&
    row.dataset.threadContextMenuAnchor === anchorThreadId
  ) {
    return true;
  }
  return !!(
    el.closest('[data-slot="dropdown-menu-content"]') ||
    el.closest('[data-slot="dropdown-menu-sub-content"]') ||
    el.closest("[data-thread-context-menu-trigger]")
  );
}

function ThreadContextMenu({
  t,
  open,
  onOpenChange,
  onClose,
  onRename,
  onDelete,
  children,
}: {
  readonly t: Thread;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onClose: () => void;
  readonly onRename: () => void;
  readonly onDelete: () => void;
  readonly children: ReactNode;
}) {
  const { toggleFavorite, favoriteIds, updateThreadCategory, getThreads, setThreads } =
    useThreads();
  const isFav = favoriteIds.includes(t.thread_id);
  const currentCat = (t.metadata as { category?: string })?.category ?? "general";

  const handleFavorite = useCallback(() => {
    toggleFavorite(t.thread_id);
    onClose();
  }, [toggleFavorite, t.thread_id, onClose]);

  const handleCategory = useCallback(
    async (key: string) => {
      await updateThreadCategory(t.thread_id, key);
      const updated = await getThreads();
      setThreads(updated);
      onClose();
    },
    [updateThreadCategory, t.thread_id, getThreads, setThreads, onClose],
  );

  return (
    <DropdownMenu
      modal={false}
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) onClose();
      }}
    >
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="right"
        sideOffset={4}
        className="min-w-[200px] p-1 border border-zinc-700 bg-zinc-900 text-zinc-100 shadow-xl"
      >
        <DropdownMenuItem
          onClick={handleFavorite}
          className="gap-2.5 text-sm rounded-md"
        >
          {isFav ? (
            <BookmarkCheck className="size-3.5 shrink-0 text-amber-400 fill-amber-400" />
          ) : (
            <Bookmark className="size-3.5 shrink-0" />
          )}
          {isFav ? "Убрать из избранного" : "В избранное"}
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2.5 text-sm rounded-md">
            <FolderInput className="size-3.5 shrink-0" />
            Пространство
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="min-w-[200px] border border-zinc-700 bg-zinc-900 text-zinc-100 shadow-xl">
              {CATEGORIES.map((s) => (
                <DropdownMenuItem
                  key={s.key}
                  onClick={() => handleCategory(s.key)}
                  className="gap-2.5 text-sm rounded-md"
                >
                  {currentCat === s.key ? (
                    <Check className="size-3.5 shrink-0 text-emerald-400" />
                  ) : (
                    <span className="size-3.5 shrink-0" />
                  )}
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuItem
          onClick={() => {
            onClose();
            onRename();
          }}
          className="gap-2.5 text-sm rounded-md"
        >
          <Pencil className="size-3.5 shrink-0" />
          Переименовать
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-zinc-700" />

        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            onClose();
            onDelete();
          }}
          className="gap-2.5 text-sm rounded-md"
        >
          <Trash2 className="size-3.5 shrink-0" />
          Удалить
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThreadItem({
  t,
  onThreadClick,
}: {
  readonly t: Thread;
  readonly onThreadClick?: (threadId: string) => void;
}) {
  const [threadId, setThreadId] = useQueryState("threadId");
  const {
    updateThreadTitle,
    getThreads,
    setThreads,
    favoriteIds,
    toggleFavorite,
  } = useThreads();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemText = getThreadTitle(t);
  const isActive = t.thread_id === threadId;

  const triggerEdit = useCallback(() => {
    setEditValue(itemText);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [itemText]);

  const commitEdit = useCallback(async () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== itemText) {
      await updateThreadTitle(t.thread_id, trimmed);
    }
    setIsEditing(false);
  }, [editValue, itemText, t.thread_id, updateThreadTitle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") commitEdit();
      if (e.key === "Escape") setIsEditing(false);
    },
    [commitEdit],
  );

  const handleDeleteConfirm = useCallback(async () => {
    setIsDeleting(true);
    const ok = await chatApi.deleteConversation(t.thread_id);
    setIsDeleting(false);
    if (!ok) {
      toast.error("Не удалось удалить чат");
      return;
    }
    toast.success("Чат удалён");
    setDeleteOpen(false);
    if (favoriteIds.includes(t.thread_id)) {
      toggleFavorite(t.thread_id);
    }
    if (threadId === t.thread_id) {
      setThreadId(null);
    }
    const updated = await getThreads();
    setThreads(updated);
  }, [
    t.thread_id,
    favoriteIds,
    toggleFavorite,
    threadId,
    setThreadId,
    getThreads,
    setThreads,
  ]);

  useEffect(() => {
    if (!menuOpen) return;
    let closeTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
    const last = { x: 0, y: 0 };
    const onDocPointerMove = (ev: globalThis.PointerEvent) => {
      last.x = ev.clientX;
      last.y = ev.clientY;
      if (shouldKeepThreadContextMenuOpen(last.x, last.y, t.thread_id)) {
        if (closeTimer !== undefined) globalThis.clearTimeout(closeTimer);
        closeTimer = undefined;
        return;
      }
      if (closeTimer !== undefined) globalThis.clearTimeout(closeTimer);
      closeTimer = globalThis.setTimeout(() => {
        closeTimer = undefined;
        if (!shouldKeepThreadContextMenuOpen(last.x, last.y, t.thread_id)) {
          setMenuOpen(false);
        }
      }, 50);
    };
    document.addEventListener("pointermove", onDocPointerMove);
    return () => {
      if (closeTimer !== undefined) globalThis.clearTimeout(closeTimer);
      document.removeEventListener("pointermove", onDocPointerMove);
    };
  }, [menuOpen, t.thread_id]);

  return (
    <div
      className={`thread-sidebar__item ${isActive ? "thread-sidebar__item--active" : ""} ${menuOpen ? "thread-sidebar__item--menu-open" : ""}`}
      data-thread-context-menu-anchor={t.thread_id}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="thread-sidebar__item-input"
          aria-label="Название чата"
        />
      ) : (
        <>
          <button
            type="button"
            className="thread-sidebar__item-btn"
            onClick={() => {
              onThreadClick?.(t.thread_id);
              if (t.thread_id === threadId) return;
              setThreadId(t.thread_id);
            }}
          >
            <span className="thread-sidebar__item-title" title={itemText}>
              {itemText}
            </span>
          </button>
          <ThreadContextMenu
            t={t}
            open={menuOpen}
            onOpenChange={setMenuOpen}
            onClose={() => setMenuOpen(false)}
            onRename={triggerEdit}
            onDelete={() => setDeleteOpen(true)}
          >
            <button
              type="button"
              data-thread-context-menu-trigger
              onClick={(e) => e.stopPropagation()}
              className="thread-sidebar__item-menu"
              aria-label="Меню чата"
              aria-haspopup="menu"
            >
              <MoreHorizontal size={16} />
            </button>
          </ThreadContextMenu>
        </>
      )}
      {deleteOpen ? (
        <ThreadDeleteDialog
          open
          isDeleting={isDeleting}
          onConfirm={handleDeleteConfirm}
          onClose={() => {
            if (!isDeleting) setDeleteOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function CategorySection({
  label,
  categoryKey,
  threads,
  onNewChat,
  onThreadClick,
}: {
  readonly label: string;
  readonly categoryKey: CategoryKey;
  readonly threads: Thread[];
  readonly onNewChat: (key: CategoryKey) => void;
  readonly onThreadClick?: (threadId: string) => void;
}) {
  if (threads.length === 0) return null;

  return (
    <section className="thread-sidebar__section">
      <div className="thread-sidebar__section-head">
        <span className="thread-sidebar__section-label">{label}</span>
        <button
          type="button"
          className="thread-sidebar__section-add"
          onClick={() => onNewChat(categoryKey)}
          aria-label={`Новый чат в разделе ${label}`}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      <div className="thread-sidebar__list">
        {threads.map((t) => (
          <ThreadItem key={t.thread_id} t={t} onThreadClick={onThreadClick} />
        ))}
      </div>
    </section>
  );
}

function ThreadHistoryLoading() {
  return (
    <div className="flex flex-col gap-2 px-1 py-2">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={`sk-${i}`} className="thread-sidebar__skeleton" data-testid="skeleton" />
      ))}
    </div>
  );
}

function FavoritesSection({
  threads,
  onThreadClick,
}: {
  readonly threads: Thread[];
  readonly onThreadClick?: (threadId: string) => void;
}) {
  if (threads.length === 0) return null;

  return (
    <section className="thread-sidebar__section">
      <div className="thread-sidebar__section-head">
        <span className="thread-sidebar__section-label flex items-center gap-1.5">
          <Star className="size-3 text-amber-400 fill-amber-400" />
          Избранное
        </span>
      </div>
      <div className="thread-sidebar__list">
        {threads.map((t) => (
          <ThreadItem key={t.thread_id} t={t} onThreadClick={onThreadClick} />
        ))}
      </div>
    </section>
  );
}

function GroupedThreadList({
  threads,
  searchQuery,
  onThreadClick,
}: {
  readonly threads: Thread[];
  readonly searchQuery: string;
  readonly onThreadClick?: (threadId: string) => void;
}) {
  const [, setThreadId] = useQueryState("threadId");
  const { getThreads, setThreads, favoriteIds: rawFavoriteIds } = useThreads();
  const favoriteIds = useMemo(() => rawFavoriteIds ?? [], [rawFavoriteIds]);

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => getThreadTitle(t).toLowerCase().includes(q));
  }, [threads, searchQuery]);

  const favoriteThreads = useMemo(
    () => filteredThreads.filter((t) => favoriteIds.includes(t.thread_id)),
    [filteredThreads, favoriteIds],
  );

  const threadsByCategory = useMemo(() => {
    const map: Record<CategoryKey, Thread[]> = {
      entry: [],
      goal: [],
      experiment: [],
      analysis: [],
      general: [],
    };
    for (const t of filteredThreads) {
      const cat = (t.metadata as { category?: string })?.category ?? "general";
      const key = (cat in map ? cat : "general") as CategoryKey;
      map[key].push(t);
    }
    return map;
  }, [filteredThreads]);

  const handleNewChat = useCallback(
    async (key: CategoryKey) => {
      if (key === "general") {
        setThreadId(null);
        return;
      }
      try {
        const { thread_id } = await chatApi.createCategoryChat(key);
        const updated = await getThreads();
        setThreads(updated);
        setThreadId(thread_id);
      } catch (err) {
        console.error("Не удалось создать чат в категории", err);
      }
    },
    [setThreadId, getThreads, setThreads],
  );

  const hasAny =
    favoriteThreads.length > 0 ||
    CATEGORIES.some((c) => threadsByCategory[c.key].length > 0);

  if (!hasAny) {
    return (
      <p className="thread-sidebar__empty">
        {searchQuery.trim()
          ? "Ничего не найдено"
          : "Нет чатов. Нажмите «Новый чат», чтобы начать."}
      </p>
    );
  }

  return (
    <>
      <FavoritesSection threads={favoriteThreads} onThreadClick={onThreadClick} />
      {CATEGORIES.map((cat) => (
        <CategorySection
          key={cat.key}
          label={cat.label}
          categoryKey={cat.key}
          threads={threadsByCategory[cat.key]}
          onNewChat={handleNewChat}
          onThreadClick={onThreadClick}
        />
      ))}
    </>
  );
}

function SidebarChrome({
  collapsed,
  onToggleCollapse,
  onThreadClick,
}: {
  readonly collapsed: boolean;
  readonly onToggleCollapse: () => void;
  readonly onThreadClick?: (threadId: string) => void;
}) {
  const [, setThreadId] = useQueryState("threadId");
  const [searchQuery, setSearchQuery] = useState("");
  const { threads, threadsLoading } = useThreads();

  const handleNewChat = useCallback(() => {
    setThreadId(null);
  }, [setThreadId]);

  return (
    <div className={collapsed ? "thread-sidebar thread-sidebar--collapsed" : "thread-sidebar"}>
      <div className="thread-sidebar__rail">
        <button
          type="button"
          className="thread-sidebar__rail-btn"
          onClick={onToggleCollapse}
          aria-label="Развернуть панель"
          title="Развернуть"
        >
          <PanelLeft className="size-5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className="thread-sidebar__rail-btn thread-sidebar__rail-btn--accent"
          onClick={handleNewChat}
          aria-label="Новый чат"
          title="Новый чат"
        >
          <Plus className="size-5" strokeWidth={2} />
        </button>
        <div className="thread-sidebar__rail-spacer" />
        <Link
          to="/navigation"
          className="thread-sidebar__rail-btn"
          aria-label="На главную"
          title="На главную"
        >
          <Home className="size-5" strokeWidth={1.75} />
        </Link>
      </div>

      <div className="thread-sidebar__panel">
        <header className="thread-sidebar__header">
          <Link to="/navigation" className="thread-sidebar__brand">
            Impulse
          </Link>
          <button
            type="button"
            className="thread-sidebar__icon-btn"
            onClick={onToggleCollapse}
            aria-label="Свернуть панель"
          >
            <PanelLeftClose className="size-5" strokeWidth={1.75} />
          </button>
        </header>

        <div className="thread-sidebar__toolbar">
          <button type="button" className="thread-sidebar__new-chat" onClick={handleNewChat}>
            <Plus className="thread-sidebar__new-chat-icon size-4" strokeWidth={2} />
            <span className="thread-sidebar__new-chat-label">Новый чат</span>
          </button>
          <div className="thread-sidebar__search-wrap">
            <Search className="thread-sidebar__search-icon size-4" strokeWidth={2} />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск чатов…"
              className="thread-sidebar__search"
              aria-label="Поиск чатов"
            />
          </div>
        </div>

        <div className="thread-sidebar__scroll impulse-scrollbar">
          {threadsLoading ? (
            <ThreadHistoryLoading />
          ) : (
            <GroupedThreadList
              threads={threads}
              searchQuery={searchQuery}
              onThreadClick={onThreadClick}
            />
          )}
        </div>

        <footer className="thread-sidebar__footer">
          <Link to="/navigation" className="thread-sidebar__footer-link">
            <ChevronLeft className="size-4 shrink-0" />
            На главную
          </Link>
        </footer>
      </div>
    </div>
  );
}

export default function ThreadHistory({
  collapsed = false,
  onToggleCollapse,
}: {
  readonly collapsed?: boolean;
  readonly onToggleCollapse?: () => void;
}) {
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const [chatHistoryOpen, setChatHistoryOpen] = useQueryState(
    "chatHistoryOpen",
    parseAsBoolean.withDefault(true),
  );

  const toggleCollapse = useCallback(() => {
    if (onToggleCollapse) {
      onToggleCollapse();
      return;
    }
    setChatHistoryOpen((p) => !p);
  }, [onToggleCollapse, setChatHistoryOpen]);

  const isCollapsed = onToggleCollapse ? collapsed : !chatHistoryOpen;

  const { getThreads, setThreads, setThreadsLoading } = useThreads();

  useEffect(() => {
    if (globalThis.window === undefined) return;
    setThreadsLoading(true);
    getThreads()
      .then(setThreads)
      .catch(console.error)
      .finally(() => setThreadsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div
        className={
          isCollapsed
            ? "thread-sidebar-shell thread-sidebar-shell--collapsed hidden lg:block"
            : "thread-sidebar-shell hidden lg:block"
        }
      >
        <SidebarChrome
          collapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
      </div>

      <div className="lg:hidden">
        <Sheet
          open={!!chatHistoryOpen && !isLargeScreen}
          onOpenChange={(open) => {
            if (isLargeScreen) return;
            setChatHistoryOpen(open);
          }}
        >
          <SheetContent
            side="left"
            className="flex flex-col min-h-0 p-0 w-[min(100vw,260px)] max-h-[100dvh] border-r border-zinc-800 bg-[var(--growth-bg)] overflow-hidden"
          >
            <SheetTitle className="sr-only">История чатов</SheetTitle>
            <SidebarChrome
              collapsed={false}
              onToggleCollapse={() => setChatHistoryOpen(false)}
              onThreadClick={() => setChatHistoryOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
