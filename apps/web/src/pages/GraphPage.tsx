// src/pages/GraphPage.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { ChevronDown, GitFork, FlaskConical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Breadcrumbs from '@/components/Breadcrumbs';
import RadialPulseLoader from '@/components/ui/loading-animation';
import { graphApi } from '@/lib/api-client';

// Цвета по типу узла
const NODE_COLORS: Record<string, string> = {
  Entry: '#60a5fa',       // blue
  Concept: '#a78bfa',     // purple
  Goal: '#34d399',        // green
  Experiment: '#fbbf24',  // yellow
  Analysis: '#f87171',    // red
  Topic: '#fb923c',       // orange
};

const NODE_TYPES = ['Entry', 'Concept', 'Goal', 'Experiment', 'Analysis', 'Topic'];
const NODE_TYPE_LABELS: Record<string, string> = {
  Entry: 'События',
  Concept: 'Концепты',
  Goal: 'Цели/Желания',
  Experiment: 'Эксперименты',
  Analysis: 'Анализы',
  Topic: 'Темы',
};
const TIME_PERIODS = [
  { label: 'Прошлое', value: 'past' },
  { label: 'Актуальное', value: 'present' },
  { label: 'Будущее', value: 'future' },
  { label: 'Пути развития', value: 'development' },
];

interface GraphNode {
  id: string;
  type: string;
  description: string;
  user: string;
  [key: string]: unknown;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: string | null;
  reason?: string | null;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface LinkCoords {
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
}

const RELATIONSHIP_TYPES = ['RELATED', 'MENTIONS', 'EVOLVESINTO', 'DOCUMENTS', 'INFLUENCES'];
const RELATIONSHIP_TYPE_LABELS: Record<string, string> = {
  RELATED: 'Связано',
  MENTIONS: 'Упоминает',
  EVOLVESINTO: 'Переходит в',
  DOCUMENTS: 'Документирует',
  INFLUENCES: 'Влияет на',
};
const RELATION_AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: 'Создание',
  UPDATE: 'Обновление',
  DELETE: 'Удаление',
  ROLLBACK: 'Откат',
};

interface SelectOption {
  value: string;
  label: string;
}

interface GraphSelectProps {
  readonly id?: string;
  readonly value: string;
  readonly options: SelectOption[];
  readonly onChange: (nextValue: string) => void;
  readonly placeholder: string;
}

function GraphSelect({ id, value, options, onChange, placeholder }: GraphSelectProps): React.JSX.Element {
  const selectedOption = options.find((option) => option.value === value);
  const visibleLabel = selectedOption?.label ?? placeholder;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          id={id}
          type="button"
          className="flex w-full items-center justify-between rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-left text-xs text-white outline-none transition hover:bg-black/40"
        >
          <span className="truncate">{visibleLabel}</span>
          <ChevronDown size={13} className="ml-2 shrink-0 text-[#b6c2db]" strokeWidth={1.45} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="max-h-64 w-[var(--radix-popper-anchor-width)] min-w-[var(--radix-popper-anchor-width)] overflow-y-auto border border-white/15 bg-[#070b22]/98 p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value || '__empty-option__'}
              value={option.value}
              className="text-xs text-white/90 focus:bg-white/10 data-[state=checked]:bg-[#2563eb]/75 data-[state=checked]:text-white"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function resolveNodeId(value: string | GraphNode): string {
  if (typeof value === 'string') {
    return value;
  }

  return value.id;
}

function buildTextSprite(message: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas context is not available');
  }

  const fontSize = 48;
  const horizontalPadding = 24;
  const verticalPadding = 16;
  context.font = `${fontSize}px Inter, Arial, sans-serif`;
  const textWidth = Math.ceil(context.measureText(message).width);
  const width = textWidth + horizontalPadding * 2;
  const height = fontSize + verticalPadding * 2;

  canvas.width = width;
  canvas.height = height;

  context.clearRect(0, 0, width, height);
  context.fillStyle = 'rgba(8, 8, 18, 0.82)';
  context.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(0, 0, width, height, 18);
  context.fill();
  context.stroke();

  context.font = `${fontSize}px Inter, Arial, sans-serif`;
  context.fillStyle = color;
  context.textBaseline = 'middle';
  context.fillText(message, horizontalPadding, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(24, 8, 1);
  return sprite;
}

function normalizePoint(node: unknown): { x: number; y: number; z: number } {
  if (typeof node !== 'object' || node == null) {
    return { x: 0, y: 0, z: 0 };
  }

  const point = node as { x?: number; y?: number; z?: number };
  return {
    x: point.x ?? 0,
    y: point.y ?? 0,
    z: point.z ?? 0,
  };
}

function extractLinkCoords(link: unknown): LinkCoords {
  if (typeof link !== 'object' || link == null) {
    return {
      start: { x: 0, y: 0, z: 0 },
      end: { x: 0, y: 0, z: 0 },
    };
  }

  const source = (link as { source?: unknown }).source;
  const target = (link as { target?: unknown }).target;
  return {
    start: normalizePoint(source),
    end: normalizePoint(target),
  };
}

// Helper: Build nodes map by ID
function buildNodesMap(graphData: GraphData | null): Map<string, GraphNode> {
  const map = new Map<string, GraphNode>();
  if (!graphData) return map;
  for (const node of graphData.nodes) {
    map.set(node.id, node);
  }
  return map;
}

// Helper: Build relationships list from graph data
function buildRelationshipsList(
  graphData: GraphData | null,
  nodesById: Map<string, GraphNode>
): Array<{
  id: string;
  sourceId: string;
  targetId: string;
  sourceLabel: string;
  targetLabel: string;
  type: string;
  reason: string;
}> {
  if (!graphData) return [];
  
  return graphData.links.map((link, index) => {
    const sourceId = resolveNodeId(link.source);
    const targetId = resolveNodeId(link.target);
    const sourceNode = nodesById.get(sourceId);
    const targetNode = nodesById.get(targetId);
    return {
      id: `${sourceId}-${targetId}-${index}`,
      sourceId,
      targetId,
      sourceLabel: sourceNode?.description || sourceId,
      targetLabel: targetNode?.description || targetId,
      type: link.type ?? 'RELATED',
      reason: link.reason ?? '',
    };
  });
}

// Helper: Build node select options
function buildNodeSelectOptions(graphData: GraphData | null): SelectOption[] {
  const baseOption: SelectOption = { value: '', label: 'Выбери узел' };
  if (!graphData) return [baseOption];
  
  const graphOptions = graphData.nodes.map((node) => ({
    value: node.id,
    label: `${NODE_TYPE_LABELS[node.type] ?? node.type}: ${node.description || node.id}`,
  }));
  return [baseOption, ...graphOptions];
}

// Helper: Toggle node type in active types set
function toggleNodeType(
  activeTypes: Set<string>,
  type: string
): Set<string> {
  const next = new Set(activeTypes);
  if (next.has(type)) {
    if (next.size > 1) next.delete(type); // минимум 1 тип
  } else {
    next.add(type);
  }
  return next;
}

const GraphPage: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [areFiltersVisible, setAreFiltersVisible] = useState<boolean>(true);
  const [isRelationsPanelVisible, setIsRelationsPanelVisible] = useState<boolean>(true);
  const [relationFromId, setRelationFromId] = useState<string>('');
  const [relationToId, setRelationToId] = useState<string>('');
  const [relationType, setRelationType] = useState<string>('RELATED');
  const [relationReason, setRelationReason] = useState<string>('');
  const [relationError, setRelationError] = useState<string | null>(null);
  const [relationSuccess, setRelationSuccess] = useState<string | null>(null);
  const [relationSaving, setRelationSaving] = useState<boolean>(false);
  const [relationDeletingId, setRelationDeletingId] = useState<string | null>(null);
  const [isRelationsListVisible, setIsRelationsListVisible] = useState<boolean>(false);
  const [isRelationHistoryVisible, setIsRelationHistoryVisible] = useState<boolean>(false);
  const [isNodeEditorVisible, setIsNodeEditorVisible] = useState<boolean>(false);
  const [relationHistory, setRelationHistory] = useState<Array<{
    audit_id: string;
    from_id: string;
    to_id: string;
    relationship: string;
    action: string;
    changed_by: string;
    changed_at: string;
  }>>([]);
  const [rollbackAuditId, setRollbackAuditId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [nodeDescription, setNodeDescription] = useState<string>('');
  const [nodeImageUrl, setNodeImageUrl] = useState<string>('');
  const [nodeTitle, setNodeTitle] = useState<string>('');
  const [nodeSaving, setNodeSaving] = useState<boolean>(false);
  const [nodeError, setNodeError] = useState<string | null>(null);
  const [nodeSuccess, setNodeSuccess] = useState<string | null>(null);

  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(NODE_TYPES));
  const [timePeriod, setTimePeriod] = useState<string | null>(null);

  const navigate = useNavigate();

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphApi.getRhizome({
        node_types: [...activeTypes],
        time_period: timePeriod ?? undefined,
      });
      // API возвращает links или edges
      setGraphData({
        nodes: data.nodes ?? [],
        links: data.links ?? data.edges ?? [],
      });
    } catch (err) {
      console.error('Failed to load graph', err);
      setError('Не удалось загрузить граф');
    } finally {
      setLoading(false);
    }
  }, [activeTypes, timePeriod]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const toggleType = (type: string) => {
    setActiveTypes(prev => toggleNodeType(prev, type));
  };

  // ForceGraph3D мутирует объекты nodes/links (добавляет x,y,z координаты),
  // поэтому передаём копии чтобы React не терял ссылки на оригинальные данные
  const displayData = React.useMemo(() => {
    if (!graphData) return null;
    return {
      nodes: graphData.nodes.map(n => ({ ...n })),
      links: graphData.links.map(l => ({ ...l })),
    };
  }, [graphData]);

  const nodesById = useMemo(() => buildNodesMap(graphData), [graphData]);

  const relationshipsList = useMemo(
    () => buildRelationshipsList(graphData, nodesById),
    [graphData, nodesById]
  );

  const nodeSelectOptions = useMemo(
    () => buildNodeSelectOptions(graphData),
    [graphData]
  );

  const relationTypeOptions = useMemo<SelectOption[]>(
    () =>
      RELATIONSHIP_TYPES.map((type) => ({
        value: type,
        label: RELATIONSHIP_TYPE_LABELS[type] ?? type,
      })),
    [],
  );
  const canCreateRelation = Boolean(
    relationFromId &&
    relationToId &&
    relationFromId !== relationToId,
  );

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodesById.get(selectedNodeId) ?? null;
  }, [nodesById, selectedNodeId]);

  useEffect(() => {
    if (!selectedNode) {
      setNodeDescription('');
      setNodeImageUrl('');
      setNodeTitle('');
      return;
    }
    setNodeDescription(typeof selectedNode.description === 'string' ? selectedNode.description : '');
    setNodeImageUrl(typeof selectedNode.image_url === 'string' ? selectedNode.image_url : '');
    setNodeTitle(typeof selectedNode.title === 'string' ? selectedNode.title : '');
  }, [selectedNode]);

  const createOrUpdateRelationship = async () => {
    setRelationError(null);
    setRelationSuccess(null);

    const fromNode = nodesById.get(relationFromId);
    const toNode = nodesById.get(relationToId);
    if (!fromNode || !toNode) {
      setRelationError('Выбери корректные узлы для связи.');
      return;
    }

    if (relationFromId === relationToId) {
      setRelationError('Связь должна быть между разными узлами.');
      return;
    }

    setRelationSaving(true);
    try {
      await graphApi.createRelationship({
        from_type: fromNode.type,
        from_id: fromNode.id,
        to_type: toNode.type,
        to_id: toNode.id,
        relationship: relationType,
        properties: {
          reason: relationReason.trim(),
        },
      });

      setRelationSuccess('Связь сохранена в графе.');
      setRelationReason('');
      await loadGraph();
    } catch (error_) {
      setRelationError(error_ instanceof Error ? error_.message : 'Не удалось сохранить связь.');
    } finally {
      setRelationSaving(false);
    }
  };

  const removeRelationship = async (relationId: string, fromId: string, toId: string, relType: string) => {
    const shouldDelete = globalThis.confirm('Удалить эту связь?');
    if (!shouldDelete) {
      return;
    }

    setRelationError(null);
    setRelationSuccess(null);
    setRelationDeletingId(relationId);

    try {
      const result = await graphApi.deleteRelationship({
        from_id: fromId,
        to_id: toId,
        relationship: relType,
      });

      const deletedCount = Number(result?.deleted_count ?? 0);
      if (deletedCount === 0) {
        setRelationError('Связь не найдена для удаления.');
      } else {
        setRelationSuccess('Связь удалена.');
      }
      await loadGraph();
    } catch (error_) {
      setRelationError(error_ instanceof Error ? error_.message : 'Не удалось удалить связь.');
    } finally {
      setRelationDeletingId(null);
    }
  };

  const loadRelationshipHistory = useCallback(async () => {
    try {
      const history = await graphApi.getRelationshipHistory();
      setRelationHistory(history.items ?? []);
    } catch (historyError) {
      console.error('Failed to load relationship history', historyError);
    }
  }, []);

  useEffect(() => {
    void loadRelationshipHistory();
  }, [loadRelationshipHistory, graphData]);

  const rollbackRelationshipChange = async (auditId: string) => {
    setRollbackAuditId(auditId);
    setRelationError(null);
    setRelationSuccess(null);
    try {
      await graphApi.rollbackRelationship(auditId);
      setRelationSuccess('Откат связи выполнен.');
      await loadGraph();
      await loadRelationshipHistory();
    } catch (rollbackError) {
      setRelationError(rollbackError instanceof Error ? rollbackError.message : 'Не удалось выполнить откат.');
    } finally {
      setRollbackAuditId(null);
    }
  };

  const saveNodeChanges = async () => {
    if (!selectedNode) {
      setNodeError('Сначала выбери узел на графе.');
      return;
    }
    setNodeError(null);
    setNodeSuccess(null);
    setNodeSaving(true);
    try {
      await graphApi.updateNode(selectedNode.type, selectedNode.id, {
        description: nodeDescription.trim(),
        image_url: nodeImageUrl.trim(),
        title: nodeTitle.trim(),
      });
      setNodeSuccess('Свойства узла обновлены.');
      await loadGraph();
    } catch (updateError) {
      setNodeError(updateError instanceof Error ? updateError.message : 'Не удалось обновить узел.');
    } finally {
      setNodeSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-0 flex items-center justify-center overflow-hidden bg-background">
        <RadialPulseLoader text="Загрузка графа..." size={150} color="#ffffff" />
      </div>
    );
  }

  if (error || !displayData) {
    return (
      <div className="fixed inset-0 z-0 flex flex-col items-center justify-center gap-4 overflow-hidden bg-background text-white">
        <p className="text-gray-400">{error ?? 'Нет данных'}</p>
        <Button variant="ghost" onClick={loadGraph} className="text-white">
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-background">
      {/* Хлебные крошки */}
      <div className="absolute top-4 left-4 z-10">
        <Breadcrumbs crumbs={[{ label: 'Главная', to: '/navigation' }, { label: 'Карта жизни' }]} />
      </div>

      {/* Переключатель фильтров */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          onClick={() => setAreFiltersVisible(prev => !prev)}
          className="h-8 rounded-xl border border-white/15 bg-[rgba(15,15,30,0.82)] px-3 text-xs text-white hover:bg-[rgba(30,30,50,0.82)]"
        >
          {areFiltersVisible ? 'Скрыть фильтры' : 'Показать фильтры'}
        </Button>
      </div>

      {/* Фильтры типов узлов */}
      {areFiltersVisible && (
        <div
          className="absolute top-14 right-4 z-10 max-w-[min(320px,calc(100vw-5rem))] rounded-2xl p-2"
          style={{
            background: 'rgba(15, 15, 30, 0.82)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
          }}
        >
          <div className="flex flex-col gap-2">
            {NODE_TYPES.map(type => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className="w-full rounded-xl px-3 py-1.5 text-left text-xs font-medium transition-all hover:-translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-white/30"
                style={{
                  backgroundColor: activeTypes.has(type) ? `${NODE_COLORS[type]}55` : 'rgba(255,255,255,0.04)',
                  color: activeTypes.has(type) ? '#ffffff' : 'rgba(255,255,255,0.72)',
                  border: activeTypes.has(type) ? `1px solid ${NODE_COLORS[type]}aa` : '1px solid rgba(255,255,255,0.14)',
                  boxShadow: activeTypes.has(type) ? `0 0 14px ${NODE_COLORS[type]}55` : 'none',
                }}
              >
                {NODE_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          {/* Временные фильтры */}
          <div className="mt-2 flex flex-col gap-2">
            {TIME_PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setTimePeriod(prev => prev === p.value ? null : p.value)}
                className="w-full rounded-xl px-3 py-1.5 text-left text-xs font-medium transition-all hover:-translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-white/30"
                style={{
                  backgroundColor: timePeriod === p.value ? 'rgba(96,165,250,0.22)' : 'rgba(255,255,255,0.04)',
                  color: timePeriod === p.value ? '#ffffff' : 'rgba(255,255,255,0.72)',
                  border: timePeriod === p.value ? '1px solid rgba(96,165,250,0.7)' : '1px solid rgba(255,255,255,0.14)',
                  boxShadow: timePeriod === p.value ? '0 0 14px rgba(96,165,250,0.35)' : 'none',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="absolute top-14 left-4 z-10 max-w-[min(380px,calc(100vw-5rem))]">
        <div
          className="max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl p-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          style={{
            background: 'rgba(15, 15, 30, 0.82)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
          }}
        >
          <button
            type="button"
            onClick={() => setIsRelationsPanelVisible((prev) => !prev)}
            className="flex w-full items-center justify-end rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-left text-xs text-white transition hover:bg-white/10"
          >
            <span>{isRelationsPanelVisible ? 'Скрыть редактор' : 'Показать редактор'}</span>
          </button>

          {isRelationsPanelVisible && (
            <div className="mt-2 space-y-3">
              <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                <p className="text-[11px] font-medium text-white/80">Как добавить связь</p>
                <p className="mt-1 text-[10px] text-white/55">
                  1) Источник {'->'} 2) Тип связи {'->'} 3) Цель {'->'} 4) Сохранить
                </p>
              </div>

              <div className="rounded-lg border border-white/10 bg-black/20 p-2 space-y-2">
                <div>
                  <label htmlFor="relation-from" className="mb-1 block text-[11px] text-white/70">Шаг 1. Узел источник</label>
                  <GraphSelect
                    id="relation-from"
                    value={relationFromId}
                    onChange={setRelationFromId}
                    options={nodeSelectOptions}
                    placeholder="Выбери узел"
                  />
                </div>

                <div>
                  <label htmlFor="relation-type" className="mb-1 block text-[11px] text-white/70">Шаг 2. Тип связи</label>
                  <GraphSelect
                    id="relation-type"
                    value={relationType}
                    onChange={setRelationType}
                    options={relationTypeOptions}
                    placeholder="Тип связи"
                  />
                </div>

                <div>
                  <label htmlFor="relation-to" className="mb-1 block text-[11px] text-white/70">Шаг 3. Узел цель</label>
                  <GraphSelect
                    id="relation-to"
                    value={relationToId}
                    onChange={setRelationToId}
                    options={nodeSelectOptions}
                    placeholder="Выбери узел"
                  />
                </div>

                <div>
                  <label htmlFor="relation-reason" className="mb-1 block text-[11px] text-white/70">Комментарий (необязательно)</label>
                  <input
                    id="relation-reason"
                    value={relationReason}
                    onChange={(event) => setRelationReason(event.target.value)}
                    placeholder="Например: поддерживает привычку"
                    className="w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white outline-none placeholder:text-white/35"
                  />
                </div>

                {relationError ? <p className="text-[11px] text-rose-300">{relationError}</p> : null}
                {relationSuccess ? <p className="text-[11px] text-emerald-300">{relationSuccess}</p> : null}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={createOrUpdateRelationship}
                    disabled={relationSaving || !canCreateRelation}
                    className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white transition hover:bg-white/20 disabled:opacity-50"
                  >
                    {relationSaving ? 'Сохраняем...' : 'Создать связь'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRelationFromId('');
                      setRelationToId('');
                      setRelationType('RELATED');
                      setRelationReason('');
                      setRelationError(null);
                      setRelationSuccess(null);
                    }}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white transition hover:bg-white/10"
                  >
                    Очистить
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                <button
                  type="button"
                  onClick={() => setIsRelationsListVisible((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-left text-[11px] text-white/80 transition hover:bg-white/10"
                >
                  <span>Текущие связи ({relationshipsList.length})</span>
                  <span>{isRelationsListVisible ? 'Скрыть' : 'Показать'}</span>
                </button>
                {isRelationsListVisible && (
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {relationshipsList.length === 0 ? (
                      <p className="text-[11px] text-white/40">Пока нет связей</p>
                    ) : (
                      relationshipsList.slice(0, 8).map((rel) => (
                        <div key={rel.id} className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setRelationFromId(rel.sourceId);
                              setRelationToId(rel.targetId);
                              setRelationType(rel.type);
                              setRelationReason(rel.reason);
                              setRelationError(null);
                              setRelationSuccess(null);
                            }}
                            className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-left text-[10px] text-white/75 transition hover:bg-white/10"
                          >
                            {rel.sourceLabel} {'->'} {rel.targetLabel}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRelationship(rel.id, rel.sourceId, rel.targetId, rel.type)}
                            disabled={relationDeletingId === rel.id}
                            aria-label="Удалить связь"
                            className="grid h-6 w-6 place-items-center rounded-md border border-rose-300/25 bg-rose-500/8 text-rose-200/85 transition hover:bg-rose-500/20 hover:text-rose-100 disabled:opacity-50"
                          >
                            {relationDeletingId === rel.id ? '...' : <X size={11} strokeWidth={2.4} />}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                <button
                  type="button"
                  onClick={() => setIsRelationHistoryVisible((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-left text-[11px] text-white/80 transition hover:bg-white/10"
                >
                  <span>История изменений</span>
                  <span>{isRelationHistoryVisible ? 'Скрыть' : 'Показать'}</span>
                </button>
                {isRelationHistoryVisible && (
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {relationHistory.length === 0 ? (
                      <p className="text-[11px] text-white/40">История пуста</p>
                    ) : (
                      relationHistory.slice(0, 8).map((item) => (
                        <div key={item.audit_id} className="flex items-center gap-1">
                          <div className="flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/75">
                            {RELATION_AUDIT_ACTION_LABELS[item.action] ?? item.action}: {item.from_id.slice(0, 6)} {'->'} {item.to_id.slice(0, 6)} ({RELATIONSHIP_TYPE_LABELS[item.relationship] ?? item.relationship})
                          </div>
                          <button
                            type="button"
                            onClick={() => rollbackRelationshipChange(item.audit_id)}
                            disabled={rollbackAuditId === item.audit_id}
                            className="rounded-md border border-white/15 bg-white/5 px-1.5 py-1 text-[10px] text-white transition hover:bg-white/10 disabled:opacity-50"
                          >
                            {rollbackAuditId === item.audit_id ? '...' : 'Откатить'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                <button
                  type="button"
                  onClick={() => setIsNodeEditorVisible((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-left text-[11px] text-white/80 transition hover:bg-white/10"
                >
                  <span>Редактор узла</span>
                  <span>{isNodeEditorVisible ? 'Скрыть' : 'Показать'}</span>
                </button>
                {isNodeEditorVisible && (
                  <div className="mt-2 space-y-2">
                    <p className="text-[10px] text-white/45">
                      Выбран: {selectedNode ? `${NODE_TYPE_LABELS[selectedNode.type] ?? selectedNode.type} (${selectedNode.id})` : 'ничего'}
                    </p>
                    <input
                      value={nodeTitle}
                      onChange={(event) => setNodeTitle(event.target.value)}
                      placeholder="Заголовок узла"
                      className="w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-[11px] text-white outline-none placeholder:text-white/35"
                    />
                    <textarea
                      rows={2}
                      value={nodeDescription}
                      onChange={(event) => setNodeDescription(event.target.value)}
                      placeholder="Описание узла"
                      className="w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-[11px] text-white outline-none placeholder:text-white/35"
                    />
                    <input
                      value={nodeImageUrl}
                      onChange={(event) => setNodeImageUrl(event.target.value)}
                      placeholder="URL изображения"
                      className="w-full rounded-md border border-white/15 bg-black/30 px-2 py-1.5 text-[11px] text-white outline-none placeholder:text-white/35"
                    />
                    {nodeError ? <p className="text-[11px] text-rose-300">{nodeError}</p> : null}
                    {nodeSuccess ? <p className="text-[11px] text-emerald-300">{nodeSuccess}</p> : null}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveNodeChanges}
                        disabled={nodeSaving}
                        className="flex-1 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-[11px] text-white transition hover:bg-white/20 disabled:opacity-50"
                      >
                        {nodeSaving ? 'Сохраняем...' : 'Сохранить узел'}
                      </button>
                      {selectedNode?.type === 'Entry' ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/event/${selectedNode.id}`)}
                          className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white transition hover:bg-white/10"
                        >
                          Открыть
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Нижняя навигация */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div
          className="flex items-center gap-1 px-3 py-2 rounded-2xl"
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
            const isActive = path === '/graph';
            return (
              <button
                key={label}
                onClick={() => {
                  navigate(path);
                }}
                className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all"
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

      <div className="absolute inset-0 z-0 min-h-0 min-w-0">
        <ForceGraph3D
          graphData={displayData}
          nodeLabel={(node: any) => {
            const typeRu = NODE_TYPE_LABELS[node.type] ?? node.type;
            const color = NODE_COLORS[node.type] ?? '#fff';
            const desc = node.description || node.name || node.id;
            return `<div style="background:rgba(0,0,0,0.85);padding:6px 10px;border-radius:6px;font-size:12px;max-width:220px">
            <b style="color:${color}">${typeRu}</b><br/>
            <span style="color:#ddd">${desc}</span>
          </div>`;
          }}
          linkLabel={(link: any) => {
            const reason = link.reason ?? '';
            if (!reason) return '';
            return `<div style="background:rgba(0,0,0,0.85);padding:6px 10px;border-radius:6px;font-size:12px;max-width:260px">
            <span style="color:#ddd">${reason}</span>
          </div>`;
          }}
          nodeColor={(node: any) => NODE_COLORS[node.type] ?? '#ffffff'}
          nodeOpacity={1}
          nodeThreeObjectExtend
          nodeThreeObject={(node: unknown) => {
            if (typeof node !== 'object' || node == null) {
              return new THREE.Object3D();
            }
            const graphNode = node as GraphNode;
            const imageUrl = typeof graphNode.image_url === 'string' ? graphNode.image_url : null;
            if (!imageUrl) {
              return new THREE.Object3D();
            }

            const texture = new THREE.TextureLoader().load(imageUrl);
            const material = new THREE.SpriteMaterial({
              map: texture,
              depthWrite: false,
            });
            const sprite = new THREE.Sprite(material);
            sprite.scale.set(9, 9, 1);
            sprite.position.set(0, 5, 0);
            return sprite;
          }}
          linkThreeObjectExtend
          linkThreeObject={(link: unknown) => {
            if (typeof link !== 'object' || link == null) {
              return new THREE.Object3D();
            }
            const rel = link as GraphLink;
            const text = typeof rel.reason === 'string' ? rel.reason.trim() : '';
            if (!text) {
              return new THREE.Object3D();
            }

            return buildTextSprite(text, '#d1d5db');
          }}
          linkPositionUpdate={(sprite, link) => {
            const coords = extractLinkCoords(link);
            const middleX = coords.start.x + (coords.end.x - coords.start.x) / 2;
            const middleY = coords.start.y + (coords.end.y - coords.start.y) / 2;
            const middleZ = coords.start.z + (coords.end.z - coords.start.z) / 2;
            sprite.position.set(middleX, middleY, middleZ);
          }}
          linkDirectionalParticles={1}
          backgroundColor="rgba(0, 0, 25, 1)"
          showNavInfo={false}
          onNodeClick={(node: any) => {
            if (node?.id) {
              setSelectedNodeId(node.id);
              setNodeError(null);
              setNodeSuccess(null);
            }
          }}
        />
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 z-10 rounded-xl border border-white/10 bg-[rgba(15,15,30,0.82)] px-3 py-2 text-xs text-white opacity-70">
        <div className="flex flex-col gap-1 text-left leading-tight">
          <div>ЛКМ: вращение</div>
          <div>ПКМ: перемещение</div>
          <div>Колесо: масштаб</div>
        </div>
      </div>
    </div>
  );
};

export default GraphPage;
