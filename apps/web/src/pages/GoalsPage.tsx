// src/pages/GoalsPage.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Target, Plus, Clock, CheckCircle2, Circle, Network } from 'lucide-react';
import { goalsApi } from '@/lib/api-client';
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
  const priorityColor = goal.priority ? (PRIORITY_COLORS[goal.priority] ?? '#A1A1AA') : '#A1A1AA';
  const statusLabel = STATUS_LABELS[goal.status] ?? goal.status;
  const targetDate = goal.target_date
    ? new Date(goal.target_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <Link
      to={`/goals/${goal.id}`}
      className="flex flex-col rounded-xl p-5 transition-all hover:translate-y-[-1px] cursor-pointer"
      style={{ background: '#211D25', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Тег приоритета */}
      <div className="mb-3">
        <span
          className="text-xs font-medium px-2 py-1 rounded-md"
          style={{ background: `${priorityColor}18`, color: priorityColor }}
        >
          {goal.priority === 'high' ? 'Высокий' : goal.priority === 'medium' ? 'Средний' : goal.priority === 'low' ? 'Низкий' : 'Цель'}
        </span>
      </div>

      {/* Заголовок */}
      <h3 className="font-semibold text-sm mb-2 line-clamp-2" style={{ color: '#ffffff' }}>
        {goal.title}
      </h3>

      {/* Описание */}
      <p className="text-sm leading-relaxed line-clamp-4 flex-1" style={{ color: '#A1A1AA' }}>
        {goal.description ?? 'Описание не добавлено'}
      </p>

      {/* Футер */}
      <div
        className="mt-4 pt-3 flex items-center justify-between text-xs"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span
          className="flex items-center gap-1"
          style={{ color: goal.status === 'completed' ? '#34d399' : 'rgba(161,161,170,0.5)' }}
        >
          {statusIcon(goal.status)}
          {statusLabel}
        </span>
        {targetDate && (
          <span style={{ color: 'rgba(161,161,170,0.4)' }}>{targetDate}</span>
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
      <div className="flex h-screen w-full items-center justify-center" style={{ background: '#09090b' }}>
        <RadialPulseLoader text="Загрузка..." size={120} color="#34d399" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#09090b', color: '#e4e4e7' }}>
      {/* Хедер */}
      <div
        className="flex items-start justify-between px-8 pt-8 pb-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div>
          <Breadcrumbs crumbs={[{ label: 'Главная', to: '/navigation' }, { label: 'Цели' }]} />
          <h1 className="text-3xl font-bold mt-2 mb-1 tracking-tight" style={{ color: '#ffffff' }}>
            Цели
          </h1>
          <p className="text-sm" style={{ color: '#A1A1AA' }}>Куда ты движешься</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/chat"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.3)',
              color: '#34d399',
            }}
          >
            Новая цель
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => navigate('/graph')}
            className="p-2 rounded-lg transition-all"
            style={{ background: '#211D25', border: '1px solid rgba(255,255,255,0.07)', color: '#A1A1AA' }}
            title="Граф знаний"
          >
            <Network className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Контент */}
      <div className="px-8 py-6 pb-16">
        {(() => {
          if (error) {
            return (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <p style={{ color: '#A1A1AA' }}>{error}</p>
                <button
                  onClick={() => globalThis.location.reload()}
                  className="text-sm"
                  style={{ color: '#A1A1AA' }}
                >
                  Повторить
                </button>
              </div>
            );
          }
          if (goals.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-32 gap-3">
                <Target className="w-8 h-8" style={{ color: 'rgba(161,161,170,0.3)' }} />
                <p className="text-sm" style={{ color: '#A1A1AA' }}>Целей пока нет</p>
                <Link to="/chat" className="text-sm" style={{ color: '#34d399' }}>
                  Поставить первую цель →
                </Link>
              </div>
            );
          }
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
