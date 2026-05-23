import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlaskConical, GitFork, Move, Plus, Sparkles, Split, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Breadcrumbs from '@/components/Breadcrumbs';
import { virtualFieldsApi } from '@/lib/api-client';

type FieldNodeType = 'question' | 'answer';

interface FieldNode {
  id: string;
  parentId: string | null;
  type: FieldNodeType;
  text: string;
  x: number;
  y: number;
}

interface BranchInputState {
  [nodeId: string]: string;
}

interface DragState {
  nodeId: string;
  offsetX: number;
  offsetY: number;
}

interface VirtualFieldsState {
  nodes: FieldNode[];
  branchInputs: BranchInputState;
}

const VIRTUAL_FIELDS_STORAGE_KEY = 'delez_virtual_fields_v1';
const VIRTUAL_FIELDS_BOARD_ID = 'main';

function generateNodeId(): string {
  return `vf-${globalThis.crypto.randomUUID()}`;
}

function createEmptyRootQuestionNode(): FieldNode {
  return {
    id: generateNodeId(),
    parentId: null,
    type: 'question',
    text: '',
    x: 80,
    y: 120,
  };
}

function buildAiAnswer(question: string): string {
  const normalized = question.trim();
  if (!normalized) {
    return 'Сформулируй вопрос, и я помогу разложить возможные сценарии.';
  }

  return `Если идти по этому пути: "${normalized}", проверь 3 фактора — ресурсы, риски и точку невозврата. Начни с малого шага и зафиксируй признак успеха на 7 дней.`;
}

function extractTitle(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return 'Пустой узел';
  }
  if (trimmed.length <= 72) {
    return trimmed;
  }
  return `${trimmed.slice(0, 72)}...`;
}

function calculateBranchPosition(parent: FieldNode, siblingsCount: number): { x: number; y: number } {
  const baseX = parent.x + 360;
  const verticalOffset = (siblingsCount - 1) * 110;
  return {
    x: baseX,
    y: parent.y + verticalOffset,
  };
}

export default function VirtualFieldsPage() {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<FieldNode[]>([]);
  const [branchInputs, setBranchInputs] = useState<BranchInputState>({});
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [saveStatus, setSaveStatus] = useState<string>('Загрузка поля...');
  const [, setIsSyncing] = useState<boolean>(false);
  const [, setSyncError] = useState<string | null>(null);
  const [, setHistoryItems] = useState<Array<{
    version_id: string;
    board_id: string;
    changed_by: string;
    changed_at: string;
  }>>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isChatListVisible, setIsChatListVisible] = useState<boolean>(true);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadBoard = async () => {
      try {
        setIsSyncing(true);
        setSyncError(null);
        const board = await virtualFieldsApi.getBoard(VIRTUAL_FIELDS_BOARD_ID);
        setNodes(board.payload.nodes ?? []);
        setBranchInputs(board.payload.branchInputs ?? {});
        setSaveStatus('Поле загружено с сервера');
      } catch {
        try {
          const raw = localStorage.getItem(VIRTUAL_FIELDS_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as VirtualFieldsState;
            setNodes(parsed.nodes ?? []);
            setBranchInputs(parsed.branchInputs ?? {});
            setSaveStatus('Загружено из локального черновика');
          } else {
            setSaveStatus('Создай первое поле');
          }
        } catch {
          setSaveStatus('Создай первое поле');
        }
        setSyncError('Сервер поля недоступен, работаем локально.');
      } finally {
        setIsSyncing(false);
      }
    };

    void loadBoard();
  }, []);

  const loadBoardHistory = useCallback(() => {
    virtualFieldsApi
      .getBoardHistory(VIRTUAL_FIELDS_BOARD_ID)
      .then((data) => {
        setHistoryItems(data.items ?? []);
      })
      .catch(() => {
        setHistoryItems([]);
      });
  }, []);

  useEffect(() => {
    loadBoardHistory();
  }, [loadBoardHistory]);

  useEffect(() => {
    const nextState: VirtualFieldsState = { nodes, branchInputs };
    localStorage.setItem(VIRTUAL_FIELDS_STORAGE_KEY, JSON.stringify(nextState));

    const timer = window.setTimeout(async () => {
      try {
        await virtualFieldsApi.saveBoard({
          board_id: VIRTUAL_FIELDS_BOARD_ID,
          payload: {
            nodes,
            branchInputs,
          },
        });
        setSaveStatus('Изменения сохранены автоматически');
        setSyncError(null);
        loadBoardHistory();
      } catch {
        setSaveStatus('Сохранено локально: сервер недоступен');
      }
    }, 800);

    return () => window.clearTimeout(timer);
  }, [branchInputs, nodes, loadBoardHistory]);

  useEffect(() => {
    if (!saveStatus) {
      return;
    }
    const timer = window.setTimeout(() => setSaveStatus(''), 3000);
    return () => window.clearTimeout(timer);
  }, [saveStatus]);

  const edges = useMemo(() => {
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    return nodes
      .filter((node) => node.parentId)
      .map((node) => {
        const parent = node.parentId ? nodeMap.get(node.parentId) : null;
        if (!parent) {
          return null;
        }

        return {
          id: `${parent.id}-${node.id}`,
          from: parent,
          to: node,
        };
      })
      .filter((item): item is { id: string; from: FieldNode; to: FieldNode } => item !== null);
  }, [nodes]);

  const rootNodes = useMemo(() => nodes.filter((node) => node.parentId === null), [nodes]);
  const chatItems = useMemo(
    () =>
      rootNodes.map((node) => ({
        id: node.id,
        title: extractTitle(node.text),
      })),
    [rootNodes],
  );

  useEffect(() => {
    if (selectedChatId) {
      const exists = chatItems.some((chat) => chat.id === selectedChatId);
      if (exists) {
        return;
      }
    }
    setSelectedChatId(chatItems[0]?.id ?? null);
  }, [chatItems, selectedChatId]);

  const createBranch = (parentNodeId: string) => {
    const questionText = (branchInputs[parentNodeId] ?? '').trim();
    if (!questionText) {
      return;
    }

    const parentNode = nodes.find((node) => node.id === parentNodeId);
    if (!parentNode) {
      return;
    }

    const currentChildren = nodes.filter((node) => node.parentId === parentNodeId);
    const branchPosition = calculateBranchPosition(parentNode, currentChildren.length + 1);

    const questionNodeId = generateNodeId();
    const answerNodeId = generateNodeId();

    const questionNode: FieldNode = {
      id: questionNodeId,
      parentId: parentNodeId,
      type: 'question',
      text: questionText,
      x: branchPosition.x,
      y: branchPosition.y,
    };

    const answerNode: FieldNode = {
      id: answerNodeId,
      parentId: questionNodeId,
      type: 'answer',
      text: buildAiAnswer(questionText),
      x: branchPosition.x + 360,
      y: branchPosition.y,
    };

    setNodes((prev) => [...prev, questionNode, answerNode]);
    setBranchInputs((prev) => ({ ...prev, [parentNodeId]: '' }));
  };

  const deleteBranch = (nodeId: string) => {
    const removeIds = new Set<string>();
    const stack: string[] = [nodeId];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) {
        continue;
      }

      removeIds.add(current);
      const children = nodes.filter((node) => node.parentId === current).map((node) => node.id);
      for (const childId of children) {
        stack.push(childId);
      }
    }

    setNodes((prev) => prev.filter((node) => !removeIds.has(node.id)));
  };

  const getContainerPoint = (event: PointerEvent<HTMLDivElement>): { x: number; y: number } => {
    const container = canvasContainerRef.current;
    if (!container) {
      return { x: event.clientX, y: event.clientY };
    }

    const rect = container.getBoundingClientRect();
    return {
      x: event.clientX - rect.left + container.scrollLeft,
      y: event.clientY - rect.top + container.scrollTop,
    };
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>, node: FieldNode) => {
    const point = getContainerPoint(event);
    setDragState({
      nodeId: node.id,
      offsetX: point.x - node.x,
      offsetY: point.y - node.y,
    });
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragState) {
      return;
    }

    const point = getContainerPoint(event);
    const nextX = Math.max(20, point.x - dragState.offsetX);
    const nextY = Math.max(20, point.y - dragState.offsetY);

    setNodes((prev) =>
      prev.map((node) => {
        if (node.id !== dragState.nodeId) {
          return node;
        }
        return {
          ...node,
          x: nextX,
          y: nextY,
        };
      }),
    );
  };

  const stopDrag = () => {
    setDragState(null);
  };

  const updateNodeText = (nodeId: string, value: string) => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }
        return { ...node, text: value };
      }),
    );
  };

  const focusChatNode = (nodeId: string) => {
    setSelectedChatId(nodeId);
    const node = nodes.find((item) => item.id === nodeId);
    const container = canvasContainerRef.current;
    if (!node || !container) {
      return;
    }
    container.scrollTo({
      left: Math.max(node.x - 40, 0),
      top: Math.max(node.y - 40, 0),
      behavior: 'smooth',
    });
  };

  const createNewBoard = () => {
    const initialNode = createEmptyRootQuestionNode();
    setNodes([initialNode]);
    setBranchInputs({ [initialNode.id]: '' });
    setSelectedChatId(initialNode.id);
    setSyncError(null);
    setSaveStatus('Создана новая доска');
  };

  return (
    <div className="relative h-screen overflow-hidden bg-[#000019] text-white">
      <div className="h-full overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex items-start justify-between px-8 pt-8 pb-6">
        <div>
          <Breadcrumbs crumbs={[{ label: 'Главная', to: '/navigation' }, { label: 'Карта жизни', to: '/graph' }, { label: 'Виртуальные поля' }]} />
        </div>
        <button
          type="button"
          onClick={createNewBoard}
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/20"
        >
          Новая доска
        </button>
      </div>

      <div className="px-8 pb-16">
        <div className={`grid gap-4 ${isChatListVisible ? 'lg:grid-cols-[220px_minmax(0,1fr)]' : 'grid-cols-1'}`}>
          {isChatListVisible && (
            <aside className="rounded-2xl border border-white/10 bg-[rgba(10,10,25,0.86)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-white/70">Чаты</p>
                <button
                  type="button"
                  onClick={() => setIsChatListVisible(false)}
                  className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-white/80 transition hover:bg-white/10"
                >
                  Скрыть
                </button>
              </div>
              {chatItems.length === 0 ? (
                <p className="mt-3 text-xs text-white/45">Пока нет чатов</p>
              ) : (
                <div className="mt-3 space-y-1">
                  {chatItems.map((chat) => {
                    const isActive = chat.id === selectedChatId;
                    return (
                      <button
                        key={chat.id}
                        type="button"
                        onClick={() => focusChatNode(chat.id)}
                        className="w-full rounded-lg border px-2.5 py-2 text-left text-xs transition"
                        style={{
                          borderColor: isActive ? 'rgba(96,165,250,0.6)' : 'rgba(255,255,255,0.1)',
                          background: isActive ? 'rgba(96,165,250,0.18)' : 'rgba(255,255,255,0.04)',
                          color: isActive ? '#fff' : 'rgba(255,255,255,0.8)',
                        }}
                      >
                        {chat.title}
                      </button>
                    );
                  })}
                </div>
              )}
            </aside>
          )}

          <div
            ref={canvasContainerRef}
            className="relative overflow-auto rounded-2xl border border-white/10 bg-[rgba(10,10,25,0.86)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{ minHeight: 540 }}
            onPointerMove={moveDrag}
            onPointerUp={stopDrag}
            onPointerLeave={stopDrag}
          >
            {!isChatListVisible && (
              <button
                type="button"
                onClick={() => setIsChatListVisible(true)}
                className="absolute left-3 top-3 z-20 rounded-md border border-white/15 bg-[rgba(15,15,30,0.82)] px-2 py-1 text-[10px] text-white/85 transition hover:bg-[rgba(30,30,50,0.82)]"
              >
                Показать чаты
              </button>
            )}
          <svg className="absolute left-0 top-0 h-full w-full" style={{ minWidth: 1400, minHeight: 800 }}>
            {edges.map((edge) => (
              <line
                key={edge.id}
                x1={edge.from.x + 280}
                y1={edge.from.y + 54}
                x2={edge.to.x}
                y2={edge.to.y + 54}
                stroke="rgba(148, 187, 255, 0.55)"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            ))}
          </svg>

            <div className="relative" style={{ minWidth: 1400, minHeight: 800 }}>
              {nodes.map((node) => (
              <div
                key={node.id}
                className="absolute w-[280px] rounded-2xl border p-4 shadow-[0_8px_28px_rgba(0,0,0,0.35)]"
                style={{
                  left: node.x,
                  top: node.y,
                  borderColor: node.type === 'question' ? 'rgba(96,165,250,0.45)' : 'rgba(52,211,153,0.45)',
                  background: node.type === 'question' ? 'rgba(96,165,250,0.12)' : 'rgba(52,211,153,0.12)',
                }}
              >
                <div
                  className="mb-2 flex cursor-move items-center justify-between gap-2"
                  onPointerDown={(event) => startDrag(event, node)}
                >
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/80">
                    <Move size={12} />
                    {node.type === 'question' ? <Split size={12} /> : <Sparkles size={12} />}
                    {node.type === 'question' ? 'Вопрос' : 'Ответ ИИ'}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteBranch(node.id)}
                    className="rounded-md border border-white/15 bg-white/5 p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
                    title="Удалить ветку от этого узла"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <textarea
                  value={node.text}
                  onChange={(event) => updateNodeText(node.id, event.target.value)}
                  className="h-20 w-full resize-none rounded-lg border border-white/15 bg-[#070b22]/70 px-2 py-2 text-xs text-white outline-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                />
                <p className="mt-1 text-[10px] text-white/50">Кратко: {extractTitle(node.text)}</p>

                <div className="mt-3 space-y-2">
                  <input
                    value={branchInputs[node.id] ?? ''}
                    onChange={(event) =>
                      setBranchInputs((prev) => ({
                        ...prev,
                        [node.id]: event.target.value,
                      }))
                    }
                    placeholder="Вопрос в новую ветку..."
                    className="h-9 w-full rounded-lg border border-white/15 bg-[#070b22]/90 px-3 text-xs text-white outline-none placeholder:text-white/40"
                  />
                  <button
                    type="button"
                    onClick={() => createBranch(node.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white transition hover:bg-white/20"
                  >
                    <Plus size={12} />
                    Ветвить
                  </button>
                </div>
              </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Нижняя навигация */}
      <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
        <div
          className="flex items-center gap-1 rounded-2xl px-3 py-2"
          style={{
            background: 'rgba(15, 15, 30, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          }}
        >
          {[
            { label: 'Карта жизни', icon: GitFork, path: '/graph', color: '#60a5fa' },
            { label: 'Виртуальные поля', icon: FlaskConical, path: '/virtual-fields', color: '#fbbf24' },
          ].map(({ label, icon: Icon, path, color }) => {
            const isActive = path === '/virtual-fields';
            return (
              <button
                key={label}
                onClick={() => {
                  navigate(path);
                }}
                className="flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all"
                style={{
                  background: isActive ? `${color}22` : 'transparent',
                  color: isActive ? color : 'rgba(255,255,255,0.5)',
                  minWidth: 64,
                }}
              >
                <Icon size={18} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
