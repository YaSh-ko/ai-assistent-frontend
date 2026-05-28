import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

export interface GoalCardGoal {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  target_date?: string | null;
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

export default function GoalCard({
  goal,
  taskProgress,
}: {
  readonly goal: GoalCardGoal;
  readonly taskProgress: { completed: number; total: number; percent: number };
}) {
  const priorityColor = goal.priority ? (PRIORITY_COLORS[goal.priority] ?? '#A1A1AA') : '#A1A1AA';
  const statusLabel = STATUS_LABELS[goal.status] ?? goal.status;
  const targetDate = goal.target_date
    ? new Date(goal.target_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const isCompleted = goal.status === 'completed';

  return (
    <Link
      to={`/goals/${goal.id}`}
      className="flex flex-col rounded-xl p-5 transition-all hover:translate-y-[-1px] cursor-pointer"
      style={{
        background: isCompleted ? '#1a181c' : '#211D25',
        border: isCompleted ? '1px solid rgba(52,211,153,0.12)' : '1px solid rgba(255,255,255,0.06)',
        opacity: isCompleted ? 0.72 : 1,
      }}
    >
      <div className="mb-3">
        <span
          className="text-xs font-medium px-2 py-1 rounded-md"
          style={{ background: `${priorityColor}18`, color: priorityColor }}
        >
          {goal.priority === 'high' ? 'Высокий' : goal.priority === 'medium' ? 'Средний' : goal.priority === 'low' ? 'Низкий' : 'Цель'}
        </span>
      </div>
      <h3
        className="font-semibold text-sm mb-2 line-clamp-2"
        style={{ color: isCompleted ? 'rgba(255,255,255,0.55)' : '#ffffff' }}
      >
        {goal.title}
      </h3>
      <p className="text-sm leading-relaxed line-clamp-3 flex-1" style={{ color: '#A1A1AA' }}>
        {goal.description ?? 'Описание не добавлено'}
      </p>
      {taskProgress.total > 0 ? (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] mb-1" style={{ color: '#A1A1AA' }}>
            <span>Задачи</span>
            <span style={{ color: '#34d399' }}>
              {taskProgress.completed}/{taskProgress.total} · {taskProgress.percent}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${taskProgress.percent}%`,
                background: taskProgress.percent >= 100
                  ? '#34d399'
                  : 'linear-gradient(90deg, #34d399, #60a5fa)',
              }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[10px]" style={{ color: 'rgba(161,161,170,0.45)' }}>
          Шагов пока нет
        </p>
      )}
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
        {targetDate && <span style={{ color: 'rgba(161,161,170,0.4)' }}>{targetDate}</span>}
      </div>
    </Link>
  );
}
