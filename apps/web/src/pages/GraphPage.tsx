import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { Eye, Target, Zap, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/Breadcrumbs';
import RadialPulseLoader from '@/components/ui/loading-animation';
import NodeDetailPanel from '@/components/graph/NodeDetailPanel';
import type { GraphNodeData } from '@/components/graph/NodeDetailPanel';
import { graphApi } from '@/lib/api-client';

const NODE_COLORS: Record<string, string> = {
  Entry: '#34d399',
  Goal: '#f59e0b',
  Experiment: '#60a5fa',
};

const ENTITY_TYPES = ['Entry', 'Goal', 'Experiment'] as const;

const ENTITY_META: Record<string, { label: string; icon: React.ElementType }> = {
  Entry: { label: 'Наблюдения', icon: Eye },
  Goal: { label: 'Цели', icon: Target },
  Experiment: { label: 'Задачи', icon: Zap },
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

function buildTextSprite(message: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const fontSize = 36;
  const pad = 16;
  ctx.font = `${fontSize}px Inter, Arial, sans-serif`;
  const tw = Math.ceil(ctx.measureText(message).width);
  canvas.width = tw + pad * 2;
  canvas.height = fontSize + pad * 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(8,8,18,0.75)';
  ctx.beginPath();
  ctx.roundRect(0, 0, canvas.width, canvas.height, 12);
  ctx.fill();

  ctx.font = `${fontSize}px Inter, Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(message, pad, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(18, 6, 1);
  return sprite;
}

const GraphPage: React.FC = () => {
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
    try {
      const result = await graphApi.search(q, 20);
      const ids = new Set<string>((result.nodes ?? []).map((n: GraphNode) => n.id));
      setHighlightIds(ids);

      if (ids.size > 0 && graphRef.current && graphData) {
        const firstId = [...ids][0];
        const targetNode = graphData.nodes.find(n => n.id === firstId);
        if (targetNode && 'x' in targetNode) {
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
      toast.error('Ошибка поиска');
    }
  }, [searchQuery, graphData]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await graphApi.backfill();
      const s = result.synced;
      toast.success(`Синхронизировано: ${s.entries} наблюдений, ${s.goals} целей, ${s.experiments} задач, ${s.links} связей`);
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
      links: graphData.links.map(l => ({ ...l })),
    };
  }, [graphData]);

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
              onClick={() => { setSearchQuery(''); setHighlightIds(new Set()); }}
              className="mr-1 rounded px-1.5 py-0.5 text-[10px] text-white/40 hover:text-white/60"
            >
              ✕
            </button>
          )}
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

      {/* Graph canvas */}
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
            const reason = link.reason ?? '';
            if (!reason) return '';
            return `<div style="background:rgba(10,10,10,0.92);padding:6px 10px;border-radius:6px;font-size:11px;max-width:240px;border:1px solid rgba(255,255,255,0.1)">
              <span style="color:#a1a1aa">${reason}</span>
            </div>`;
          }}
          linkColor={() => 'rgba(255,255,255,0.12)'}
          linkWidth={1}
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={() => 'rgba(52,211,153,0.6)'}
          linkThreeObjectExtend
          linkThreeObject={(link: unknown) => {
            if (typeof link !== 'object' || link == null) return new THREE.Object3D();
            const rel = link as GraphLink;
            const text = typeof rel.reason === 'string' ? rel.reason.trim() : '';
            if (!text) return new THREE.Object3D();
            return buildTextSprite(text, '#a1a1aa');
          }}
          linkPositionUpdate={(sprite, link) => {
            const coords = extractLinkCoords(link);
            sprite.position.set(
              (coords.start.x + coords.end.x) / 2,
              (coords.start.y + coords.end.y) / 2,
              (coords.start.z + coords.end.z) / 2,
            );
          }}
          onNodeClick={(node: any) => {
            if (node?.id) setSelectedNode(node as GraphNodeData);
          }}
        />
      </div>

      {/* Node detail panel */}
      {selectedNode && (
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
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex gap-3 text-[10px] text-white/30">
        <span>ЛКМ — вращение</span>
        <span>ПКМ — перемещение</span>
        <span>Скролл — масштаб</span>
      </div>
    </div>
  );
};

export default GraphPage;
