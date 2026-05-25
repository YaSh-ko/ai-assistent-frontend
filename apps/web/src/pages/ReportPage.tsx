// src/pages/ReportPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { entriesApi, goalsApi, graphApi } from '@/lib/api-client';
import RadialPulseLoader from '@/components/ui/loading-animation';
import Breadcrumbs from '@/components/Breadcrumbs';

// ── helpers ──────────────────────────────────────────────────────────────────

function CircleProgress({ value, max = 100, size = 110, label }: {
  readonly value: number; readonly max?: number; readonly size?: number; readonly label: string;
}) {
  const pct = Math.min(value / max, 1);
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="rgba(255,255,255,0.85)" strokeWidth={8}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{Math.round(value)}</span>
          <span className="text-[10px] text-gray-500">%</span>
        </div>
      </div>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}

function DotChart({ data }: { readonly data: readonly { readonly label: string; readonly value: number }[] }) {
  if (!data.length) return <div className="text-gray-600 text-xs">Нет данных</div>;

  const max = Math.max(...data.map(d => d.value), 1);
  const rows = 8;

  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((d) => {
        const filled = Math.round((d.value / max) * rows);
        return (
          <div key={d.label} className="flex flex-col-reverse gap-[3px] items-center">
            {Array.from({ length: rows }, (_, r) => (
              <div
                key={`${d.label}-${r}`}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: r < filled ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.1)' }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

const SEGMENT_COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#fb923c', '#e879f9'];

function DonutChart({ segments }: { readonly segments: readonly { readonly label: string; readonly value: number; readonly color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const size = 140;
  const r = 52;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {segments.map((seg) => {
          const dash = (seg.value / total) * circ;
          const gap = circ - dash;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle key={seg.label}
              cx={size / 2} cy={size / 2} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={16}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
            />
          );
        })}
      </g>
    </svg>
  );
}

// ── main component ────────────────────────────────────────────────────────────

interface Stats {
  totalEntries: number;
  totalGoals: number;
  completedGoals: number;
  activeGoals: number;
  plannedGoals: number;
  nodesByType: Record<string, number>;
  entriesByMonth: { label: string; value: number }[];
}

export default function ReportPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      entriesApi.getAll().catch(() => ({ entries: [] })),
      goalsApi.getAll().catch(() => ({ goals: [] })),
      graphApi.getRhizome().catch(() => ({ nodes: [] })),
    ]).then(([entriesData, goalsData, graphData]) => {
      const entries: any[] = entriesData.entries ?? [];
      const goals: any[] = goalsData.goals ?? [];
      const nodes: any[] = graphData.nodes ?? [];

      // Entries by month (last 8 months)
      const monthMap: Record<string, number> = {};
      entries.forEach(e => {
        const d = new Date(e.event_date ?? e.created_at);
        const key = d.toLocaleDateString('ru-RU', { month: 'short' });
        monthMap[key] = (monthMap[key] ?? 0) + 1;
      });
      const entriesByMonth = Object.entries(monthMap)
        .slice(-8)
        .map(([label, value]) => ({ label, value }));

      // Nodes by type
      const nodesByType: Record<string, number> = {};
      nodes.forEach((n: any) => {
        nodesByType[n.type] = (nodesByType[n.type] ?? 0) + 1;
      });

      setStats({
        totalEntries: entries.length,
        totalGoals: goals.length,
        completedGoals: goals.filter(g => g.status === 'completed').length,
        activeGoals: goals.filter(g => g.status === 'active').length,
        plannedGoals: goals.filter(g => g.status === 'planned' || g.status === 'paused').length,
        nodesByType,
        entriesByMonth,
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center growth-page">
        <RadialPulseLoader text="Загрузка отчёта..." size={120} color="#ffffff" />
      </div>
    );
  }

  const s = stats!;
  const goalPct = s.totalGoals ? Math.round((s.completedGoals / s.totalGoals) * 100) : 0;
  const activePct = s.totalGoals ? Math.round((s.activeGoals / s.totalGoals) * 100) : 0;

  const typeLabels: Record<string, string> = {
    Entry: 'События', Concept: 'Концепты', Goal: 'Цели',
    Experiment: 'Эксперименты', Analysis: 'Анализы',
  };
  const totalNodes = Object.values(s.nodesByType).reduce((a, b) => a + b, 0) || 1;
  const donutSegments = Object.entries(s.nodesByType).map(([type, count], i) => ({
    label: typeLabels[type] ?? type,
    value: count,
    color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
  }));

  return (
    <div className="growth-page min-h-screen">
      {/* Хедер */}
      <div className="flex items-start justify-between px-8 pt-8 pb-6">
        <div>
          <Breadcrumbs crumbs={[{ label: 'Главная', to: '/navigation' }, { label: 'Мемуары' }]} />
          <h1 className="text-4xl font-bold mt-2 mb-1">Отчёт</h1>
          <p className="text-gray-500 text-sm">Общее собирательное со всех разделов</p>
        </div>
        <button
          onClick={() => navigate('/graph')}
          className="px-4 py-2 rounded-xl text-sm text-gray-400 transition-all hover:text-white"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          ← Граф
        </button>
      </div>

      <div className="px-8 pb-16 space-y-4">

        {/* Верхний ряд виджетов */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Всего событий */}
          <div className="rounded-2xl p-5 col-span-1 sm:col-span-2 flex flex-col justify-between"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
              <span>⚡</span> Всего событий
            </div>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-bold">{s.totalEntries}</span>
              <span className="text-2xl text-gray-600 mb-1">записей</span>
            </div>
            <div className="mt-4 flex gap-1">
              {s.entriesByMonth.map((m) => (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-sm"
                    style={{
                      height: 24,
                      background: `rgba(255,255,255,${0.1 + (m.value / Math.max(...s.entriesByMonth.map(x => x.value), 1)) * 0.7})`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Выполнение целей */}
          <div className="rounded-2xl p-5 flex flex-col items-center justify-between gap-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <CircleProgress value={goalPct} label="Выполнено целей" />
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>✓</span>
              <span>Цели</span>
              <span className="px-2 py-0.5 rounded-full text-white"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                {goalPct}%
              </span>
            </div>
          </div>

          {/* Активные цели */}
          <div className="rounded-2xl p-5 flex flex-col items-center justify-between gap-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <CircleProgress value={activePct} label="Активных целей" />
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>✦</span>
              <span>В работе</span>
              <span className="px-2 py-0.5 rounded-full text-white"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                {activePct}%
              </span>
            </div>
          </div>
        </div>

        {/* Нижний ряд */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Динамика событий — dot chart */}
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
              <span>◷</span>
              <span>Динамика событий по месяцам</span>
            </div>
            <DotChart data={s.entriesByMonth} />
            <div className="flex gap-2 mt-2">
              {s.entriesByMonth.map((m) => (
                <span key={m.label} className="flex-1 text-center text-[10px] text-gray-600">{m.label}</span>
              ))}
            </div>
          </div>

          {/* Распределение по типам — donut */}
          <div className="rounded-2xl p-5 flex gap-6 items-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <div className="text-xs text-gray-500 mb-4">Распределение<br />по типам узлов</div>
              <div className="space-y-1.5">
                {donutSegments.map((seg) => (
                  <div key={seg.label} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: seg.color }} />
                    <span className="text-gray-300">{seg.label}</span>
                    <span style={{ color: seg.color }}>
                      {Math.round((seg.value / totalNodes) * 100)}%
                    </span>
                  </div>
                ))}
                {donutSegments.length === 0 && (
                  <span className="text-gray-600 text-xs">Нет данных</span>
                )}
              </div>
            </div>
            {donutSegments.length > 0 && <DonutChart segments={donutSegments} />}
          </div>
        </div>

        {/* Счётчики целей */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Выполнено', value: s.completedGoals, color: '#34d399' },
            { label: 'В работе', value: s.activeGoals, color: '#60a5fa' },
            { label: 'На паузе', value: s.plannedGoals, color: '#fbbf24' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl p-5 flex flex-col items-center gap-1"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-4xl font-bold" style={{ color }}>
                {String(value).padStart(2, '0')}
              </span>
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
