// src/pages/ExperimentsPage.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, FlaskConical, Plus, CheckCircle2, Circle, PauseCircle } from 'lucide-react';
import { graphApi } from '@/lib/api-client';
import RadialPulseLoader from '@/components/ui/loading-animation';
import Breadcrumbs from '@/components/Breadcrumbs';

interface Experiment {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  outcome?: string | null;
  success?: number | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Circle }> = {
  active:    { label: 'Активный',   color: '#60a5fa', icon: Circle },
  completed: { label: 'Завершён',   color: '#34d399', icon: CheckCircle2 },
  paused:    { label: 'На паузе',   color: '#fbbf24', icon: PauseCircle },
  cancelled: { label: 'Отменён',    color: '#f87171', icon: Circle },
};

function getSuccessColor(value: number): string {
  if (value >= 70) return '#34d399';
  if (value >= 40) return '#fbbf24';
  return '#f87171';
}

function ExperimentCard({ exp }: { readonly exp: Experiment }) {
  const cfg = STATUS_CONFIG[exp.status] ?? { label: exp.status, color: '#a78bfa', icon: Circle };
  const Icon = cfg.icon;

  const dateStr = exp.started_at
    ? new Date(exp.started_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date(exp.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Link
      to={`/experiment/${exp.id}`}
      className="flex flex-col rounded-2xl p-5 transition-all hover:scale-[1.01] cursor-pointer"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Тег статуса */}
      <div className="mb-3">
        <span
          className="text-xs font-medium px-2 py-1 rounded inline-flex items-center gap-1"
          style={{ background: `${cfg.color}22`, color: cfg.color }}
        >
          <Icon size={10} />
          {cfg.label}
        </span>
      </div>

      {/* Заголовок */}
      <h3 className="text-white font-semibold text-base mb-2 line-clamp-2">{exp.title}</h3>

      {/* Описание */}
      <p className="text-gray-400 text-sm leading-relaxed line-clamp-4 flex-1">
        {exp.description ?? 'Описание отсутствует'}
      </p>

      {/* Результат */}
      {exp.outcome && (
        <div
          className="mt-3 px-3 py-2 rounded-lg text-xs text-gray-300 leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <span className="text-gray-500">Результат: </span>{exp.outcome}
        </div>
      )}

      {/* Успешность */}
      {exp.success != null && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-1 rounded-full"
              style={{
                width: `${Math.min(exp.success, 100)}%`,
                background: getSuccessColor(exp.success),
              }}
            />
          </div>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{exp.success}%</span>
        </div>
      )}

      {/* Дата */}
      <div
        className="mt-4 pt-3 flex items-center justify-between text-xs"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.25)' }}
      >
        <span>{dateStr}</span>
        {exp.ended_at && (
          <span>→ {new Date(exp.ended_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
        )}
      </div>
    </Link>
  );
}

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    graphApi
      .getRhizome({ node_types: ['Experiment'] })
      .then((data) => setExperiments(data.nodes ?? []))
      .catch(() => setError('Не удалось загрузить эксперименты'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center growth-page">
        <RadialPulseLoader text="Загрузка экспериментов..." size={120} color="#ffffff" />
      </div>
    );
  }

  const filtered = filter === 'all' ? experiments : experiments.filter(e => e.status === filter);
  const counts = {
    all: experiments.length,
    active: experiments.filter(e => e.status === 'active').length,
    completed: experiments.filter(e => e.status === 'completed').length,
    paused: experiments.filter(e => e.status === 'paused').length,
  };

  return (
    <div className="growth-page min-h-screen">
      {/* Хедер */}
      <div className="flex items-start justify-between px-8 pt-8 pb-6">
        <div>
          <Breadcrumbs crumbs={[{ label: 'Главная', to: '/navigation' }, { label: 'Виртуальные поля' }]} />
          <h1 className="text-4xl font-bold mt-2 mb-1">Виртуальные поля</h1>
          <p className="text-gray-500 text-sm">Сценарные ветвления и эксперименты изменения курса</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/chat"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'rgba(255,255,255,0.9)', color: '#000' }}
          >
            Создать ветку
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => navigate('/graph')}
            className="p-2.5 rounded-xl transition-all hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            title="Граф"
          >
            <FlaskConical className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Фильтры */}
      <div className="px-8 mb-6 flex gap-2 flex-wrap">
        {([
          { key: 'all', label: 'Все' },
          { key: 'active', label: 'Активные' },
          { key: 'completed', label: 'Завершённые' },
          { key: 'paused', label: 'На паузе' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filter === key ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
              color: filter === key ? '#fff' : 'rgba(255,255,255,0.4)',
              border: `1px solid ${filter === key ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {label}
            <span className="ml-1.5 opacity-50">{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* Контент */}
      <div className="px-8 pb-16">
        {(() => {
          if (error) {
            return (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <p className="text-gray-500">{error}</p>
                <button
                  onClick={() => globalThis.location.reload()}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Повторить
                </button>
              </div>
            );
          }
          if (filtered.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-32 gap-3">
                <Plus className="w-10 h-10 text-gray-700" />
                <p className="text-gray-500 text-sm">
                  {filter === 'all' ? 'Пока нет ветвлений' : 'Нет ветвлений в этой категории'}
                </p>
                {filter === 'all' && (
                  <Link to="/chat" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Создать первое ветвление →
                  </Link>
                )}
              </div>
            );
          }
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((exp) => (
                <ExperimentCard key={exp.id} exp={exp} />
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
