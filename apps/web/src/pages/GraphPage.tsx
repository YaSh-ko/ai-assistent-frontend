import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { Eye, Target, Search, RefreshCw, GitBranch, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/Breadcrumbs';
import RadialPulseLoader from '@/components/ui/loading-animation';
import NodeDetailPanel from '@/components/graph/NodeDetailPanel';
import type { GraphNodeData } from '@/components/graph/NodeDetailPanel';
import { graphApi } from '@/lib/api-client';

const NODE_COLORS: Record<string, string> = {
  Entry: '#34d399',
  Goal: '#f59e0b',
};

/** На графе только устойчивые сущности; шаги цели — на странице цели. */
const ENTITY_TYPES = ['Entry', 'Goal'] as const;

const ENTITY_META: Record<string, { label: string; icon: React.ElementType }> = {
  Entry: { label: 'Наблюдения', icon: Eye },
  Goal: { label: 'Цели', icon: Target },
};

interface GraphNode {
  id: string;
  type: string;
  description?: string;
  title?: string;
  status?: string;
  priority?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: string | null;
  reason?: string | null;
  curvature?: number;
  curveRotation?: number;
  _parallelIndex?: number;
  _parallelCount?: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

function normalizePoint(node: unknown): { x: number; y: number; z: number } {
  if (typeof node !== 'object' || node == null) return { x: 0, y: 0, z: 0 };
  const p = node as { x?: number; y?: number; z?: number };
  return { x: p.x ?? 0, y: p.y ?? 0, z: p.z ?? 0 };
}

function extractLinkCoords(link: unknown) {
  if (typeof link !== 'object' || link == null) {
    return { start: { x: 0, y: 0, z: 0 }, end: { x: 0, y: 0, z: 0 } };
  }
  const src = (link as { source?: unknown }).source;
  const tgt = (link as { target?: unknown }).target;
  return { start: normalizePoint(src), end: normalizePoint(tgt) };
}

const REL_TYPE_LABELS: Record<string, string> = {
  RELATES_TO: 'Связано',
  DOCUMENTS: 'Описывает',
  DECOMPOSED_INTO: 'Шаг цели',
  BASED_ON: 'Основано на',
  SUPPORTS: 'Поддерживает',
  RELATED: 'Связь',
};

function shortenTitle(text: string, maxLen = 36): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

function nodeDisplayTitle(end: string | GraphNode | undefined): string {
  if (typeof end !== 'object' || end == null) return '';
  const raw = (end.title || end.description || '').trim();
  return raw;
}

/** Короткая подпись одного ребра (без склейки тем разных связей). */
function extractLinkTheme(link: GraphLink, nodes?: GraphNode[]): string {
  const reason = typeof link.reason === 'string' ? link.reason.trim() : '';
  if (reason) {
    return shortenTitle(reason.replace(/\s*[↔→←]\s*/gu, ' · '), 36);
  }

  const srcId = typeof link.source === 'string' ? link.source : link.source?.id;
  const tgtId = typeof link.target === 'string' ? link.target : link.target?.id;
  let src = nodeDisplayTitle(typeof link.source === 'object' ? link.source : undefined);
  let tgt = nodeDisplayTitle(typeof link.target === 'object' ? link.target : undefined);
  if (nodes?.length) {
    if (!src && srcId) src = nodeDisplayTitle(nodes.find((n) => n.id === srcId));
    if (!tgt && tgtId) tgt = nodeDisplayTitle(nodes.find((n) => n.id === tgtId));
  }

  if (src && tgt && src.toLowerCase() !== tgt.toLowerCase()) {
    return shortenTitle(`${src} · ${tgt}`, 36);
  }
  return shortenTitle(tgt || src, 36);
}

function linkEndpointId(end: string | GraphNode | undefined): string {
  if (typeof end === 'string') return end;
  return end?.id ?? '';
}

/** Развести параллельные рёбра между одной парой узлов. */
function enrichGraphLinks(links: GraphLink[]): GraphLink[] {
  const pairGroups = new Map<string, number[]>();
  links.forEach((l, i) => {
    const key = [linkEndpointId(l.source), linkEndpointId(l.target)].sort().join('|');
    if (!pairGroups.has(key)) pairGroups.set(key, []);
    pairGroups.get(key)!.push(i);
  });

  const enriched = links.map((l) => ({ ...l }));
  for (const indices of pairGroups.values()) {
    const count = indices.length;
    indices.forEach((idx, parallelIdx) => {
      const spread = 0.24;
      enriched[idx] = {
        ...enriched[idx],
        curvature: count <= 1 ? 0.14 : (parallelIdx - (count - 1) / 2) * spread,
        curveRotation: count <= 1 ? 0.25 : (parallelIdx / Math.max(count, 1)) * Math.PI,
        _parallelIndex: parallelIdx,
        _parallelCount: count,
      };
    });
  }
  return enriched;
}

/** Точка подписи вдоль ребра — ближе к наблюдению, не в геометрический центр сцены. */
function linkLabelPositionT(link: GraphLink): number {
  const srcType =
    typeof link.source === 'object' && link.source != null ? String(link.source.type) : '';
  const tgtType =
    typeof link.target === 'object' && link.target != null ? String(link.target.type) : '';
  let t = 0.4;
  if (srcType === 'Entry' && tgtType === 'Goal') t = 0.36;
  else if (srcType === 'Goal' && tgtType === 'Entry') t = 0.64;
  const count = link._parallelCount ?? 1;
  if (count > 1) {
    t += ((link._parallelIndex ?? 0) - (count - 1) / 2) * 0.1;
  }
  return Math.min(0.78, Math.max(0.22, t));
}

function getLinkTypeHint(link: GraphLink): string {
  const type = String(link.type ?? 'RELATED').toUpperCase();
  return REL_TYPE_LABELS[type] ?? 'Связь';
}

function getLinkDisplayLabel(link: GraphLink, nodes?: GraphNode[]): string {
  return extractLinkTheme(link, nodes) || getLinkTypeHint(link);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function buildTextSprite(message: string, color: string): THREE.Sprite {
  const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2);
  const fontSize = 26;
  const padX = 18;
  const padY = 12;
  const maxTextWidth = 280;

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d')!;
  measureCtx.font = `600 ${fontSize}px Inter, system-ui, Arial, sans-serif`;

  let text = message.trim();
  if (!text) text = '…';
  while (text.length > 2 && measureCtx.measureText(`${text}…`).width > maxTextWidth) {
    text = text.slice(0, -1);
  }
  if (measureCtx.measureText(text).width > maxTextWidth) {
    text = `${text.slice(0, 20)}…`;
  }

  const textWidth = measureCtx.measureText(text).width;
  const logicalW = textWidth + padX * 2;
  const logicalH = fontSize + padY * 2;

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(logicalW * dpr);
  canvas.height = Math.ceil(logicalH * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  roundRect(ctx, 0.5, 0.5, logicalW - 1, logicalH - 1, 10);
  ctx.fillStyle = 'rgba(9, 11, 18, 0.96)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = `600 ${fontSize}px Inter, system-ui, Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, padX, logicalH / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  const aspect = logicalW / logicalH;
  const worldH = 5.5;
  sprite.scale.set(worldH * aspect, worldH, 1);
  return sprite;
}

const GraphPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const focusNodeId = searchParams.get('node');
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(ENTITY_TYPES));
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphApi.getRhizome({ node_types: [...activeTypes] });
      const nodes: GraphNode[] = (data.nodes ?? []).filter(
        (n: GraphNode) => ENTITY_TYPES.includes(n.type as typeof ENTITY_TYPES[number]),
      );
      const nodeIds = new Set(nodes.map((n: GraphNode) => n.id));
      const links: GraphLink[] = (data.links ?? data.edges ?? []).filter((l: GraphLink) => {
        const sId = typeof l.source === 'string' ? l.source : l.source?.id;
        const tId = typeof l.target === 'string' ? l.target : l.target?.id;
        return sId && tId && nodeIds.has(sId) && nodeIds.has(tId);
      });
      setGraphData({ nodes, links });
    } catch {
      setError('Не удалось загрузить граф');
    } finally {
      setLoading(false);
    }
  }, [activeTypes]);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  useEffect(() => {
    if (!focusNodeId || !graphData?.nodes.length) return;
    const node = graphData.nodes.find(n => n.id === focusNodeId);
    if (!node) return;
    setSelectedNode(node as GraphNodeData);
    const neighborIds = new Set<string>([focusNodeId]);
    graphData.links.forEach(link => {
      const sId = typeof link.source === 'string' ? link.source : link.source?.id;
      const tId = typeof link.target === 'string' ? link.target : link.target?.id;
      if (sId === focusNodeId && tId) neighborIds.add(tId);
      if (tId === focusNodeId && sId) neighborIds.add(sId);
    });
    setHighlightIds(neighborIds);
    const simNodes = graphRef.current?.graphData?.()?.nodes as GraphNode[] | undefined;
    const targetNode = simNodes?.find(n => n.id === focusNodeId) ?? node;
    if (graphRef.current && targetNode) {
      const p = normalizePoint(targetNode);
      const dist = 200;
      graphRef.current.cameraPosition(
        { x: p.x + dist, y: p.y + dist, z: p.z + dist },
        { x: p.x, y: p.y, z: p.z },
        1000,
      );
    }
  }, [focusNodeId, graphData]);

  const toggleType = (type: string) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) {
      setHighlightIds(new Set());
      return;
    }
    if (!graphData?.nodes.length) {
      toast.info('Граф пустой — нечего искать');
      return;
    }
    const visibleIds = new Set(graphData.nodes.map(n => n.id));
    const qLower = q.toLowerCase();

    const filterVisible = (ids: Iterable<string>) =>
      new Set([...ids].filter(id => visibleIds.has(id)));

    const localMatch = () =>
      filterVisible(
        graphData.nodes
          .filter(n => {
            const text = `${n.title ?? ''} ${n.description ?? ''} ${String(n.content ?? '')}`.toLowerCase();
            return text.includes(qLower);
          })
          .map(n => n.id),
      );

    try {
      const result = await graphApi.search(q, 20);
      let ids = filterVisible((result.nodes ?? []).map((n: GraphNode) => n.id));
      if (ids.size === 0) {
        ids = localMatch();
      }
      setHighlightIds(ids);

      if (ids.size === 0) {
        toast.info('Ничего не найдено');
        return;
      }

      toast.success(`Найдено: ${ids.size}`);

      const firstId = [...ids][0];
      const simNodes = graphRef.current?.graphData?.()?.nodes as GraphNode[] | undefined;
      const targetNode = simNodes?.find(n => n.id === firstId) ?? graphData.nodes.find(n => n.id === firstId);

      if (graphRef.current) {
        if (typeof graphRef.current.zoomToFit === 'function') {
          graphRef.current.zoomToFit(800, 120, (node: { id?: string }) => ids.has(node.id ?? ''));
        } else if (targetNode) {
          const p = normalizePoint(targetNode);
          const dist = 200;
          graphRef.current.cameraPosition(
            { x: p.x + dist, y: p.y + dist, z: p.z + dist },
            { x: p.x, y: p.y, z: p.z },
            1000,
          );
        }
      }
    } catch {
      const ids = localMatch();
      setHighlightIds(ids);
      if (ids.size === 0) {
        toast.error('Ошибка поиска');
      } else {
        toast.success(`Найдено локально: ${ids.size}`);
        graphRef.current?.zoomToFit?.(800, 120, (node: { id?: string }) => ids.has(node.id ?? ''));
      }
    }
  }, [searchQuery, graphData]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await graphApi.backfill();
      const s = result.synced;
      toast.success(`Синхронизировано: ${s.entries} наблюдений, ${s.goals} целей, ${s.links} связей`);
      await loadGraph();
    } catch {
      toast.error('Ошибка синхронизации');
    } finally {
      setSyncing(false);
    }
  }, [loadGraph]);

  const displayData = useMemo(() => {
    if (!graphData) return null;
    return {
      nodes: graphData.nodes.map(n => ({ ...n })),
      links: enrichGraphLinks(graphData.links.map(l => ({ ...l }))),
    };
  }, [graphData]);

  const isEmpty = (displayData?.nodes.length ?? 0) === 0;

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--growth-bg, #0a0a0a)' }}>
        <RadialPulseLoader text="Загрузка графа..." size={150} color="#34d399" />
      </div>
    );
  }

  if (error || !displayData) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4" style={{ background: 'var(--growth-bg, #0a0a0a)' }}>
        <p className="text-sm text-white/50">{error ?? 'Нет данных'}</p>
        <div className="flex gap-2">
          <button
            onClick={loadGraph}
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-400 transition hover:bg-emerald-500/20"
          >
            Повторить
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/60 transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Синхронизация...' : 'Синхронизировать'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: 'var(--growth-bg, #0a0a0a)' }}>
      {/* Header */}
      <div className="absolute top-4 left-4 z-10">
        <Breadcrumbs crumbs={[{ label: 'Главная', to: '/navigation' }, { label: 'Карта связей' }]} />
      </div>

      {/* Search + Sync */}
      <div className="absolute top-12 left-4 z-10 mt-1 flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-white/10 bg-black/60 backdrop-blur-sm">
          <Search size={13} className="ml-2.5 text-white/30" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Поиск по графу..."
            className="w-48 bg-transparent px-2 py-1.5 text-xs text-white outline-none placeholder:text-white/25"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setHighlightIds(new Set()); }}
              className="mr-1 rounded px-1.5 py-0.5 text-[10px] text-white/40 hover:text-white/60"
            >
              ✕
            </button>
          )}
          <button
            type="button"
            onClick={handleSearch}
            className="mr-1.5 rounded-md px-2 py-1 text-[10px] font-medium text-emerald-400/80 transition hover:bg-emerald-500/10 hover:text-emerald-400"
          >
            Найти
          </button>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          title="Синхронизировать сущности из БД в граф"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 text-xs text-white/50 backdrop-blur-sm transition hover:bg-white/10 hover:text-white/70 disabled:opacity-50"
        >
          <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
          Синхр.
        </button>
      </div>

      {/* Filters */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
        {ENTITY_TYPES.map(type => {
          const { label, icon: Icon } = ENTITY_META[type];
          const active = activeTypes.has(type);
          const color = NODE_COLORS[type];
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                backgroundColor: active ? `${color}22` : 'rgba(255,255,255,0.04)',
                color: active ? color : 'rgba(255,255,255,0.45)',
                border: `1px solid ${active ? `${color}55` : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              <Icon size={13} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="absolute top-12 right-4 z-10 mt-1 flex gap-2 text-[10px] text-white/30">
        <span>{graphData.nodes.length} узлов</span>
        <span>{graphData.links.length} связей</span>
        {highlightIds.size > 0 && <span className="text-emerald-400/70">{highlightIds.size} найдено</span>}
      </div>

      {/* Graph canvas or empty state */}
      {isEmpty ? (
        <div className="absolute inset-0 z-[1] flex items-center justify-center px-6">
          <div
            className="flex max-w-md flex-col items-center gap-4 rounded-2xl px-8 py-10 text-center"
            style={{
              background: 'rgba(25, 22, 29, 0.92)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.35)',
            }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}
            >
              <GitBranch size={28} style={{ color: '#34d399' }} />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-white/90">Граф пустой</h2>
              <p className="text-sm leading-relaxed text-white/45">
                Здесь появятся наблюдения и цели из чата, а также связи между ними.
                Начни с разговора — система сама соберёт карту.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Link
                to="/chat"
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition hover:opacity-90"
                style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}
              >
                <MessageSquare size={13} />
                Перейти в чат
              </Link>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-4 py-2 text-xs text-white/55 transition hover:bg-white/10 hover:text-white/75 disabled:opacity-50"
              >
                <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Синхронизация…' : 'Синхронизировать из БД'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="absolute inset-0 z-0">
          <ForceGraph3D
          ref={graphRef}
          graphData={displayData}
          backgroundColor="rgba(0,0,0,0)"
          showNavInfo={false}
          nodeColor={(node: any) => {
            if (highlightIds.size > 0 && !highlightIds.has(node.id)) return 'rgba(255,255,255,0.08)';
            return NODE_COLORS[node.type] ?? '#a1a1aa';
          }}
          nodeOpacity={0.95}
          nodeRelSize={6}
          nodeVal={(node: any) => highlightIds.has(node.id) ? 3 : 1}
          nodeLabel={(node: any) => {
            const color = NODE_COLORS[node.type] ?? '#fff';
            const label = ENTITY_META[node.type]?.label ?? node.type;
            const desc = node.title || node.description || node.id;
            return `<div style="background:rgba(10,10,10,0.92);padding:8px 12px;border-radius:8px;font-size:12px;max-width:240px;border:1px solid ${color}44">
              <b style="color:${color}">${label}</b><br/>
              <span style="color:#d4d4d8">${desc}</span>
            </div>`;
          }}
          linkLabel={(link: any) => {
            const rel = link as GraphLink;
            const theme = extractLinkTheme(rel, graphData?.nodes);
            const hint = getLinkTypeHint(rel);
            const reason = typeof rel.reason === 'string' ? rel.reason.trim() : '';
            const showReason = reason && reason !== theme;
            return `<div style="background:rgba(12,14,22,0.96);padding:8px 12px;border-radius:10px;font-size:12px;max-width:280px;border:1px solid rgba(255,255,255,0.14);box-shadow:0 8px 24px rgba(0,0,0,0.45)">
              <div style="color:#e4e4e7;font-weight:600;font-size:12px;line-height:1.35">${theme || hint}</div>
              <div style="color:#34d399;font-size:10px;margin-top:4px;text-transform:uppercase;letter-spacing:0.04em">${hint}</div>
              ${showReason ? `<div style="color:#a1a1aa;line-height:1.4;font-size:10px;margin-top:6px">${reason}</div>` : ''}
            </div>`;
          }}
          linkColor={() => 'rgba(255,255,255,0.12)'}
          linkWidth={1}
          linkCurvature={(link: GraphLink) => link.curvature ?? 0.14}
          linkCurveRotation={(link: GraphLink) => link.curveRotation ?? 0.25}
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={() => 'rgba(52,211,153,0.6)'}
          linkThreeObjectExtend
          linkThreeObject={(link: unknown) => {
            if (typeof link !== 'object' || link == null) return new THREE.Object3D();
            const rel = link as GraphLink;
            const label = getLinkDisplayLabel(rel, graphData?.nodes);
            if (!label || label === '…') return new THREE.Object3D();
            return buildTextSprite(label, '#e4e4e7');
          }}
          linkPositionUpdate={(sprite, coords, link) => {
            const rel = link as GraphLink;
            const start =
              coords && typeof coords === 'object' && 'start' in coords
                ? (coords as { start: { x: number; y: number; z: number } }).start
                : extractLinkCoords(link).start;
            const end =
              coords && typeof coords === 'object' && 'end' in coords
                ? (coords as { end: { x: number; y: number; z: number } }).end
                : extractLinkCoords(link).end;
            const t = linkLabelPositionT(rel);
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const dz = end.z - start.z;
            const len = Math.hypot(dx, dy, dz) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            const parallelOff =
              (rel._parallelCount ?? 1) > 1
                ? ((rel._parallelIndex ?? 0) - ((rel._parallelCount ?? 1) - 1) / 2) * 16
                : 0;
            sprite.position.set(
              start.x + dx * t + nx * parallelOff,
              start.y + dy * t + ny * parallelOff,
              start.z + dz * t,
            );
          }}
          onNodeClick={(node: any) => {
            if (node?.id) setSelectedNode(node as GraphNodeData);
          }}
        />
        </div>
      )}

      {/* Node detail panel */}
      {selectedNode && !isEmpty && (
        <div
          className="absolute top-0 right-0 z-20 h-full w-80 border-l border-white/10"
          style={{ background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(16px)' }}
        >
          <NodeDetailPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            allNodes={graphData?.nodes}
            allLinks={graphData?.links}
          />
        </div>
      )}

      {/* Controls hint */}
      {!isEmpty && (
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex gap-3 text-[10px] text-white/30">
        <span>ЛКМ — вращение</span>
        <span>ПКМ — перемещение</span>
        <span>Скролл — масштаб</span>
      </div>
      )}
    </div>
  );
};

export default GraphPage;
