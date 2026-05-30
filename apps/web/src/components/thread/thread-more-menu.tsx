import { useCallback, useMemo, useState } from "react";
import type { Message } from "@langchain/langgraph-sdk";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  FileText,
  FolderInput,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { chatApi } from "@/lib/api-client";
import { useThreads } from "@/providers/Thread";
import { getContentString } from "./utils";
import type { ThreadContext } from "./context-banner";
import { ThreadDeleteDialog } from "./thread-delete-dialog";

const SPACES = [
  { key: "entry",      label: "События" },
  { key: "goal",       label: "Цели/Желания" },
  { key: "experiment", label: "Эксперименты" },
  { key: "analysis",   label: "Анализ" },
  { key: "general",    label: "Чаты" },
] as const;

// ─── Markdown export helper ───────────────────────────────────────────────────

function buildMarkdownExport(messages: Message[]): string {
  const lines: string[] = [];
  for (const m of messages) {
    if (m.type !== "human" && m.type !== "ai") continue;
    const role = m.type === "human" ? "Вы" : "Ассистент";
    const body = getContentString(m.content).trim();
    lines.push(`## ${role}`, "", body || "_(пусто)_", "", "---", "");
  }
  return lines.join("\n").trimEnd();
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

// ─── PDF export via browser print ────────────────────────────────────────────

function exportToPdf(messages: Message[], title: string, _threadId: string) {
  const date = new Date().toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" });

  const rows = messages
    .filter((m) => m.type === "human" || m.type === "ai")
    .map((m) => {
      const isHuman = m.type === "human";
      const role = isHuman ? "Вы" : "Impulse";
      const body = escapeHtml(getContentString(m.content).trim() || "(пусто)");
      const roleColor = isHuman ? "#4a90d9" : "#5aaa6a";
      return `
        <div class="msg">
          <div class="role" style="color:${roleColor}">${role}</div>
          <div class="body">${body.replaceAll("\n", "<br>")}</div>
        </div>`;
    })
    .join("");

  const safeTitle = escapeHtml(title || "Экспорт чата");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; margin: 32px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .date { color: #888; font-size: 12px; margin-bottom: 24px; }
  .msg { margin-bottom: 16px; border-left: 3px solid #ddd; padding-left: 12px; }
  .role { font-weight: bold; font-size: 12px; margin-bottom: 4px; }
  .body { white-space: pre-wrap; line-height: 1.5; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
  <h1>${safeTitle}</h1>
  <div class="date">${date}</div>
  ${rows}
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;";
  iframe.srcdoc = html;
  document.body.appendChild(iframe);

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1000);
  };
}

// ─── DOCX export ─────────────────────────────────────────────────────────────

async function exportToDocx(messages: Message[], title: string, threadId: string) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");

  const children = [
    new Paragraph({ text: title || "Экспорт чата", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({
      children: [new TextRun({ text: new Date().toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" }), color: "888888" })],
    }),
    new Paragraph({ text: "" }),
  ];

  for (const m of messages) {
    if (m.type !== "human" && m.type !== "ai") continue;
    const role = m.type === "human" ? "Вы" : "Ассистент";
    const body = getContentString(m.content).trim() || "(пусто)";
    children.push(
      new Paragraph({ children: [new TextRun({ text: role, bold: true })] }),
      new Paragraph({ text: body }),
      new Paragraph({ text: "" }),
    );
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  downloadBlob(`impulse-${threadId.slice(0, 8)}.docx`, blob);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ThreadMoreMenu({
  threadId,
  threadContext,
  messages,
  onThreadDeleted,
  className,
}: Readonly<{
  threadId: string | null;
  threadContext: ThreadContext | null;
  messages: Message[];
  onThreadDeleted: () => void;
  className?: string;
}>) {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { favoriteIds, toggleFavorite, threads, updateThreadCategory } = useThreads();

  const isFavorite = useMemo(() => {
    if (!threadId) return false;
    return favoriteIds.includes(threadId);
  }, [threadId, favoriteIds]);

  const currentCategory = useMemo(() => {
    if (!threadId) return "general";
    const t = threads.find((t) => t.thread_id === threadId);
    return (t?.metadata as Record<string, unknown> | undefined)?.category as string ?? "general";
  }, [threadId, threads]);

  const headerTitle = useMemo(() => {
    if (threadContext?.title) return threadContext.title;
    const firstHuman = messages.find((m) => m.type === "human");
    if (firstHuman) {
      const t = getContentString(firstHuman.content).trim();
      if (t) return t.length > 80 ? `${t.slice(0, 80)}…` : t;
    }
    return "Диалог";
  }, [threadContext, messages]);

  const handleFavorite = useCallback(() => {
    if (!threadId) { toast.message("Нет активного чата"); return; }
    toggleFavorite(threadId);
    toast.success(isFavorite ? "Убрано из избранного" : "Добавлено в избранное");
    setOpen(false);
  }, [threadId, isFavorite, toggleFavorite]);

  const handleSelectSpace = useCallback(async (key: string) => {
    if (!threadId) { toast.message("Нет активного чата"); return; }
    try {
      await updateThreadCategory(threadId, key);
      toast.success("Пространство обновлено");
    } catch {
      toast.error("Не удалось обновить пространство");
    }
    setOpen(false);
  }, [threadId, updateThreadCategory]);

  const handleExportMd = useCallback(() => {
    if (!threadId) { toast.message("Нет активного чата"); return; }
    const md = buildMarkdownExport(messages);
    if (!md) { toast.message("Нет сообщений для экспорта"); return; }
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    downloadBlob(`impulse-${threadId.slice(0, 8)}.md`, blob);
    toast.success("Файл MarkDown сохранён");
    setOpen(false);
  }, [threadId, messages]);

  const handleExportPdf = useCallback(() => {
    if (!threadId) { toast.message("Нет активного чата"); return; }
    if (!messages.length) { toast.message("Нет сообщений для экспорта"); return; }
    try {
      exportToPdf(messages, headerTitle, threadId);
      toast.success("Открыт диалог печати PDF");
    } catch {
      toast.error("Не удалось создать PDF");
    }
    setOpen(false);
  }, [threadId, messages, headerTitle]);

  const handleExportDocx = useCallback(async () => {
    if (!threadId) { toast.message("Нет активного чата"); return; }
    if (!messages.length) { toast.message("Нет сообщений для экспорта"); return; }
    try {
      await exportToDocx(messages, headerTitle, threadId);
      toast.success("DOCX сохранён");
    } catch {
      toast.error("Не удалось создать DOCX");
    }
    setOpen(false);
  }, [threadId, messages, headerTitle]);

  const handleDeleteClick = useCallback(() => {
    if (!threadId) { toast.message("Нет активного чата"); return; }
    setOpen(false);
    setDeleteDialogOpen(true);
  }, [threadId]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!threadId) return;
    setIsDeleting(true);
    const ok = await chatApi.deleteConversation(threadId);
    setIsDeleting(false);
    if (ok) {
      toast.success("Чат удалён");
      setDeleteDialogOpen(false);
      onThreadDeleted();
    } else {
      toast.error("Не удалось удалить чат");
    }
  }, [threadId, onThreadDeleted]);

  const needThread = !threadId;

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-12 rounded-full p-0 text-white hover:bg-white/10 hover:text-white",
                    className,
                  )}
                  aria-label="Меню чата"
                >
                  <img
                    src="/thread-more-dots.png"
                    alt=""
                    className="size-6 object-contain pointer-events-none brightness-0 invert opacity-90"
                  />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Действия с чатом</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent
          align="end"
          className="min-w-[260px] p-0 py-1 border border-zinc-800 bg-zinc-900/95 text-zinc-100 shadow-2xl backdrop-blur-md"
        >
          <div className="px-3 pt-2 pb-2 border-b border-zinc-800">
            <p className="font-medium text-[15px] leading-snug text-white">{headerTitle}</p>
            <p className="text-xs text-white/45 font-light mt-1">
              {threadId ? `Чат · ${threadId.slice(0, 12)}…` : "Нет активного чата"}
            </p>
          </div>
          <div className="py-1 px-1">
            <DropdownMenuItem
              disabled={needThread}
              onClick={handleFavorite}
              className="gap-3 hover:bg-white/10 focus:bg-white/10"
            >
              {isFavorite
                ? <BookmarkCheck className="size-4 shrink-0 text-yellow-400 fill-yellow-400" />
                : <Bookmark className="size-4 shrink-0 text-white/80" />
              }
              {isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={needThread} className="gap-3">
                <FolderInput className="size-4 shrink-0 text-white/80" />
                Перенести в пространство
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="min-w-[180px]">
                  {SPACES.map((s) => (
                    <DropdownMenuItem
                      key={s.key}
                      onClick={() => handleSelectSpace(s.key)}
                      className="gap-3"
                    >
                      {currentCategory === s.key
                        ? <Check className="size-4 shrink-0 text-white/80" />
                        : <span className="size-4 shrink-0" />
                      }
                      {s.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </div>
          <DropdownMenuSeparator />
          <div className="py-1 px-1">
            <DropdownMenuItem
              disabled={needThread}
              onClick={handleExportPdf}
              className="gap-3 hover:bg-white/10 focus:bg-white/10"
            >
              <FileText className="size-4 shrink-0 text-white/80" />
              Экспортировать в PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={needThread}
              onClick={handleExportMd}
              className="gap-3 hover:bg-white/10 focus:bg-white/10"
            >
              <FileText className="size-4 shrink-0 text-white/80" />
              Экспортировать в MarkDown
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={needThread}
              onClick={handleExportDocx}
              className="gap-3 hover:bg-white/10 focus:bg-white/10"
            >
              <FileText className="size-4 shrink-0 text-white/80" />
              Экспортировать в DOCX
            </DropdownMenuItem>
          </div>
          <DropdownMenuSeparator />
          <div className="py-1 px-1">
            <DropdownMenuItem
              disabled={needThread}
              variant="destructive"
              onClick={handleDeleteClick}
              className="gap-3"
            >
              <Trash2 className="size-4 shrink-0" />
              Удалить
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <ThreadDeleteDialog
        open={deleteDialogOpen}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => !isDeleting && setDeleteDialogOpen(false)}
      />
    </>
  );
}
