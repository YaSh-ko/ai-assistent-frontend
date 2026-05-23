import { useMemo, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowUp, ChevronLeft, Eraser, Image, Mic, PenLine, Sticker, X } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";

interface NotebookEntryCard {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  gifUrl: string;
  createdAt: string;
  attachments: NotebookAttachment[];
}

interface NotebookMeta {
  id: string;
  title: string;
  sphere: string;
}

interface NotebookDraft {
  title: string;
  content: string;
  imageUrl: string;
  gifUrl: string;
  bubbleColor: string;
  rotateDeg: number;
  fontSize: number;
  attachments: NotebookAttachment[];
}

interface StickerPosition {
  x: number;
  y: number;
}

interface PlacedGif {
  id: string;
  url: string;
  x: number;
  y: number;
  size: number;
  rotateDeg: number;
}

interface GifResizeSession {
  gifId: string;
  startX: number;
  startY: number;
  startSize: number;
}

interface GifRotateSession {
  gifId: string;
  centerX: number;
  centerY: number;
  startPointerAngle: number;
  startRotateDeg: number;
}

interface StickerRotateSession {
  centerX: number;
  centerY: number;
  startPointerAngle: number;
  startRotateDeg: number;
}

interface StickerResizeSession {
  startX: number;
  startY: number;
  startFontSize: number;
}

interface NotebookAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

interface GiphyImageVariant {
  url?: string;
}

interface GiphyGifImages {
  original?: GiphyImageVariant;
  fixed_height?: GiphyImageVariant;
}

interface GiphyGifItem {
  id: string;
  title: string;
  images?: GiphyGifImages;
}

interface GiphySearchResponse {
  data?: GiphyGifItem[];
  pagination?: {
    total_count?: number;
  };
}

interface GifSearchResult {
  id: string;
  title: string;
  previewUrl: string;
  originalUrl: string;
}

const NOTEBOOK_ENTRIES_STORAGE_KEY = "delez_notebook_entries_v1";
const GIPHY_PAGE_SIZE = 18;
const GIF_MIN_SIZE = 64;
const GIF_MAX_SIZE = 280;
const STICKER_MIN_FONT_SIZE = 28;
const STICKER_MAX_FONT_SIZE = 140;
const NOTEBOOKS: NotebookMeta[] = [
  { id: "study", title: "Учеба", sphere: "Учеба/Саморазвитие" },
  { id: "career", title: "Работа", sphere: "Работа/Карьера" },
  { id: "home", title: "Быт", sphere: "Личная жизнь/быт" },
  { id: "spirit", title: "Дух", sphere: "Мировоззрение/Дух" },
  { id: "society", title: "Общество", sphere: "Общественная деятельность" },
  { id: "friends", title: "Социум", sphere: "Социальная жизнь" },
  { id: "finance", title: "Финансы", sphere: "Финансовое благополучие" },
  { id: "hobby", title: "Хобби", sphere: "Хобби" },
];

function getPointerAngle(centerX: number, centerY: number, pointerX: number, pointerY: number): number {
  return (Math.atan2(pointerY - centerY, pointerX - centerX) * 180) / Math.PI;
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

function createEmptyDraft(): NotebookDraft {
  return {
    title: "",
    content: "",
    imageUrl: "",
    gifUrl: "",
    bubbleColor: "#58c15c",
    rotateDeg: -8,
    fontSize: 54,
    attachments: [],
  };
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error(`Не удалось прочитать файл: ${file.name}`));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => {
      reject(new Error(`Ошибка чтения файла: ${file.name}`));
    };
    reader.readAsDataURL(file);
  });
}

export default function NotebookEntriesPage() {
  const navigate = useNavigate();
  const { notebookId } = useParams<{ notebookId: string }>();
  const notebook = useMemo(() => NOTEBOOKS.find((item) => item.id === notebookId) ?? null, [notebookId]);

  const [entriesByNotebook, setEntriesByNotebook] = useState<Record<string, NotebookEntryCard[]>>(loadNotebookEntries());
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [draft, setDraft] = useState<NotebookDraft>(createEmptyDraft());
  const [stickerPosition, setStickerPosition] = useState<StickerPosition>({ x: 84, y: 220 });
  const [placedGifs, setPlacedGifs] = useState<PlacedGif[]>([]);
  const [selectedGifId, setSelectedGifId] = useState<string | null>(null);
  const [isStickerSelected, setIsStickerSelected] = useState<boolean>(false);
  const [isDraggingSticker, setIsDraggingSticker] = useState<boolean>(false);
  const [draggingGifId, setDraggingGifId] = useState<string | null>(null);
  const [gifResizeSession, setGifResizeSession] = useState<GifResizeSession | null>(null);
  const [gifRotateSession, setGifRotateSession] = useState<GifRotateSession | null>(null);
  const [stickerRotateSession, setStickerRotateSession] = useState<StickerRotateSession | null>(null);
  const [stickerResizeSession, setStickerResizeSession] = useState<StickerResizeSession | null>(null);
  const [stickerDragOffset, setStickerDragOffset] = useState<StickerPosition>({ x: 0, y: 0 });
  const [gifDragOffset, setGifDragOffset] = useState<StickerPosition>({ x: 0, y: 0 });
  const [drawMode, setDrawMode] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<"text" | "style" | "draw" | "media">("text");
  const [brushSize, setBrushSize] = useState<number>(6);
  const [isGifPickerOpen, setIsGifPickerOpen] = useState<boolean>(false);
  const fileUploadErrorRef = useRef<string | null>(null);
  const [giphyQuery, setGiphyQuery] = useState<string>("");
  const [giphyLoading, setGiphyLoading] = useState<boolean>(false);
  const [giphyError, setGiphyError] = useState<string | null>(null);
  const [giphyResults, setGiphyResults] = useState<GifSearchResult[]>([]);
  const [giphyOffset, setGiphyOffset] = useState<number>(0);
  const [giphyHasMore, setGiphyHasMore] = useState<boolean>(true);
  const [giphyMode, setGiphyMode] = useState<"trending" | "search">("trending");
  const [giphyActiveQuery, setGiphyActiveQuery] = useState<string>("");

  const editorStageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stickerRef = useRef<HTMLDivElement>(null);

  const entries = useMemo<NotebookEntryCard[]>(() => {
    if (!notebookId) {
      return [];
    }
    return entriesByNotebook[notebookId] ?? [];
  }, [entriesByNotebook, notebookId]);

  if (!notebook) {
    return (
      <div className="min-h-screen bg-[#000019] px-8 pt-8 text-white">
        <Breadcrumbs crumbs={[{ label: "Главная", to: "/navigation" }, { label: "Записи", to: "/records" }, { label: "Блокнот" }]} />
        <p className="mt-6 text-sm text-white/70">Блокнот не найден.</p>
      </div>
    );
  }

  const openCreate = (): void => {
    setDraft(createEmptyDraft());
    setStickerPosition({ x: 84, y: 220 });
    setPlacedGifs([]);
    setSelectedGifId(null);
    setIsStickerSelected(false);
    setActiveTool("text");
    setIsGifPickerOpen(false);
    fileUploadErrorRef.current = null;
    setDrawMode(false);
    setIsDrawing(false);
    setIsDraggingSticker(false);
    setDraggingGifId(null);
    setGifResizeSession(null);
    setGifRotateSession(null);
    setStickerRotateSession(null);
    setStickerResizeSession(null);
    setStickerDragOffset({ x: 0, y: 0 });
    setGifDragOffset({ x: 0, y: 0 });
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    setIsCreating(true);
  };

  const closeCreate = (): void => {
    setIsCreating(false);
  };

  const saveEntry = (): void => {
    const title = draft.title.trim() || notebook.title;
    const content = draft.content.trim();
    if (!content) {
      return;
    }

    const entry: NotebookEntryCard = {
      id: `entry-${globalThis.crypto.randomUUID()}`,
      title,
      content,
      imageUrl: draft.imageUrl.trim(),
      gifUrl: (placedGifs[0]?.url ?? draft.gifUrl).trim(),
      createdAt: new Date().toISOString(),
      attachments: draft.attachments,
    };
    const current = entriesByNotebook[notebook.id] ?? [];
    const nextState: Record<string, NotebookEntryCard[]> = {
      ...entriesByNotebook,
      [notebook.id]: [entry, ...current],
    };
    setEntriesByNotebook(nextState);
    saveNotebookEntries(nextState);
    setIsCreating(false);
  };

  const uploadFiles = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    fileUploadErrorRef.current = null;
    try {
      const selectedFiles = Array.from(files);
      const uploaded = await Promise.all(
        selectedFiles.map(async (file) => ({
          id: `att-${globalThis.crypto.randomUUID()}`,
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          dataUrl: await readFileAsDataUrl(file),
        })),
      );

      setDraft((prev) => {
        let nextDraft: NotebookDraft = {
          ...prev,
          attachments: [...prev.attachments, ...uploaded],
        };
        const firstVisual = uploaded.find((item) => item.type.startsWith("image/"));
        if (firstVisual) {
          if (firstVisual.type === "image/gif") {
            nextDraft = { ...nextDraft, gifUrl: firstVisual.dataUrl };
          } else {
            nextDraft = { ...nextDraft, imageUrl: firstVisual.dataUrl };
          }
        }
        return nextDraft;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось загрузить файл";
      fileUploadErrorRef.current = message;
    } finally {
      event.target.value = "";
    }
  };

  const startStickerDrag = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const stage = editorStageRef.current;
    if (!stage) {
      return;
    }
    const rect = stage.getBoundingClientRect();
    setStickerDragOffset({
      x: event.clientX - rect.left - stickerPosition.x,
      y: event.clientY - rect.top - stickerPosition.y,
    });
    setIsStickerSelected(true);
    setSelectedGifId(null);
    setDraggingGifId(null);
    setGifResizeSession(null);
    setGifRotateSession(null);
    setStickerRotateSession(null);
    setStickerResizeSession(null);
    setIsDraggingSticker(true);
  };

  const startGifDrag = (event: ReactPointerEvent<HTMLDivElement>, gifId: string, position: StickerPosition): void => {
    const stage = editorStageRef.current;
    if (!stage) {
      return;
    }
    const rect = stage.getBoundingClientRect();
    setGifDragOffset({
      x: event.clientX - rect.left - position.x,
      y: event.clientY - rect.top - position.y,
    });
    setIsDraggingSticker(false);
    setIsStickerSelected(false);
    setSelectedGifId(gifId);
    setGifResizeSession(null);
    setGifRotateSession(null);
    setStickerRotateSession(null);
    setStickerResizeSession(null);
    setDraggingGifId(gifId);
  };

  const startGifResize = (event: ReactPointerEvent<HTMLButtonElement>, gifId: string, size: number): void => {
    event.stopPropagation();
    setIsDraggingSticker(false);
    setIsStickerSelected(false);
    setDraggingGifId(null);
    setGifRotateSession(null);
    setStickerRotateSession(null);
    setStickerResizeSession(null);
    setSelectedGifId(gifId);
    setGifResizeSession({
      gifId,
      startX: event.clientX,
      startY: event.clientY,
      startSize: size,
    });
  };

  const startGifRotate = (
    event: ReactPointerEvent<HTMLButtonElement>,
    gifId: string,
    x: number,
    y: number,
    size: number,
    rotateDeg: number,
  ): void => {
    event.stopPropagation();
    const stage = editorStageRef.current;
    if (!stage) {
      return;
    }
    const rect = stage.getBoundingClientRect();
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    setIsDraggingSticker(false);
    setIsStickerSelected(false);
    setDraggingGifId(null);
    setGifResizeSession(null);
    setStickerRotateSession(null);
    setStickerResizeSession(null);
    setSelectedGifId(gifId);
    setGifRotateSession({
      gifId,
      centerX,
      centerY,
      startPointerAngle: getPointerAngle(centerX, centerY, pointerX, pointerY),
      startRotateDeg: rotateDeg,
    });
  };

  const startStickerRotate = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    const stage = editorStageRef.current;
    const stickerElement = stickerRef.current;
    if (!stage || !stickerElement) {
      return;
    }
    const stageRect = stage.getBoundingClientRect();
    const stickerRect = stickerElement.getBoundingClientRect();
    const centerX = stickerRect.left - stageRect.left + stickerRect.width / 2;
    const centerY = stickerRect.top - stageRect.top + stickerRect.height / 2;
    const pointerX = event.clientX - stageRect.left;
    const pointerY = event.clientY - stageRect.top;
    setIsDraggingSticker(false);
    setSelectedGifId(null);
    setIsStickerSelected(true);
    setDraggingGifId(null);
    setGifResizeSession(null);
    setGifRotateSession(null);
    setStickerResizeSession(null);
    setStickerRotateSession({
      centerX,
      centerY,
      startPointerAngle: getPointerAngle(centerX, centerY, pointerX, pointerY),
      startRotateDeg: draft.rotateDeg,
    });
  };

  const startStickerResize = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    setIsDraggingSticker(false);
    setSelectedGifId(null);
    setIsStickerSelected(true);
    setDraggingGifId(null);
    setGifResizeSession(null);
    setGifRotateSession(null);
    setStickerRotateSession(null);
    setStickerResizeSession({
      startX: event.clientX,
      startY: event.clientY,
      startFontSize: draft.fontSize,
    });
  };

  const handleGifRotateMove = (rect: DOMRect, event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!gifRotateSession) return;
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const currentAngle = getPointerAngle(gifRotateSession.centerX, gifRotateSession.centerY, pointerX, pointerY);
    const nextRotateDeg = gifRotateSession.startRotateDeg + (currentAngle - gifRotateSession.startPointerAngle);
    setPlacedGifs((prev) =>
      prev.map((gif) => (gif.id === gifRotateSession.gifId ? { ...gif, rotateDeg: nextRotateDeg } : gif)),
    );
  };

  const handleStickerRotateMove = (rect: DOMRect, event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!stickerRotateSession) return;
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const currentAngle = getPointerAngle(stickerRotateSession.centerX, stickerRotateSession.centerY, pointerX, pointerY);
    setDraft((prev) => ({
      ...prev,
      rotateDeg: stickerRotateSession.startRotateDeg + (currentAngle - stickerRotateSession.startPointerAngle),
    }));
  };

  const handleStickerResizeMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!stickerResizeSession) return;
    const deltaX = event.clientX - stickerResizeSession.startX;
    const deltaY = event.clientY - stickerResizeSession.startY;
    const nextFontSize = Math.max(
      STICKER_MIN_FONT_SIZE,
      Math.min(STICKER_MAX_FONT_SIZE, stickerResizeSession.startFontSize + Math.max(deltaX, deltaY) * 0.18),
    );
    setDraft((prev) => ({ ...prev, fontSize: nextFontSize }));
  };

  const handleGifResizeMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!gifResizeSession) return;
    const deltaX = event.clientX - gifResizeSession.startX;
    const deltaY = event.clientY - gifResizeSession.startY;
    const nextSize = Math.max(GIF_MIN_SIZE, Math.min(GIF_MAX_SIZE, gifResizeSession.startSize + Math.max(deltaX, deltaY)));
    setPlacedGifs((prev) =>
      prev.map((gif) => (gif.id === gifResizeSession.gifId ? { ...gif, size: nextSize } : gif)),
    );
  };

  const handleGifDragMove = (rect: DOMRect, event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!draggingGifId) return;
    setPlacedGifs((prev) =>
      prev.map((gif) =>
        gif.id === draggingGifId
          ? {
              ...gif,
              x: Math.max(12, event.clientX - rect.left - gifDragOffset.x),
              y: Math.max(18, event.clientY - rect.top - gifDragOffset.y),
            }
          : gif,
      ),
    );
  };

  const handleStickerDragMove = (rect: DOMRect, event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!isDraggingSticker) return;
    setStickerPosition({
      x: Math.max(12, event.clientX - rect.left - stickerDragOffset.x),
      y: Math.max(18, event.clientY - rect.top - stickerDragOffset.y),
    });
  };

  const handleDrawMove = (rect: DOMRect, event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!drawMode || !isDrawing) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    context.stroke();
  };

  const moveInteractions = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const stage = editorStageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();

    if (gifRotateSession) { handleGifRotateMove(rect, event); return; }
    if (stickerRotateSession) { handleStickerRotateMove(rect, event); return; }
    if (stickerResizeSession) { handleStickerResizeMove(event); return; }
    if (gifResizeSession) { handleGifResizeMove(event); return; }
    if (draggingGifId) { handleGifDragMove(rect, event); return; }
    if (isDraggingSticker) { handleStickerDragMove(rect, event); return; }
    handleDrawMove(rect, event);
  };

  const stopInteractions = (): void => {
    setIsDraggingSticker(false);
    setDraggingGifId(null);
    setGifResizeSession(null);
    setGifRotateSession(null);
    setStickerRotateSession(null);
    setStickerResizeSession(null);
    if (drawMode) {
      setIsDrawing(false);
    }
  };

  const startDrawing = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    if (!drawMode) {
      return;
    }
    const stage = editorStageRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!stage || !canvas || !context) {
      return;
    }
    const rect = stage.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    context.lineWidth = brushSize;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = draft.bubbleColor;
    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
  };

  const clearDrawing = (): void => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const mapGiphyPayload = (payload: GiphySearchResponse): GifSearchResult[] => {
    return (payload.data ?? [])
      .map((item) => {
        const previewUrl = item.images?.fixed_height?.url ?? "";
        const originalUrl = item.images?.original?.url ?? "";
        if (!previewUrl || !originalUrl) {
          return null;
        }
        return {
          id: item.id,
          title: item.title,
          previewUrl,
          originalUrl,
        };
      })
      .filter((item): item is GifSearchResult => item !== null);
  };

  const searchGifs = async (): Promise<void> => {
    const query = giphyQuery.trim();
    if (!query) {
      setGiphyError("Введи запрос для поиска GIF.");
      setGiphyResults([]);
      return;
    }

    const apiKey = import.meta.env.VITE_GIPHY_API_KEY;
    if (!apiKey) {
      setGiphyError("Не задан VITE_GIPHY_API_KEY. Добавь ключ GIPHY в .env.");
      setGiphyResults([]);
      return;
    }

    setGiphyLoading(true);
    setGiphyError(null);
    try {
      const endpoint = `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&limit=${GIPHY_PAGE_SIZE}&offset=0&rating=pg-13&lang=ru`;
      const response = await fetch(endpoint, { method: "GET" });
      if (!response.ok) {
        throw new Error(`GIPHY search failed: ${response.status}`);
      }
      const payload = (await response.json()) as GiphySearchResponse;
      const mapped = mapGiphyPayload(payload);
      setGiphyResults(mapped);
      setGiphyMode("search");
      setGiphyActiveQuery(query);
      setGiphyOffset(mapped.length);
      const total = Number(payload.pagination?.total_count ?? mapped.length);
      setGiphyHasMore(mapped.length < total);
      if (mapped.length === 0) {
        setGiphyError("По запросу ничего не найдено.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка поиска GIF";
      setGiphyError(message);
      setGiphyResults([]);
    } finally {
      setGiphyLoading(false);
    }
  };

  const loadTrendingGifs = async (): Promise<void> => {
    const apiKey = import.meta.env.VITE_GIPHY_API_KEY;
    if (!apiKey) {
      setGiphyError("Не задан VITE_GIPHY_API_KEY. Добавь ключ GIPHY в .env.");
      setGiphyResults([]);
      return;
    }

    setGiphyLoading(true);
    setGiphyError(null);
    try {
      const endpoint = `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(apiKey)}&limit=${GIPHY_PAGE_SIZE}&offset=0&rating=pg-13`;
      const response = await fetch(endpoint, { method: "GET" });
      if (!response.ok) {
        throw new Error(`GIPHY trending failed: ${response.status}`);
      }
      const payload = (await response.json()) as GiphySearchResponse;
      const mapped = mapGiphyPayload(payload);
      setGiphyResults(mapped);
      setGiphyMode("trending");
      setGiphyActiveQuery("");
      setGiphyOffset(mapped.length);
      const total = Number(payload.pagination?.total_count ?? mapped.length);
      setGiphyHasMore(mapped.length < total);
      if (mapped.length === 0) {
        setGiphyError("Каталог GIF пуст.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка загрузки каталога GIF";
      setGiphyError(message);
      setGiphyResults([]);
    } finally {
      setGiphyLoading(false);
    }
  };

  const loadMoreGifs = async (): Promise<void> => {
    if (giphyLoading || !giphyHasMore) {
      return;
    }

    const apiKey = import.meta.env.VITE_GIPHY_API_KEY;
    if (!apiKey) {
      return;
    }

    setGiphyLoading(true);
    try {
      const endpoint =
        giphyMode === "search"
          ? `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(giphyActiveQuery)}&limit=${GIPHY_PAGE_SIZE}&offset=${giphyOffset}&rating=pg-13&lang=ru`
          : `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(apiKey)}&limit=${GIPHY_PAGE_SIZE}&offset=${giphyOffset}&rating=pg-13`;
      const response = await fetch(endpoint, { method: "GET" });
      if (!response.ok) {
        throw new Error(`GIPHY load more failed: ${response.status}`);
      }
      const payload = (await response.json()) as GiphySearchResponse;
      const mapped = mapGiphyPayload(payload);
      const nextOffset = giphyOffset + mapped.length;
      setGiphyResults((prev) => [...prev, ...mapped]);
      setGiphyOffset(nextOffset);
      const total = Number(payload.pagination?.total_count ?? nextOffset);
      setGiphyHasMore(nextOffset < total);
    } catch {
      setGiphyHasMore(false);
    } finally {
      setGiphyLoading(false);
    }
  };

  if (isCreating) {
    return (
      <div className="h-screen overflow-hidden bg-[#0a0d21] text-white">
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-white/10 bg-black/25 px-4 py-3 backdrop-blur-md">
            <button
              type="button"
              onClick={closeCreate}
              className="inline-flex items-center gap-2 text-base font-medium text-white/90"
            >
              <ChevronLeft size={20} />
              {notebook.title}
            </button>
            <div />
          </header>

          <div
            ref={editorStageRef}
            className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_18%_20%,#d97e5b_0%,transparent_38%),radial-gradient(circle_at_52%_52%,#7f2f89_0%,transparent_58%),radial-gradient(circle_at_78%_88%,#214d86_0%,transparent_50%),#221b42]"
            onPointerMove={moveInteractions}
            onPointerUp={stopInteractions}
            onPointerLeave={stopInteractions}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.22)_100%)]" />
            {draft.imageUrl ? (
              <img src={draft.imageUrl} alt="sticker" className="pointer-events-none absolute bottom-24 right-10 h-24 w-24 rounded-xl object-cover opacity-90" />
            ) : null}

            <canvas
              ref={canvasRef}
              width={1280}
              height={920}
              onPointerDown={startDrawing}
              className="absolute inset-0 h-full w-full"
            />

            {placedGifs.map((gif) => (
              <div
                key={gif.id}
                onPointerDown={(event) => startGifDrag(event, gif.id, { x: gif.x, y: gif.y })}
                className={`absolute cursor-move overflow-hidden rounded-xl border shadow-[0_12px_24px_rgba(0,0,0,0.35)] ${
                  selectedGifId === gif.id ? "border-cyan-300/90" : "border-white/15"
                }`}
                style={{
                  left: gif.x,
                  top: gif.y,
                  width: gif.size,
                  height: gif.size,
                  transform: `rotate(${gif.rotateDeg}deg)`,
                }}
              >
                <img src={gif.url} alt="gif" className="h-full w-full object-cover" />
                {selectedGifId === gif.id ? (
                  <>
                    <button
                      type="button"
                      onPointerDown={(event) => startGifResize(event, gif.id, gif.size)}
                      className="absolute bottom-1 right-1 h-5 w-5 cursor-nwse-resize rounded-full border border-white/70 bg-black/45 text-white/90"
                      aria-label="Изменить размер GIF"
                      title="Потяни для изменения размера"
                    />
                    <button
                      type="button"
                      onPointerDown={(event) => startGifRotate(event, gif.id, gif.x, gif.y, gif.size, gif.rotateDeg)}
                      className="absolute -top-2 right-1 h-5 w-5 cursor-grab rounded-full border border-cyan-200/80 bg-cyan-400/25"
                      aria-label="Повернуть GIF"
                      title="Потяни для поворота"
                    />
                  </>
                ) : null}
              </div>
            ))}

            {draft.content.trim() ? (
              <div
                ref={stickerRef}
                onPointerDown={startStickerDrag}
                className={`absolute max-w-[72%] cursor-move rounded-[18px] px-4 py-3 text-4xl font-bold leading-tight text-white shadow-[0_18px_40px_rgba(0,0,0,0.4)] ${
                  isStickerSelected ? "ring-2 ring-cyan-300/70" : ""
                }`}
                style={{
                  left: stickerPosition.x,
                  top: stickerPosition.y,
                  background: draft.bubbleColor,
                  transform: `rotate(${draft.rotateDeg}deg)`,
                  fontSize: `${draft.fontSize}px`,
                }}
              >
                {draft.content}
                {isStickerSelected ? (
                  <>
                    <button
                      type="button"
                      onPointerDown={startStickerRotate}
                      className="absolute -top-3 right-2 h-6 w-6 cursor-grab rounded-full border border-cyan-200/85 bg-cyan-400/30"
                      aria-label="Повернуть надпись"
                      title="Потяни для поворота надписи"
                    />
                    <button
                      type="button"
                      onPointerDown={startStickerResize}
                      className="absolute -bottom-3 right-2 h-6 w-6 cursor-nwse-resize rounded-full border border-white/80 bg-black/45"
                      aria-label="Изменить размер надписи"
                      title="Потяни для изменения размера надписи"
                    />
                  </>
                ) : null}
              </div>
            ) : (
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-white/45">
                Начни писать текст в поле Aa снизу
              </div>
            )}

          </div>

          <div className="relative border-t border-white/10 bg-[rgba(9,14,36,0.96)] px-4 pt-3 pb-4 backdrop-blur-md transition-all duration-300 ease-out">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(event) => {
                void uploadFiles(event);
              }}
              className="hidden"
            />

            {(activeTool === "style" || activeTool === "draw") ? (
              <div className="mb-3 rounded-2xl border border-white/12 bg-black/25 p-3">
                {activeTool === "style" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {["#ffffff", "#000000", "#4aa3ff", "#58c15c", "#7c7cff", "#e65bd8", "#ff8ea1"].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setDraft({ ...draft, bubbleColor: color })}
                          className="h-8 w-8 rounded-full border border-white/25"
                          style={{ background: color }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/70">
                      Размер{' '}
                      <input
                        type="range"
                        min={28}
                        max={72}
                        value={draft.fontSize}
                        onChange={(event) => setDraft({ ...draft, fontSize: Number(event.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/70">
                      Поворот{' '}
                      <input
                        type="range"
                        min={-30}
                        max={30}
                        value={draft.rotateDeg}
                        onChange={(event) => setDraft({ ...draft, rotateDeg: Number(event.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                ) : null}

                {activeTool === "draw" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDrawMode((prev) => !prev)}
                        className={`rounded-xl px-3 py-2 text-xs font-medium ${drawMode ? "bg-emerald-500/25 text-emerald-200" : "bg-white/10 text-white/80"}`}
                      >
                        {drawMode ? "Кисть включена" : "Включить кисть"}
                      </button>
                      <button
                        type="button"
                        onClick={clearDrawing}
                        className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs text-white/80"
                      >
                        <Eraser size={12} />
                        Ластик
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/70">
                      Толщина кисти{' '}
                      <input
                        type="range"
                        min={2}
                        max={14}
                        value={brushSize}
                        onChange={(event) => setBrushSize(Number(event.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                ) : null}

              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-2xl bg-[#1a2447]/80 px-3 py-2">
                <input
                  value={draft.content}
                  onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                  placeholder=""
                  className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/45"
                />
                <button
                  type="button"
                  onClick={() => setActiveTool("text")}
                  className="rounded-full p-1 text-white/75 transition hover:bg-white/10"
                  title="Голос"
                  aria-label="Голос"
                >
                  <Mic size={16} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTool("media");
                  fileInputRef.current?.click();
                }}
                className="rounded-full p-2 text-white/85 transition hover:bg-white/10"
                title="Изображения"
                aria-label="Изображения"
              >
                <Image size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTool("draw");
                  setDrawMode(true);
                }}
                className="rounded-full p-2 text-white/85 transition hover:bg-white/10"
                title="Рисование"
                aria-label="Рисование"
              >
                <PenLine size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTool("media");
                  setIsGifPickerOpen(true);
                  void loadTrendingGifs();
                }}
                className="rounded-full p-2 text-white/85 transition hover:bg-white/10"
                title="GIF/стикеры"
                aria-label="GIF/стикеры"
              >
                <Sticker size={18} />
              </button>
              <button
                type="button"
                onClick={saveEntry}
                disabled={!draft.content.trim()}
                className={`rounded-full p-2 transition ${
                  draft.content.trim()
                    ? "bg-[#3b82f6] text-white hover:bg-[#2563eb]"
                    : "bg-white/10 text-white/35"
                }`}
                title="Отправить"
                aria-label="Отправить"
              >
                <ArrowUp size={18} />
              </button>
            </div>
          </div>

          {isGifPickerOpen ? (
            <div className="absolute inset-0 z-40 flex items-end bg-black/55 backdrop-blur-sm">
              <div className="w-full rounded-t-3xl border border-white/15 bg-[linear-gradient(180deg,rgba(21,24,46,0.98)_0%,rgba(12,16,33,0.99)_100%)] px-4 pt-3 pb-4 shadow-[0_-20px_60px_rgba(0,0,0,0.5)]">
                <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/20" />

                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">GIF и стикеры</p>
                  <button
                    type="button"
                    onClick={() => setIsGifPickerOpen(false)}
                    className="rounded-full border border-white/15 bg-white/5 p-2 text-white/80 transition hover:bg-white/15"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="mb-3 flex gap-2">
                  <input
                    value={giphyQuery}
                    onChange={(event) => setGiphyQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void searchGifs();
                      }
                    }}
                    placeholder="Поиск GIF"
                    className="h-10 w-full rounded-xl border border-white/15 bg-[#070b22]/80 px-3 text-sm text-white outline-none placeholder:text-white/40"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void searchGifs();
                    }}
                    disabled={giphyLoading}
                    className="rounded-xl border border-white/20 bg-white/10 px-4 text-xs text-white transition hover:bg-white/20 disabled:opacity-50"
                  >
                    {giphyLoading ? "..." : "Найти"}
                  </button>
                </div>

                {giphyError ? <p className="mb-2 text-[11px] text-rose-300">{giphyError}</p> : null}
                <div
                  className="grid max-h-[42vh] grid-cols-3 gap-2 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  onScroll={(event) => {
                    const target = event.currentTarget;
                    const remainingHeight = target.scrollHeight - target.scrollTop - target.clientHeight;
                    if (remainingHeight < 120) {
                      void loadMoreGifs();
                    }
                  }}
                >
                  {giphyResults.map((gif) => (
                    <button
                      key={`picker-${gif.id}`}
                      type="button"
                      onClick={() => {
                        const nextGifId = `gif-${globalThis.crypto.randomUUID()}`;
                        setPlacedGifs((prev) => [
                          ...prev,
                          {
                            id: nextGifId,
                            url: gif.originalUrl,
                            x: 24 + (prev.length % 4) * 92,
                            y: 28 + Math.floor(prev.length / 4) * 82,
                            size: 112,
                            rotateDeg: 0,
                          },
                        ]);
                        setSelectedGifId(nextGifId);
                        setDraft((prev) => ({
                          ...prev,
                          gifUrl: prev.gifUrl || gif.originalUrl,
                        }));
                      }}
                      className="overflow-hidden rounded-md border border-white/10 transition hover:border-white/35"
                      title={gif.title}
                    >
                      <img src={gif.previewUrl} alt={gif.title} className="h-20 w-full object-cover" />
                    </button>
                  ))}
                </div>
                {!giphyLoading && !giphyError && giphyResults.length === 0 ? (
                  <p className="pt-3 text-center text-xs text-white/45">Введи запрос и нажми «Найти»</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000019] px-8 pt-8 pb-24 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumbs crumbs={[{ label: "Главная", to: "/navigation" }, { label: "Записи", to: "/records" }, { label: notebook.title }]} />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20"
        >
          Создать запись
        </button>
      </div>

      <div className="mt-6">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-sm text-white/55">
            Пока нет записей в этом блокноте.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => navigate(`/chat?source=notebook&notebook=${notebook.id}&entry=${entry.id}`)}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.06]"
              >
                <p className="text-sm font-semibold text-white">{entry.title}</p>
                <p className="mt-2 line-clamp-4 text-sm text-white/75">{entry.content}</p>
                {entry.attachments && entry.attachments.length > 0 ? (
                  <p className="mt-2 text-xs text-white/55">Файлов: {entry.attachments.length}</p>
                ) : null}
                <p className="mt-3 text-xs text-white/45">{new Date(entry.createdAt).toLocaleString("ru-RU")}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
