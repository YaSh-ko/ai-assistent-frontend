// src/pages/GoalsPage.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Target, Plus, Clock, CheckCircle2, Circle } from 'lucide-react';import { goalsApi } from '@/lib/api-client';
import RadialPulseLoader from '@/components/ui/loading-animation';
import Breadcrumbs from '@/components/Breadcrumbs';

interface Goal {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  target_date?: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Активная',
  completed: 'Выполнена',
  paused: 'На паузе',
  cancelled: 'Отменена',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#f87171',
  medium: '#fbbf24',
  low: '#34d399',
};

function statusIcon(status: string) {
  if (status === 'completed') return <CheckCircle2 className="w-3 h-3" />;
  if (status === 'paused') return <Clock className="w-3 h-3" />;
  return <Circle className="w-3 h-3" />;
}

function GoalCard({ goal }: { readonly goal: Goal }) {
  const priorityColor = goal.priority ? (PRIORITY_COLORS[goal.priority] ?? '#a78bfa') : '#a78bfa';
  const statusLabel = STATUS_LABELS[goal.status] ?? goal.status;
  const targetDate = goal.target_date
    ? new Date(goal.target_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <Link
      to={`/goals/${goal.id}`}
      className="flex flex-col rounded-2xl p-5 transition-all hover:scale-[1.01] cursor-pointer"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Тег приоритета */}
      <div className="mb-3">
        <span
          className="text-xs font-medium px-2 py-1 rounded"
          style={{ background: `${priorityColor}28`, color: priorityColor }}
        >
          {goal.priority ? `Приоритет: ${goal.priority}` : 'Цель'}
        </span>
      </div>

      {/* Заголовок */}
      <h3 className="text-white font-semibold text-base mb-2 line-clamp-2">{goal.title}</h3>

      {/* Описание */}
      <p className="text-gray-400 text-sm leading-relaxed line-clamp-5 flex-1">
        {goal.description ?? 'Описание отсутствует'}
      </p>

      {/* Футер */}
      <div
        className="mt-4 pt-3 flex items-center justify-between text-xs"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        <span
          className="flex items-center gap-1"
          style={{ color: goal.status === 'completed' ? '#34d399' : 'rgba(255,255,255,0.35)' }}
        >
          {statusIcon(goal.status)}
          {statusLabel}
        </span>
        {targetDate && (
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>{targetDate}</span>
        )}
      </div>
    </Link>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    goalsApi
      .getAll()
      .then((data) => setGoals(data.goals ?? []))
      .catch(() => setError('Не удалось загрузить цели'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#000019]">
        <RadialPulseLoader text="Загрузка целей..." size={120} color="#ffffff" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000019] text-white">
      {/* Хедер */}
      <div className="flex items-start justify-between px-8 pt-8 pb-6">
        <div>
          <Breadcrumbs crumbs={[{ label: 'Главная', to: '/navigation' }, { label: 'Цели' }]} />
          <h1 className="text-4xl font-bold mt-2 mb-1">Цели</h1>
          <p className="text-gray-500 text-sm">Твои цели и желания</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/chat"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'rgba(255,255,255,0.9)', color: '#000' }}
          >
            Создать цель
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => navigate('/graph')}
            className="p-2.5 rounded-xl transition-all hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            title="Граф"
          >
            <Target className="w-4 h-4 text-gray-400" />
          </button>
        </div>
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
          if (goals.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-32 gap-3">
                <Plus className="w-10 h-10 text-gray-700" />
                <p className="text-gray-500 text-sm">Целей пока нет</p>
                <Link to="/chat" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Создать первую цель →
                </Link>
              </div>
            );
          }
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
