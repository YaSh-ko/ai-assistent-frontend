// src/pages/GoalPage.tsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, Circle, Clock, Target, Calendar, Flag, MessageSquare } from 'lucide-react';
import { chatApi, goalsApi } from '@/lib/api-client';
import RadialPulseLoader from '@/components/ui/loading-animation';
import Breadcrumbs from '@/components/Breadcrumbs';

interface Goal {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  target_date?: string | null;
  achieved_at?: string | null;
  created_at: string;
}

interface RelatedEntry { id: string; content: string; content_summary?: string | null; }
interface Concept { id: string; name: string; description?: string | null; }

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active:    { label: 'Активная',  color: '#60a5fa' },
  completed: { label: 'Выполнена', color: '#34d399' },
  paused:    { label: 'На паузе',  color: '#fbbf24' },
  cancelled: { label: 'Отменена',  color: '#f87171' },
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#f87171', medium: '#fbbf24', low: '#34d399',
};

// SMART критерии — парсим из description или показываем заглушки
const SMART_KEYS = [
  { key: 'S', label: 'Specific',    ru: 'Конкретная',    hint: 'Что именно нужно достичь?' },
  { key: 'M', label: 'Measurable',  ru: 'Измеримая',     hint: 'Как измерить результат?' },
  { key: 'A', label: 'Achievable',  ru: 'Достижимая',    hint: 'Реально ли это выполнить?' },
  { key: 'R', label: 'Relevant',    ru: 'Значимая',      hint: 'Зачем это важно?' },
  { key: 'T', label: 'Time-bound',  ru: 'Ограниченная',  hint: 'Когда должно быть выполнено?' },
];

export default function GoalPage() {
  const { id } = useParams<{ id: string }>();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [entries, setEntries] = useState<RelatedEntry[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkedThread, setLinkedThread] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      goalsApi.getById(id),
      goalsApi.getRelatedEntries(id).catch(() => []),
      goalsApi.getConcepts(id).catch(() => []),
    ])
      .then(([g, e, c]) => {
        setGoal(g);
        setEntries(e ?? []);
        setConcepts(c ?? []);
      })
      .catch(() => setError('Не удалось загрузить цель'))
      .finally(() => setLoading(false));
    chatApi.getEntityThreads("goal", id)
      .then(ids => setLinkedThread(ids[0] ?? null))
      .catch(() => undefined);
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center growth-page">
        <RadialPulseLoader text="Загрузка..." size={120} color="#ffffff" />
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 growth-page">
        <p className="text-gray-400">{error ?? 'Цель не найдена'}</p>
        <Link to="/goals" className="text-sm text-gray-500 hover:text-white flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> К целям
        </Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[goal.status] ?? { label: goal.status, color: '#a78bfa' };
  const priorityColor = goal.priority ? (PRIORITY_COLORS[goal.priority] ?? '#a78bfa') : '#a78bfa';
  const targetDate = goal.target_date
    ? new Date(goal.target_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const createdDate = new Date(goal.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  // Пытаемся найти SMART-блоки в description (формат "S: ...\nM: ...")
  const smartData: Record<string, string> = {};
  const description = goal.description;
  if (description) {
    SMART_KEYS.forEach(({ key }) => {
      const match = new RegExp(String.raw`${key}:\s*([^\n]+)`, 'i').exec(description);
      if (match) smartData[key] = match[1].trim();
    });
  }
  const hasSmart = Object.keys(smartData).length > 0;

  return (
    <div className="growth-page min-h-screen">
      {/* Хедер */}
      <div className="border-b px-6 py-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Breadcrumbs crumbs={[
          { label: 'Главная', to: '/navigation' },
          { label: 'Цели', to: '/goals' },
          { label: goal.title },
        ]} />
        <div className="flex items-center gap-2 flex-1 min-w-0 mt-2">
          <Target className="w-5 h-5 shrink-0" style={{ color: priorityColor }} />
          <h1 className="text-xl font-bold truncate">{goal.title}</h1>
          <span className="text-xs px-2 py-1 rounded-lg shrink-0 ml-auto"
            style={{ background: `${statusCfg.color}20`, color: statusCfg.color }}>
            {statusCfg.label}
          </span>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Левая колонка — основная инфо */}
          <div className="lg:col-span-2 space-y-5">

            {/* Описание */}
            {goal.description && !hasSmart && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 className="text-sm text-gray-500 mb-3">Описание</h2>
                <p className="text-gray-300 text-sm leading-relaxed">{goal.description}</p>
              </div>
            )}

            {/* SMART блоки */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-semibold text-white">Методика SMART</h2>
                <span className="text-xs text-gray-600">Критерии постановки цели</span>
              </div>
              <div className="space-y-3">
                {SMART_KEYS.map(({ key, label, ru, hint }) => (
                  <div key={key} className="flex gap-3">
                    <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ background: 'rgba(255,255,255,0.08)', color: smartData[key] ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                      {key}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-medium text-white">{ru}</span>
                        <span className="text-xs text-gray-600">{label}</span>
                      </div>
                      <p className="text-sm" style={{ color: smartData[key] ? '#d1d5db' : 'rgba(255,255,255,0.2)' }}>
                        {smartData[key] ?? hint}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Связанные события */}
            {entries.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 className="text-sm text-gray-500 mb-3">Связанные события</h2>
                <div className="space-y-2">
                  {entries.map(e => (
                    <div key={e.id} className="p-3 rounded-xl text-sm text-gray-300 leading-relaxed"
                      style={{ background: 'rgba(255,255,255,0.03)' }}>
                      {e.content_summary ?? e.content}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Правая колонка — мета */}
          <div className="space-y-4">

            {/* Даты и приоритет */}
            <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {goal.priority && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Flag className="w-3.5 h-3.5" /> Приоритет
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded"
                    style={{ background: `${priorityColor}20`, color: priorityColor }}>
                    {goal.priority}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Circle className="w-3.5 h-3.5" /> Статус
                </div>
                <span className="text-xs" style={{ color: statusCfg.color }}>{statusCfg.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" /> Создана
                </div>
                <span className="text-xs text-gray-400">{createdDate}</span>
              </div>
              {targetDate && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5" /> Дедлайн
                  </div>
                  <span className="text-xs text-gray-400">{targetDate}</span>
                </div>
              )}
              {goal.achieved_at && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#34d399' }} /> Выполнена
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(goal.achieved_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                  </span>
                </div>
              )}
            </div>

            {/* Концепты */}
            {concepts.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 className="text-sm text-gray-500 mb-3">Концепты</h2>
                <div className="flex flex-wrap gap-2">
                  {concepts.map(c => (
                    <span key={c.id} className="text-xs px-2 py-1 rounded-lg"
                      style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Кнопка в чат */}
            {linkedThread && (
              <Link to={`/chat?threadId=${linkedThread}`}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
                <MessageSquare className="w-4 h-4" />
                Перейти к чату
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
