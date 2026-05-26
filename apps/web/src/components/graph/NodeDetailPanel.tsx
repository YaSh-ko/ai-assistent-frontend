import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
import { insightsApi } from '@/lib/api-client';

export interface GraphNodeData {
  id: string;
  type: string;
  description?: string;
  title?: string;
  status?: string;
  priority?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface GraphLink {
  source: string | { id: string };
  target: string | { id: string };
  type?: string;
  reason?: string;
}

interface NodeDetailPanelProps {
  readonly node: GraphNodeData;
  readonly onClose: () => void;
  readonly allNodes?: GraphNodeData[];
  readonly allLinks?: GraphLink[];
}

const TYPE_META: Record<string, { label: string; color: string; route: string }> = {
  Entry: { label: 'Наблюдение', color: '#34d399', route: '/event' },
  Goal: { label: 'Цель', color: '#f59e0b', route: '/goals' },
  Experiment: { label: 'Задача', color: '#60a5fa', route: '/experiment' },
};

const ENTITY_TYPE_MAP: Record<string, string> = {
  Entry: 'observation',
  Goal: 'goal',
  Experiment: 'task',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Активна',
  completed: 'Завершена',
  archived: 'В архиве',
  in_progress: 'В работе',
  pending: 'Ожидает',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

function linkId(end: string | { id: string }): string {
  return typeof end === 'string' ? end : end.id;
}

export default function NodeDetailPanel({ node, onClose, allNodes = [], allLinks = [] }: NodeDetailPanelProps) {
  const meta = TYPE_META[node.type] ?? { label: node.type, color: '#a1a1aa', route: '' };
  const title = node.title || node.description || node.id;
  const description = node.description && node.description !== node.title ? node.description : null;
  const entityPath = meta.route ? `${meta.route}/${node.id}` : null;

  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const relatedNodes = allLinks.reduce<GraphNodeData[]>((acc, link) => {
    const src = linkId(link.source);
    const tgt = linkId(link.target);
    let relatedId: string | null = null;
    if (src === node.id) relatedId = tgt;
    else if (tgt === node.id) relatedId = src;
    if (relatedId) {
      const found = allNodes.find(n => n.id === relatedId);
      if (found && !acc.some(n => n.id === found.id)) acc.push(found);
    }
    return acc;
  }, []);

  const handleAnalyze = useCallback(async () => {
    setAnalysisLoading(true);
    setAnalysis(null);
    const clusterEntities = [node, ...relatedNodes].map(n => ({
      id: n.id,
      type: ENTITY_TYPE_MAP[n.type] || n.type,
      title: (n.title || n.description || '') as string,
      description: (n.description || '') as string,
      status: (n.status || '') as string,
      created_at: (n.created_at || '') as string,
    }));
    try {
      const result = await insightsApi.summarize({
        entities: clusterEntities,
        context: 'cluster_analysis',
      });
      setAnalysis(result.summary);
    } catch {
      setAnalysis('Не удалось сгенерировать анализ.');
    } finally {
      setAnalysisLoading(false);
    }
  }, [node, relatedNodes]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-white/10 px-4 pb-3 pt-4">
        <div className="min-w-0 flex-1">
          <span
            className="inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ backgroundColor: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}44` }}
          >
            {meta.label}
          </span>
          <h3 className="mt-2 text-sm font-medium leading-snug text-white/90 line-clamp-3">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-white/70"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {description && (
          <p className="mb-3 text-xs leading-relaxed text-white/60">{description}</p>
        )}

        <div className="space-y-2 mb-4">
          {node.status && (
            <Row label="Статус" value={STATUS_LABELS[node.status] ?? String(node.status)} />
          )}
          {node.priority && (
            <Row label="Приоритет" value={PRIORITY_LABELS[node.priority] ?? String(node.priority)} />
          )}
          {node.created_at && (
            <Row label="Создано" value={formatDate(String(node.created_at))} />
          )}
        </div>

        {/* Related nodes */}
        {relatedNodes.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-wider text-white/30 mb-2">
              Связи ({relatedNodes.length})
            </div>
            <div className="space-y-1.5">
              {relatedNodes.slice(0, 8).map(rn => {
                const rm = TYPE_META[rn.type] ?? { label: rn.type, color: '#a1a1aa' };
                return (
                  <div key={rn.id} className="flex items-center gap-2 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: rm.color }} />
                    <span className="text-white/60 truncate">{rn.title || rn.description || rn.id}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cluster analysis */}
        {relatedNodes.length > 0 && (
          <div>
            <button
              onClick={handleAnalyze}
              disabled={analysisLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-2 text-[11px] font-medium transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(52,211,153,0.12))',
                border: '1px solid rgba(167,139,250,0.2)',
                color: '#a78bfa',
              }}
            >
              {analysisLoading ? (
                <><Loader2 size={13} className="animate-spin" /> Анализ...</>
              ) : (
                <><Sparkles size={13} /> Анализ кластера</>
              )}
            </button>

            {analysis && (
              <div
                className="mt-2 rounded-lg p-3 text-[11px] leading-relaxed text-white/70"
                style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)' }}
              >
                {analysis}
              </div>
            )}
          </div>
        )}
      </div>

      {entityPath && (
        <div className="border-t border-white/10 px-4 py-3">
          <Link
            to={entityPath}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition"
            style={{ backgroundColor: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}33` }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${meta.color}28`; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = `${meta.color}18`; }}
          >
            <ExternalLink size={13} />
            Открыть {meta.label.toLowerCase()}
          </Link>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-xs">
      <span className="text-white/40">{label}</span>
      <span className="text-white/75">{value}</span>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}
