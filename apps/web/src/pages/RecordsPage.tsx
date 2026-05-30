import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, CalendarDays, ChartLine, NotebookTabs, Eraser, ImagePlus, Save, Type, Download } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import RadialPulseLoader from "@/components/ui/loading-animation";
import { entriesApi, insightsApi } from "@/lib/api-client";

type RecordTab = "calendar" | "notebooks" | "analytics" | "ai";

interface EntryItem {
  id: string;
  title?: string | null;
  description: string;
  event_date: string;
  created_at: string;
}

interface NotebookDraft {
  title: string;
  content: string;
  imageUrl: string;
  gifUrl: string;
}

interface NotebookEntryCard {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  gifUrl: string;
  createdAt: string;
}

interface NotebookMeta {
  id: string;
  title: string;
  subtitle: string;
  sphere: string;
  coverClassName: string;
}

interface InsightItem {
  label: string;
  count: number;
}

interface EntryInsights {
  period: string;
  total_entries: number;
  active_days: number;
  average_entries_per_active_day: number;
  average_text_length: number;
  strongest_entry_title: string;
  strongest_entry_length: number;
  growth_triggers: InsightItem[];
  burnout_triggers: InsightItem[];
  repeating_patterns: InsightItem[];
}

interface DayCell {
  day: number;
  dateKey: string;
  cellKey: string;
}

interface EmptyCell {
  day: null;
  dateKey: null;
  cellKey: string;
}

type CalendarCell = DayCell | EmptyCell;

function getShortText(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max)}...`;
}

function getDateKey(dateIso: string): string {
  const date = new Date(dateIso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMonthCells(nowDate: Date): CalendarCell[] {
  const year = nowDate.getFullYear();
  const month = nowDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysCount = lastDay.getDate();

  const cells: CalendarCell[] = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({ day: null, dateKey: null, cellKey: `pad-${i}` });
  }

  for (let d = 1; d <= daysCount; d += 1) {
    const date = new Date(year, month, d);
    const dateKey = getDateKey(date.toISOString());
    cells.push({ day: d, dateKey, cellKey: dateKey });
  }

  return cells;
}

const notebooks: NotebookMeta[] = [
  { id: "study", title: "Учеба", subtitle: "Саморазвитие и навыки", sphere: "Учеба/Саморазвитие", coverClassName: "bg-gradient-to-br from-[#72b7ff] to-[#4d86cc]" },
  { id: "career", title: "Работа", subtitle: "Проекты и карьерные шаги", sphere: "Работа/Карьера", coverClassName: "bg-gradient-to-br from-[#76b0e8] to-[#5f89ba]" },
  { id: "home", title: "Быт", subtitle: "Дом и личные дела", sphere: "Личная жизнь/быт", coverClassName: "bg-gradient-to-br from-[#9ad2ff] to-[#6db1de]" },
  { id: "spirit", title: "Дух", subtitle: "Смыслы и ценности", sphere: "Мировоззрение/Дух", coverClassName: "bg-gradient-to-br from-[#8bb8f0] to-[#6c93c8]" },
  { id: "society", title: "Общество", subtitle: "Участие и вклад", sphere: "Общественная деятельность", coverClassName: "bg-gradient-to-br from-[#7ea6da] to-[#597da8]" },
  { id: "friends", title: "Социум", subtitle: "Люди и отношения", sphere: "Социальная жизнь", coverClassName: "bg-gradient-to-br from-[#7ab9ff] to-[#6291cc]" },
  { id: "finance", title: "Финансы", subtitle: "Доходы и траты", sphere: "Финансовое благополучие", coverClassName: "bg-gradient-to-br from-[#9fc7f0] to-[#7997ba]" },
  { id: "hobby", title: "Хобби", subtitle: "Творчество и интересы", sphere: "Хобби", coverClassName: "bg-gradient-to-br from-[#8ac4ff] to-[#6f98c7]" },
];

const NOTEBOOKS_STORAGE_KEY = "impulse_notebooks_drafts_v1";
const NOTEBOOK_ENTRIES_STORAGE_KEY = "impulse_notebook_entries_v1";

function loadNotebookDrafts(): Record<string, NotebookDraft> {
  try {
    const raw = localStorage.getItem(NOTEBOOKS_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as Record<string, NotebookDraft>;
  } catch {
    return {};
  }
}

function saveNotebookDrafts(drafts: Record<string, NotebookDraft>): void {
  localStorage.setItem(NOTEBOOKS_STORAGE_KEY, JSON.stringify(drafts));
}

function loadNotebookEntries(): Record<string, NotebookEntryCard[]> {
  try {
    const raw = localStorage.getItem(NOTEBOOK_ENTRIES_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as Record<string, NotebookEntryCard[]>;
  } catch {
    return {};
  }
}

function saveNotebookEntries(entriesByNotebook: Record<string, NotebookEntryCard[]>): void {
  localStorage.setItem(NOTEBOOK_ENTRIES_STORAGE_KEY, JSON.stringify(entriesByNotebook));
}

function defaultDraft(notebookTitle: string): NotebookDraft {
  return {
    title: notebookTitle,
    content: "",
    imageUrl: "",
    gifUrl: "",
  };
}

export default function RecordsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<RecordTab>("calendar");
  const [isCreatingNotebookEntry, setIsCreatingNotebookEntry] = useState<boolean>(false);
  const [entries, setEntries] = useState<EntryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [monthCells, setMonthCells] = useState<CalendarCell[]>([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>(notebooks[0].id);
  const [notebookDrafts, setNotebookDrafts] = useState<Record<string, NotebookDraft>>({});
  const [notebookEntries, setNotebookEntries] = useState<Record<string, NotebookEntryCard[]>>({});
  const [drawMode, setDrawMode] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<"day" | "week" | "month" | "year" | "all">("month");
  const [entryInsights, setEntryInsights] = useState<EntryInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState<boolean>(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selectedNotebook = useMemo(() => notebooks.find((notebook) => notebook.id === selectedNotebookId) ?? notebooks[0], [selectedNotebookId]);
  const selectedDraft = useMemo(() => {
    const existing = notebookDrafts[selectedNotebook.id];
    return existing ?? defaultDraft(selectedNotebook.title);
  }, [notebookDrafts, selectedNotebook]);
  const notebooksBySphere = useMemo(() => {
    const grouped = new Map<string, NotebookMeta[]>();
    for (const notebook of notebooks) {
      const current = grouped.get(notebook.sphere);
      if (current) {
        current.push(notebook);
      } else {
        grouped.set(notebook.sphere, [notebook]);
      }
    }
    return Array.from(grouped.entries());
  }, []);

  useEffect(() => {
    const currentDate = new Date();
    setMonthCells(buildMonthCells(currentDate));
  }, []);

  useEffect(() => {
    if (activeTab !== "analytics") {
      return;
    }
    setInsightsLoading(true);
    setInsightsError(null);
    insightsApi
      .getEntryInsights(analyticsPeriod)
      .then((data) => {
        setEntryInsights(data);
      })
      .catch((insightError: unknown) => {
        const message = insightError instanceof Error ? insightError.message : "Не удалось загрузить аналитику";
        setInsightsError(message);
      })
      .finally(() => {
        setInsightsLoading(false);
      });
  }, [activeTab, analyticsPeriod]);

  useEffect(() => {
    const drafts = loadNotebookDrafts();
    setNotebookDrafts(drafts);
  }, []);

  useEffect(() => {
    saveNotebookDrafts(notebookDrafts);
  }, [notebookDrafts]);

  useEffect(() => {
    const loadedEntries = loadNotebookEntries();
    setNotebookEntries(loadedEntries);
  }, []);

  useEffect(() => {
    saveNotebookEntries(notebookEntries);
  }, [notebookEntries]);

  useEffect(() => {
    entriesApi
      .getAll()
      .then((data) => {
        const loadedEntries = (data.entries ?? []) as EntryItem[];
        setEntries(loadedEntries);
      })
      .catch(() => {
        setError("Не удалось загрузить записи");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.strokeStyle = "rgba(255,255,255,0.95)";
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
  }, [activeTab]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, EntryItem[]>();

    for (const entry of entries) {
      const key = getDateKey(entry.event_date);
      const current = map.get(key);
      if (current) {
        current.push(entry);
      } else {
        map.set(key, [entry]);
      }
    }

    return map;
  }, [entries]);

  const recordTabs: Array<{ id: RecordTab; label: string; icon: typeof CalendarDays; color: string }> = [
    { id: "calendar", label: "Календарь", icon: CalendarDays, color: "#60a5fa" },
    { id: "notebooks", label: "Блокноты", icon: NotebookTabs, color: "#a78bfa" },
    { id: "analytics", label: "Анализ", icon: ChartLine, color: "#34d399" },
    { id: "ai", label: "ИИ-чат", icon: Bot, color: "#fbbf24" },
  ];

  const applyFormatting = (prefix: string, suffix: string): void => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = selectedDraft.content;
    const selectedText = currentText.slice(start, end);
    const replacedText = `${prefix}${selectedText}${suffix}`;
    const nextText = `${currentText.slice(0, start)}${replacedText}${currentText.slice(end)}`;

    setNotebookDrafts((prev) => {
      const next = {
        ...prev,
        [selectedNotebook.id]: {
          ...selectedDraft,
          content: nextText,
        },
      };
      return next;
    });

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + replacedText.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const updateSelectedDraft = (patch: Partial<NotebookDraft>): void => {
    setNotebookDrafts((prev) => ({
      ...prev,
      [selectedNotebook.id]: {
        ...selectedDraft,
        ...patch,
      },
    }));
  };

  const stopNotebookEntryCreation = (): void => {
    setIsCreatingNotebookEntry(false);
  };

  const persistSelectedNotebook = (): void => {
    const title = selectedDraft.title.trim() || selectedNotebook.title;
    const content = selectedDraft.content.trim();
    if (!content) {
      return;
    }

    const entry: NotebookEntryCard = {
      id: `entry-${globalThis.crypto.randomUUID()}`,
      title,
      content,
      imageUrl: selectedDraft.imageUrl.trim(),
      gifUrl: selectedDraft.gifUrl.trim(),
      createdAt: new Date().toISOString(),
    };

    setNotebookEntries((prev) => {
      const current = prev[selectedNotebook.id] ?? [];
      return {
        ...prev,
        [selectedNotebook.id]: [entry, ...current],
      };
    });

    setNotebookDrafts((prev) => ({
      ...prev,
      [selectedNotebook.id]: defaultDraft(selectedNotebook.title),
    }));
    setIsCreatingNotebookEntry(false);
  };

  const exportSelectedNotebook = (): void => {
    const lines: string[] = [
      `# ${selectedDraft.title || selectedNotebook.title}`,
      "",
      selectedDraft.content || "_Пусто_",
      "",
    ];

    if (selectedDraft.imageUrl) {
      lines.push(`![image](${selectedDraft.imageUrl})`, "");
    }

    if (selectedDraft.gifUrl) {
      lines.push(`![gif](${selectedDraft.gifUrl})`, "");
    }

    const markdown = lines.join("\n");
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeTitle = (selectedDraft.title || selectedNotebook.title).replaceAll(/[^\wа-яА-Я-]+/g, "_");
    anchor.href = url;
    anchor.download = `${safeTitle}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const getCanvasPoint = (event: PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>): void => {
    if (!drawMode) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const point = getCanvasPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    setIsDrawing(true);
  };

  const draw = (event: PointerEvent<HTMLCanvasElement>): void => {
    if (!drawMode || !isDrawing) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const point = getCanvasPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const stopDrawing = (): void => {
    if (!drawMode) {
      return;
    }
    setIsDrawing(false);
  };

  const clearCanvas = (): void => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center growth-page">
        <RadialPulseLoader text="Загрузка раздела Записи..." size={120} color="#ffffff" />
      </div>
    );
  }

  return (
    <div className="growth-page min-h-screen">
      <div className="flex items-start justify-between px-8 pt-8 pb-6">
        <div>
          <Breadcrumbs crumbs={[{ label: "Главная", to: "/navigation" }, { label: "Записи" }]} />
        </div>
      </div>

      <div className="px-8 pb-28">
        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {activeTab === "calendar" ? (
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Месяц (по умолчанию)</h2>
              <p className="text-xs text-gray-400">Доступны режимы: день / неделя / месяц / год</p>
            </div>
            <div className="mb-3 grid grid-cols-7 gap-2 text-xs text-gray-500">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
                <div key={d} className="px-2 py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {monthCells.map((cell) => {
                if (cell.day == null || cell.dateKey == null) {
                  return <div key={cell.cellKey} className="min-h-[88px] rounded-xl border border-transparent" />;
                }

                const dayEntries = entriesByDate.get(cell.dateKey) ?? [];
                const firstEntry = dayEntries[0];
                const summary = firstEntry ? getShortText(firstEntry.title ?? firstEntry.description, 36) : "Нет записей";

                return (
                  <div
                    key={cell.dateKey}
                    className="min-h-[88px] rounded-xl border p-2"
                    style={{
                      borderColor: "rgba(255,255,255,0.12)",
                      background: dayEntries.length > 0 ? "rgba(96,165,250,0.12)" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div className="mb-1 text-xs text-gray-300">{cell.day}</div>
                    <div className="text-[11px] leading-snug text-gray-300">{summary}</div>
                    {dayEntries.length > 1 ? <div className="mt-1 text-[10px] text-gray-500">+{dayEntries.length - 1} записей</div> : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {activeTab === "notebooks" ? (
          <div className={isCreatingNotebookEntry ? "grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]" : "grid grid-cols-1 gap-4"}>
            <div className="rounded-2xl border p-3" style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
              <div className="flex items-center justify-between gap-2">
                <p className="px-1 text-xs text-gray-400">Дневники по сферам жизни</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                {notebooksBySphere.flatMap(([sphere, sphereNotebooks]) =>
                  sphereNotebooks.map((notebook) => {
                    const isActive = notebook.id === selectedNotebook.id;
                    return (
                      <button
                        key={notebook.id}
                        type="button"
                          onClick={() => {
                            setSelectedNotebookId(notebook.id);
                            setIsCreatingNotebookEntry(false);
                            navigate(`/records/notebook/${notebook.id}`);
                          }}
                        className="w-[170px] shrink-0 rounded-xl border p-2 text-left transition-all"
                        style={{
                          borderColor: isActive ? "rgba(148,187,255,0.75)" : "rgba(255,255,255,0.12)",
                          background: isActive ? "rgba(130,170,230,0.14)" : "rgba(255,255,255,0.03)",
                          boxShadow: isActive ? "0 0 0 1px rgba(148,187,255,0.25) inset" : "none",
                        }}
                      >
                        <p className="mb-1 text-[10px] font-medium text-white/75">{sphere}</p>
                        <div className={`mb-2 h-20 rounded-lg border border-zinc-800 ${notebook.coverClassName} relative overflow-hidden`}>
                          <span className="absolute right-2 top-2 text-[11px] text-white/80">★</span>
                          <span className="absolute bottom-2 left-2 text-[10px] font-medium text-white/95">{notebook.title}</span>
                        </div>
                        <p className="line-clamp-2 text-[10px] text-white/65">{notebook.subtitle}</p>
                      </button>
                    );
                  }),
                )}
              </div>
            </div>

            {isCreatingNotebookEntry ? (
              <div className="rounded-2xl border p-5" style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">{selectedNotebook.title}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={stopNotebookEntryCreation}
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-zinc-800/60"
                    >
                      Закрыть
                    </button>
                    <button
                      type="button"
                      onClick={persistSelectedNotebook}
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-800/60 px-3 py-2 text-xs text-white transition hover:bg-white/20"
                    >
                      <Save size={14} />
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={exportSelectedNotebook}
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-800/60 px-3 py-2 text-xs text-white transition hover:bg-white/20"
                    >
                      <Download size={14} />
                      Экспорт .md
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <input
                    value={selectedDraft.title}
                    onChange={(event) => updateSelectedDraft({ title: event.target.value })}
                    placeholder="Заголовок записи"
                    className="h-11 w-full rounded-xl border border-white/15 bg-[#070b22]/90 px-4 text-sm text-white outline-none placeholder:text-white/40"
                  />

                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "B", onClick: () => applyFormatting("**", "**") },
                      { label: "I", onClick: () => applyFormatting("*", "*") },
                      { label: "H1", onClick: () => applyFormatting("# ", "") },
                      { label: "•", onClick: () => applyFormatting("- ", "") },
                    ].map((tool) => (
                      <button
                        key={tool.label}
                        type="button"
                        onClick={tool.onClick}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white transition hover:bg-zinc-800/60"
                      >
                        <Type size={12} />
                        {tool.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    ref={textareaRef}
                    rows={10}
                    value={selectedDraft.content}
                    onChange={(event) => updateSelectedDraft({ content: event.target.value })}
                    placeholder="Пиши как в творческом дневнике: мысли, события, инсайты..."
                    className="impulse-scrollbar w-full resize-y rounded-xl border border-white/15 bg-[#070b22]/90 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40"
                  />

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 inline-flex items-center gap-1 text-xs text-gray-400">
                        <ImagePlus size={12} />
                        Изображение (URL)
                      </span>
                      <input
                        value={selectedDraft.imageUrl}
                        onChange={(event) => updateSelectedDraft({ imageUrl: event.target.value })}
                        placeholder="https://..."
                        className="h-10 w-full rounded-lg border border-white/15 bg-[#070b22]/90 px-3 text-xs text-white outline-none placeholder:text-white/40"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 inline-flex items-center gap-1 text-xs text-gray-400">
                        <ImagePlus size={12} />
                        GIF (URL)
                      </span>
                      <input
                        value={selectedDraft.gifUrl}
                        onChange={(event) => updateSelectedDraft({ gifUrl: event.target.value })}
                        placeholder="https://..."
                        className="h-10 w-full rounded-lg border border-white/15 bg-[#070b22]/90 px-3 text-xs text-white outline-none placeholder:text-white/40"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-zinc-800/80 bg-black/20 p-2">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs text-gray-400">Поле для рисования</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDrawMode((prev) => !prev)}
                            className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-white transition hover:bg-zinc-800/60"
                          >
                            {drawMode ? "Рисование: вкл." : "Рисование: выкл."}
                          </button>
                          <button
                            type="button"
                            onClick={clearCanvas}
                            className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-white transition hover:bg-zinc-800/60"
                          >
                            <Eraser size={10} />
                            Очистить
                          </button>
                        </div>
                      </div>
                      <canvas
                        ref={canvasRef}
                        width={560}
                        height={220}
                        onPointerDown={startDrawing}
                        onPointerMove={draw}
                        onPointerUp={stopDrawing}
                        onPointerLeave={stopDrawing}
                        className="h-[220px] w-full rounded-lg border border-zinc-800/80 bg-[#070b22]"
                      />
                    </div>

                    <div className="rounded-xl border border-zinc-800/80 bg-black/20 p-3">
                      <p className="mb-2 text-xs text-gray-400">Предпросмотр медиа</p>
                      {selectedDraft.imageUrl ? (
                        <img src={selectedDraft.imageUrl} alt="notebook media" className="mb-2 h-28 w-full rounded-lg object-cover" />
                      ) : (
                        <div className="mb-2 flex h-28 items-center justify-center rounded-lg border border-dashed border-zinc-800/80 text-xs text-gray-500">
                          Изображение не выбрано
                        </div>
                      )}
                      {selectedDraft.gifUrl ? (
                        <img src={selectedDraft.gifUrl} alt="notebook gif" className="h-28 w-full rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-zinc-800/80 text-xs text-gray-500">
                          GIF не выбран
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === "analytics" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4">
              <p className="mb-2 text-xs text-gray-500">Период аналитики</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "day", label: "День" },
                  { id: "week", label: "Неделя" },
                  { id: "month", label: "Месяц" },
                  { id: "year", label: "Год" },
                  { id: "all", label: "Всё время" },
                ].map((period) => {
                  const isActive = analyticsPeriod === period.id;
                  return (
                    <button
                      key={period.id}
                      type="button"
                      onClick={() => setAnalyticsPeriod(period.id as "day" | "week" | "month" | "year" | "all")}
                      className="rounded-xl border px-3 py-1.5 text-xs transition"
                      style={{
                        borderColor: isActive ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
                        background: isActive ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
                      }}
                    >
                      {period.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {insightsError ? (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4 text-sm text-rose-200">{insightsError}</div>
            ) : null}

            {insightsLoading ? (
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 text-sm text-gray-400">Собираем глубокую аналитику записей...</div>
            ) : null}

            {!insightsLoading && entryInsights ? (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Записей за период", value: String(entryInsights.total_entries) },
                    { label: "Активных дней", value: String(entryInsights.active_days) },
                    { label: "Ср. записей в активный день", value: String(entryInsights.average_entries_per_active_day) },
                    { label: "Ср. длина записи", value: `${entryInsights.average_text_length} симв.` },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border p-5"
                      style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}
                    >
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className="mt-3 text-3xl font-bold">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {[
                    { title: "Триггеры роста", items: entryInsights.growth_triggers },
                    { title: "Риски выгорания", items: entryInsights.burnout_triggers },
                    { title: "Повторяющиеся паттерны", items: entryInsights.repeating_patterns },
                  ].map((card) => (
                    <div key={card.title} className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4">
                      <p className="text-sm font-semibold">{card.title}</p>
                      <ul className="mt-3 space-y-2 text-xs text-gray-300">
                        {card.items.map((item) => (
                          <li key={`${card.title}-${item.label}`} className="flex items-center justify-between gap-3">
                            <span>{item.label}</span>
                            <span className="rounded-md border border-zinc-800/80 bg-black/20 px-2 py-0.5">{item.count}</span>
                          </li>
                        ))}
                        {card.items.length === 0 ? <li className="text-gray-500">Недостаточно данных</li> : null}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5">
                  <p className="text-xs text-gray-500">Самая сильная запись</p>
                  <p className="mt-2 text-base font-semibold">{entryInsights.strongest_entry_title || "Нет данных"}</p>
                  <p className="mt-1 text-xs text-gray-400">Интенсивность: {entryInsights.strongest_entry_length} символов</p>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {activeTab === "ai" ? (
          <div
            className="rounded-2xl border p-6"
            style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}
          >
            <h2 className="text-xl font-semibold">ИИ-чат</h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-400">
              Обсуди произошедшее, выдели главную мысль и сохрани новую запись напрямую из диалога.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => navigate("/chat")}
                className="inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-medium transition-all hover:opacity-90"
                style={{ background: "rgba(255,255,255,0.9)", color: "#000" }}
              >
                Перейти в чат
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="fixed bottom-4 left-1/2 z-20 -translate-x-1/2">
        <div
          className="flex items-center gap-1 rounded-2xl px-3 py-2"
          style={{
            background: "rgba(15, 15, 30, 0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          }}
        >
          {recordTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === "ai") {
                    navigate("/chat");
                    return;
                  }
                  setActiveTab(tab.id);
                }}
                className="flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all"
                style={{
                  background: isActive ? `${tab.color}22` : "transparent",
                  color: isActive ? tab.color : "rgba(255,255,255,0.5)",
                  minWidth: 64,
                }}
              >
                <Icon size={18} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
