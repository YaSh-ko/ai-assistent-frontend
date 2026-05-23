import { Button } from "@/components/ui/button";
import { useThreads } from "@/providers/Thread";
import { Thread } from "@langchain/langgraph-sdk";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronDown, ChevronUp, Plus, Star,
  MoreHorizontal, Bookmark, BookmarkCheck, FolderInput, Trash2, Check, Pencil,
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

import { getContentString } from "../utils";
import { useQueryState, parseAsBoolean } from "nuqs";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { chatApi } from "@/lib/api-client";

const CATEGORIES = [
  { key: "entry",      label: "События" },
  { key: "goal",       label: "Цели/Желания" },
  { key: "experiment", label: "Эксперименты" },
  { key: "analysis",   label: "Анализ настоящего/прошлого" },
  { key: "general",    label: "Чатики" },
] as const;

type CategoryKey = typeof CATEGORIES[number]["key"];

function getThreadTitle(t: Thread): string {
  const values = t.values as Record<string, unknown> | undefined;
  if (values && typeof values.title === "string") return values.title;
  if (values && Array.isArray(values.messages) && values.messages.length > 0) {
    const msgs = values.messages as Array<{ content: unknown }>;
    return getContentString(msgs[0].content as string);
  }
  return t.thread_id;
}

/**
 * Keep menu open only while the pointer is over this thread's row or the portaled menu / submenu
 * (same anchor id). Any other area → close (no need to "drag through" the menu).
 */
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
  children,
}: {
  readonly t: Thread;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onClose: () => void;
  readonly onRename: () => void;
  readonly children: ReactNode;
}) {
  const { toggleFavorite, favoriteIds, updateThreadCategory, getThreads, setThreads } = useThreads();
  const isFav = favoriteIds.includes(t.thread_id);
  const currentCat = (t.metadata as { category?: string })?.category ?? "general";

  const handleFavorite = useCallback(() => {
    toggleFavorite(t.thread_id);
    onClose();
  }, [toggleFavorite, t.thread_id, onClose]);

  const handleCategory = useCallback(async (key: string) => {
    await updateThreadCategory(t.thread_id, key);
    const updated = await getThreads();
    setThreads(updated);
    onClose();
  }, [updateThreadCategory, t.thread_id, getThreads, setThreads, onClose]);

  return (
    <DropdownMenu
      modal={false}
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) onClose();
      }}
    >
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="right"
        sideOffset={8}
        className="min-w-[180px] p-1 border border-white/20 bg-[#000019]/95 text-white shadow-2xl backdrop-blur-md"
      >
        <DropdownMenuItem onClick={handleFavorite} className="gap-2.5 text-sm hover:bg-white/10 focus:bg-white/10">
          {isFav
            ? <BookmarkCheck className="size-3.5 shrink-0 text-yellow-400 fill-yellow-400" />
            : <Bookmark className="size-3.5 shrink-0" />}
          {isFav ? "Убрать из избранного" : "В избранное"}
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2.5 text-sm hover:bg-white/10 focus:bg-white/10">
            <FolderInput className="size-3.5 shrink-0" />
            Пространство
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent
              className="min-w-[180px] border border-white/20 bg-[#000019]/95 text-white shadow-2xl backdrop-blur-md"
            >
              {CATEGORIES.map((s) => (
                <DropdownMenuItem key={s.key} onClick={() => handleCategory(s.key)} className="gap-2.5 text-sm hover:bg-white/10 focus:bg-white/10">
                  {currentCat === s.key
                    ? <Check className="size-3.5 shrink-0" />
                    : <span className="size-3.5 shrink-0" />}
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuItem onClick={() => { onClose(); onRename(); }} className="gap-2.5 text-sm hover:bg-white/10 focus:bg-white/10">
          <Pencil className="size-3.5 shrink-0" />
          Переименовать
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onClick={onClose} className="gap-2.5 text-sm hover:bg-red-500/20 focus:bg-red-500/20">
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
  const { updateThreadTitle } = useThreads();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setIsEditing(false);
  }, [commitEdit]);

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
      className="w-full px-1 group relative"
      data-thread-context-menu-anchor={t.thread_id}
    >
      {isEditing ? (
        <div className="px-3 py-1.5 w-[280px]">
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="w-full bg-white/10 rounded px-2 py-1 text-sm text-white outline-none border border-white/20"
          />
        </div>
      ) : (
        <div className={`w-[280px] rounded-md transition-colors ${isActive || menuOpen ? "bg-white/12" : "bg-transparent hover:bg-white/10"}`}>
          <Button
            variant="ghost"
            className="text-left items-start justify-start font-normal w-[280px] text-white hover:text-white hover:bg-transparent pr-8"
            onClick={(e) => {
              e.preventDefault();
              onThreadClick?.(t.thread_id);
              if (t.thread_id === threadId) return;
              setThreadId(t.thread_id);
            }}
          >
            <p className="truncate text-ellipsis">{itemText}</p>
          </Button>
        </div>
      )}
      {!isEditing && (
        <ThreadContextMenu
          t={t}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          onClose={() => setMenuOpen(false)}
          onRename={triggerEdit}
        >
          <button
            type="button"
            data-thread-context-menu-trigger
            onClick={(e) => e.stopPropagation()}
            className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-white/80 p-1"
            aria-label="Меню чата"
            aria-haspopup="menu"
          >
            <MoreHorizontal size={14} />
          </button>
        </ThreadContextMenu>
      )}
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
  const [collapsed, setCollapsed] = useState(false);
  const PREVIEW_COUNT = 3;
  const visibleThreads = collapsed ? threads.slice(0, PREVIEW_COUNT) : threads;
  const hasMore = threads.length > PREVIEW_COUNT;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-1">
          <button
            className="text-white/60 hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Развернуть" : "Свернуть"}
          >
            {collapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
          </button>
          <span className="text-white/70 text-sm font-light">{label}</span>
          {collapsed && hasMore && (
            <span className="text-white/30 text-xs ml-1">{threads.length}</span>
          )}
        </div>
        <button
          className="text-white/60 hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer"
          onClick={() => onNewChat(categoryKey)}
          aria-label={`Новый чат в разделе ${label}`}
        >
          <Plus className="size-4" />
        </button>
      </div>
      <div className="flex flex-col w-full gap-0.5 pb-1">
        {visibleThreads.map((t) => (
          <ThreadItem key={t.thread_id} t={t} onThreadClick={onThreadClick} />
        ))}
        {collapsed && hasMore && (
          <button
            className="text-white/30 hover:text-white/60 text-xs px-4 py-0.5 text-left transition-colors bg-transparent border-none cursor-pointer"
            onClick={() => setCollapsed(false)}
          >
            ещё {threads.length - PREVIEW_COUNT}…
          </button>
        )}
      </div>
    </div>
  );
}

function ThreadHistoryLoading() {
  const skeletonKeys = Array.from({ length: 10 }, (_, i) => `skeleton-${i}`);
  return (
    <div className="flex flex-col w-full gap-2 items-start justify-start py-1 px-2">
      {skeletonKeys.map((key) => (
        <Skeleton key={key} className="w-[280px] h-8" />
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
  const [collapsed, setCollapsed] = useState(false);
  if (threads.length === 0) return null;

  const PREVIEW_COUNT = 3;
  const visibleThreads = collapsed ? threads.slice(0, PREVIEW_COUNT) : threads;
  const hasMore = threads.length > PREVIEW_COUNT;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-1">
          <button
            className="text-white/60 hover:text-white transition-colors bg-transparent border-none p-0 cursor-pointer"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Развернуть" : "Свернуть"}
          >
            {collapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
          </button>
          <Star className="size-3.5 text-yellow-400 fill-yellow-400" />
          <span className="text-white/70 text-sm font-light">Избранное</span>
          {collapsed && hasMore && (
            <span className="text-white/30 text-xs ml-1">{threads.length}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col w-full gap-0.5 pb-1">
        {visibleThreads.map((t) => (
          <ThreadItem key={t.thread_id} t={t} onThreadClick={onThreadClick} />
        ))}
        {collapsed && hasMore && (
          <button
            className="text-white/30 hover:text-white/60 text-xs px-4 py-0.5 text-left transition-colors bg-transparent border-none cursor-pointer"
            onClick={() => setCollapsed(false)}
          >
            ещё {threads.length - PREVIEW_COUNT}…
          </button>
        )}
      </div>
    </div>
  );
}

function GroupedThreadList({
  threads,
  onThreadClick,
}: {
  readonly threads: Thread[];
  readonly onThreadClick?: (threadId: string) => void;
}) {
  const [, setThreadId] = useQueryState("threadId");
  const { getThreads, setThreads, favoriteIds: rawFavoriteIds } = useThreads();
  const favoriteIds = useMemo(() => rawFavoriteIds ?? [], [rawFavoriteIds]);

  const favoriteThreads = useMemo(() => {
    return threads.filter((t) => favoriteIds.includes(t.thread_id));
  }, [threads, favoriteIds]);

  const threadsByCategory = useMemo(() => {
    const map: Record<CategoryKey, Thread[]> = {
      entry: [], goal: [], experiment: [], analysis: [], general: [],
    };
    for (const t of threads) {
      const cat = (t.metadata as { category?: string })?.category ?? "general";
      const key = (cat in map ? cat : "general") as CategoryKey;
      map[key].push(t);
    }
    return map;
  }, [threads]);

  const handleNewChat = useCallback(async (key: CategoryKey) => {
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
  }, [setThreadId, getThreads, setThreads]);

  return (
    <div className="flex flex-col w-full gap-1 py-1">
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
    </div>
  );
}

export default function ThreadHistory() {
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const navigate = useNavigate();
  const [chatHistoryOpen, setChatHistoryOpen] = useQueryState(
    "chatHistoryOpen",
    parseAsBoolean.withDefault(false),
  );
  const [,] = useQueryState("threadId");

  const { getThreads, threads, setThreads, threadsLoading, setThreadsLoading } = useThreads();

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
      {/* Desktop — статический блок в потоке документа */}
      <div className="hidden lg:flex flex-col border-r border-white/20 items-start justify-start h-full w-[300px] shrink-0 shadow-inner-right bg-[#000019] overflow-hidden rounded-r-[20px]">
        <div className="w-full border-b border-white/20 pb-3 pt-3 bg-[#000019] rounded-tr-[20px] shrink-0">
          <div className="flex items-center justify-between w-full px-4">
            <button
              style={{ color: 'white' }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-0 outline-none"
              onClick={() => navigate('/navigation')}
            >
              <ChevronLeft className="size-5" style={{ color: 'white' }} />
              <span className="text-base font-light tracking-tight" style={{ color: 'white' }}>На главную</span>
            </button>
            <button
              className="hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-0 outline-none"
              onClick={() => setChatHistoryOpen((p) => !p)}
            >
              <img src="/Vector.png" alt="Close Sidebar" className="size-5" />
            </button>
          </div>
        </div>
        <div className="w-full bg-[#000019] flex-1 overflow-y-auto overflow-x-hidden rounded-br-[20px] delez-scrollbar">
          {threadsLoading ? <ThreadHistoryLoading /> : <GroupedThreadList threads={threads} />}
        </div>
      </div>

      {/* Mobile — Sheet */}
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
            className="lg:hidden flex flex-col min-h-0 bg-[#000019] border-r border-white/20 p-0 w-[300px] max-h-[100dvh] rounded-r-[20px] overflow-hidden"
          >
            <SheetTitle className="sr-only">История чатов</SheetTitle>
            <div className="w-full border-b border-white/20 pb-2 shrink-0">
              <div className="relative flex items-center justify-center w-full px-4">
                <Button
                  className="text-white absolute left-[1px] top-1/2 -translate-y-1/2 hover:bg-transparent focus:bg-transparent active:bg-transparent hover:text-white focus:text-white active:text-white"
                  variant="ghost"
                  onClick={() => navigate('/navigation')}
                >
                  <ChevronLeft className="size-6" />
                </Button>
                <h1 className="text-xl font-light tracking-tight text-white relative left-[-20px]">
                  На главную
                </h1>
                <Button
                  className="hover:bg-transparent text-white absolute right-1 top-1/2 -translate-y-1/2"
                  variant="ghost"
                  onClick={() => setChatHistoryOpen((p) => !p)}
                >
                  <img src="/Vector.png" alt="Sidebar" className="size-5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden delez-scrollbar">
              {threadsLoading ? (
                <ThreadHistoryLoading />
              ) : (
                <GroupedThreadList
                  threads={threads}
                  onThreadClick={() => setChatHistoryOpen((o) => !o)}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
