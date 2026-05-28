// src/pages/GoalPage.tsx
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  CheckCircle2,
  Circle,
  Clock,
  Target,
  Calendar,
  Flag,
  MessageSquare,
  Plus,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { chatApi, goalsApi, type GoalTaskDto } from '@/lib/api-client';
import RadialPulseLoader from '@/components/ui/loading-animation';
import Breadcrumbs from '@/components/Breadcrumbs';
import { GrowthButtonDanger, GrowthButtonPrimary, GrowthInput, GrowthSelect } from '@/components/ui/growth-field';
import {
  type TaskPhase,
  TASK_PHASES,
  TASK_PHASE_LABELS,
  getProgressFromTasks,
  getWeeklyActivityFromTasks,
  groupTasksByPhase,
} from '@/lib/goal-tasks-utils';

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
  active: { label: 'Активная', color: '#60a5fa' },
  completed: { label: 'Выполнена', color: '#34d399' },
  paused: { label: 'На паузе', color: '#fbbf24' },
  cancelled: { label: 'Отменена', color: '#f87171' },
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#f87171', medium: '#fbbf24', low: '#34d399',
};

const cardStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' };

export default function GoalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [entries, setEntries] = useState<RelatedEntry[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [tasks, setTasks] = useState<GoalTaskDto[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskPhase, setNewTaskPhase] = useState<TaskPhase>('now');
  const [doneExpanded, setDoneExpanded] = useState(false);
  const [expandedPhase, setExpandedPhase] = useState<Partial<Record<TaskPhase, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkedThread, setLinkedThread] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!id) return;
    const list = await goalsApi.getTasks(id);
    setTasks(list);
    return list;
  }, [id]);

  const reloadGoal = useCallback(async () => {
    if (!id) return;
    const g = await goalsApi.getById(id);
    setGoal(g);
    return g;
  }, [id]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      goalsApi.getById(id),
      goalsApi.getRelatedEntries(id).catch(() => []),
      goalsApi.getConcepts(id).catch(() => []),
      goalsApi.getTasks(id).catch(() => []),
    ])
      .then(([g, e, c, t]) => {
        setGoal(g);
        setEntries(e ?? []);
        setConcepts(c ?? []);
        setTasks(t ?? []);
      })
      .catch(() => setError('Не удалось загрузить цель'))
      .finally(() => setLoading(false));
    chatApi.getEntityThreads('goal', id)
      .then((ids) => setLinkedThread(ids[0] ?? null))
      .catch(() => undefined);
  }, [id]);

  const handleAddTask = async () => {
    if (!id || !newTaskTitle.trim()) return;
    try {
      await goalsApi.createTask(id, {
        title: newTaskTitle.trim(),
        phase: newTaskPhase,
        due_date: newTaskDue || undefined,
        source: 'user',
      });
      setNewTaskTitle('');
      setNewTaskDue('');
      await loadTasks();
      await reloadGoal();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось добавить задачу');
    }
  };

  const handleToggle = async (task: GoalTaskDto) => {
    if (!id) return;
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await goalsApi.updateTask(id, task.id, { status: nextStatus });
      const list = await loadTasks();
      const g = await reloadGoal();
      const prog = getProgressFromTasks(list ?? []);
      if (prog.total > 0 && prog.percent === 100 && g?.status === 'completed') {
        toast.success('Все задачи выполнены — цель достигнута');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось обновить задачу');
    }
  };

  const handleRemove = async (taskId: string) => {
    if (!id) return;
    try {
      await goalsApi.deleteTask(id, taskId);
      await loadTasks();
      await reloadGoal();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось удалить задачу');
    }
  };

  const handleDeleteGoal = async () => {
    if (!id) return;
    const confirmed = globalThis.confirm('Удалить эту цель? Все связанные задачи тоже будут удалены.');
    if (!confirmed) return;
    setDeleting(true);
    try {
      await goalsApi.delete(id);
      toast.success('Цель удалена');
      navigate('/development');
    } catch {
      toast.error('Не удалось удалить цель');
      setDeleting(false);
    }
  };

  const handleAiSuggest = async () => {
    if (!id || !goal) return;
    setAiLoading(true);
    try {
      const suggestions = await goalsApi.suggestTasks(id);
      if (suggestions.length === 0) {
        toast.error('ИИ не предложил шагов — попробуй ещё раз');
        return;
      }
      for (const item of suggestions) {
        await goalsApi.createTask(id, {
          title: item.title,
          description: item.description,
          phase: item.phase,
          source: 'ai',
        });
      }
      await loadTasks();
      await reloadGoal();
      toast.success(`Добавлено шагов: ${suggestions.length}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось создать шаги');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center growth-page">
        <RadialPulseLoader text="Загрузка..." size={120} color="#ffffff" />
      </div>
    );
  }

  if (error || !goal || !id) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 growth-page">
        <p className="text-gray-400">{error ?? 'Цель не найдена'}</p>
        <Link to="/development" className="text-sm text-gray-500 hover:text-white flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> К росту
        </Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[goal.status] ?? { label: goal.status, color: '#a78bfa' };
  const priorityColor = goal.priority ? (PRIORITY_COLORS[goal.priority] ?? '#a78bfa') : '#a78bfa';
  const progress = getProgressFromTasks(tasks);
  const weekly = getWeeklyActivityFromTasks(tasks);
  const maxWeek = Math.max(...weekly.map((w) => w.count), 1);

  const targetDate = goal.target_date
    ? new Date(goal.target_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const createdDate = new Date(goal.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const doneTasks = tasks.filter((t) => t.status === 'completed');
  const pendingByPhase = groupTasksByPhase(pendingTasks);
  const isCompleted = goal.status === 'completed';

  return (
    <div
      className="growth-page min-h-screen transition-opacity"
      style={{ opacity: isCompleted ? 0.88 : 1 }}
    >
      <div className="px-6 pt-6 pb-2">
        <Breadcrumbs crumbs={[
          { label: 'Главная', to: '/navigation' },
          { label: 'Рост', to: '/development' },
          { label: goal.title },
        ]} />
        <div className="flex items-start gap-3 mt-5">
          <Target className="w-6 h-6 shrink-0 mt-1" style={{ color: priorityColor }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{goal.title}</h1>
              <span
                className="text-xs px-2 py-1 rounded-lg shrink-0"
                style={{ background: `${statusCfg.color}20`, color: statusCfg.color }}
              >
                {statusCfg.label}
              </span>
            </div>
            {goal.description && (
              <p className="text-sm text-white/50 mt-2 max-w-3xl">{goal.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Прогресс */}
      <div className="px-6 pt-6 pb-10">
        <div
          className="mx-auto w-full max-w-6xl rounded-2xl px-8 py-8"
          style={{
            background: isCompleted
              ? 'linear-gradient(135deg, rgba(52,211,153,0.06) 0%, rgba(52,211,153,0.02) 100%)'
              : 'linear-gradient(135deg, rgba(52,211,153,0.1) 0%, rgba(96,165,250,0.07) 100%)',
            border: isCompleted
              ? '1px solid rgba(52,211,153,0.22)'
              : '1px solid rgba(52,211,153,0.2)',
          }}
        >
          {isCompleted && (
            <div
              className="mb-5 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
              style={{ background: 'rgba(52,211,153,0.1)', color: '#6ee7b7' }}
            >
              <CheckCircle2 size={16} />
              Цель выполнена — все задачи закрыты
            </div>
          )}
          {progress.total === 0 ? (
            <p className="text-sm text-white/45 leading-relaxed">
              Шагов пока нет — добавь первую задачу ниже или попроси ИИ предложить план.
            </p>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Прогресс по задачам</p>
                  <p
                    className="text-5xl sm:text-6xl font-bold tabular-nums"
                    style={{ color: isCompleted ? '#34d399' : '#ffffff' }}
                  >
                    {progress.percent}%
                  </p>
                </div>
                <p className="text-sm font-medium" style={{ color: isCompleted ? '#6ee7b7' : 'rgba(52,211,153,0.9)' }}>
                  {progress.completed} из {progress.total} выполнено
                </p>
              </div>
              <div className="h-5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.max(progress.percent, 4)}%`,
                    background: isCompleted
                      ? '#34d399'
                      : 'linear-gradient(90deg, #34d399, #22d3ee, #60a5fa)',
                    boxShadow: progress.percent > 0 ? '0 0 24px rgba(52,211,153,0.4)' : undefined,
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="container mx-auto px-6 pb-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Задачи — главный блок */}
            <div className="rounded-2xl p-5" style={cardStyle}>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm font-semibold text-white">Задачи</h2>
                </div>
                {!isCompleted && (
                  <button
                    type="button"
                    onClick={handleAiSuggest}
                    disabled={aiLoading}
                    className="flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-xl transition disabled:opacity-50"
                    style={{
                      background: 'rgba(167,139,250,0.12)',
                      border: '1px solid rgba(167,139,250,0.25)',
                      color: '#a78bfa',
                    }}
                  >
                    <Sparkles size={12} className={aiLoading ? 'animate-pulse' : ''} />
                    {aiLoading ? 'Думаю…' : 'Шаги от ИИ'}
                  </button>
                )}
              </div>

              {!isCompleted && (
                <>
                  <p className="text-xs text-white/35 mb-3">
                    «Сейчас» — фокус, «Дальше» — следующий этап, «Бэклог» — всё остальное.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 mb-5 flex-wrap">
                    <GrowthInput
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                      placeholder="Новая задача…"
                      className="flex-1 min-w-[200px]"
                    />
                    <GrowthSelect
                      value={newTaskPhase}
                      onChange={(e) => setNewTaskPhase(e.target.value as TaskPhase)}
                      className="w-full sm:w-36"
                    >
                      {TASK_PHASES.map((p) => (
                        <option key={p} value={p}>{TASK_PHASE_LABELS[p]}</option>
                      ))}
                    </GrowthSelect>
                    <GrowthInput
                      type="date"
                      value={newTaskDue}
                      onChange={(e) => setNewTaskDue(e.target.value)}
                      className="w-full sm:w-40"
                    />
                    <GrowthButtonPrimary onClick={handleAddTask} className="shrink-0">
                      <Plus size={14} /> Добавить
                    </GrowthButtonPrimary>
                  </div>
                </>
              )}

              {pendingTasks.length > 0 ? (
                <div className="space-y-5 mb-4">
                  {TASK_PHASES.map((phase) => {
                    const phaseTasks = pendingByPhase[phase];
                    if (phaseTasks.length === 0) return null;
                    const showAll = expandedPhase[phase];
                    const visible = showAll ? phaseTasks : phaseTasks.slice(0, 6);
                    const hidden = phaseTasks.length - visible.length;
                    return (
                      <div key={phase}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] uppercase tracking-wider text-white/40">
                            {TASK_PHASE_LABELS[phase]}
                            <span className="ml-1.5 text-white/25">({phaseTasks.length})</span>
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          {visible.map((task) => (
                            <TaskRow key={task.id} task={task} onToggle={() => void handleToggle(task)} onRemove={handleRemove} />
                          ))}
                        </div>
                        {hidden > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedPhase((prev) => ({ ...prev, [phase]: true }))}
                            className="mt-2 text-xs text-emerald-400/80 hover:text-emerald-300"
                          >
                            Показать ещё {hidden}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {doneTasks.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setDoneExpanded((v) => !v)}
                    className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/30 mb-2 hover:text-white/50"
                  >
                    Выполнено ({doneTasks.length})
                    <span>{doneExpanded ? '▲' : '▼'}</span>
                  </button>
                  {doneExpanded && (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {doneTasks.map((task) => (
                        <TaskRow key={task.id} task={task} onToggle={handleToggle} onRemove={handleRemove} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {tasks.length === 0 && (
                <p className="text-sm text-white/30 py-4 text-center">
                  Добавь задачу вручную или нажми «Шаги от ИИ»
                </p>
              )}
            </div>

            {/* Активность за неделю */}
            <div className="rounded-2xl p-5" style={cardStyle}>
              <h2 className="text-sm font-semibold text-white mb-3">Активность за неделю</h2>
              <div className="flex items-end gap-2 h-20">
                {weekly.map((w) => (
                  <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t transition-all"
                      style={{
                        height: `${Math.max(8, (w.count / maxWeek) * 64)}px`,
                        background: w.count > 0 ? 'rgba(52,211,153,0.7)' : 'rgba(255,255,255,0.06)',
                      }}
                    />
                    <span className="text-[9px] text-white/30">{w.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/30 mt-2">Завершённые задачи по дням</p>
            </div>

            {entries.length > 0 && (
              <div className="rounded-2xl p-5" style={cardStyle}>
                <h2 className="text-sm text-gray-500 mb-3">Связанные наблюдения</h2>
                <div className="space-y-2">
                  {entries.map((e) => (
                    <div
                      key={e.id}
                      className="p-3 rounded-xl text-sm text-gray-300 leading-relaxed"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      {e.content_summary ?? e.content}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
              {goal.priority && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Flag className="w-3.5 h-3.5" /> Приоритет
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded"
                    style={{ background: `${priorityColor}20`, color: priorityColor }}
                  >
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
            </div>

            {concepts.length > 0 && (
              <div className="rounded-2xl p-5" style={cardStyle}>
                <h2 className="text-sm text-gray-500 mb-3">Концепты</h2>
                <div className="flex flex-wrap gap-2">
                  {concepts.map((c) => (
                    <span
                      key={c.id}
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {linkedThread && (
              <Link
                to={`/chat?goalId=${id}`}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
              >
                <MessageSquare className="w-4 h-4" />
                Чат по цели
              </Link>
            )}

            <GrowthButtonDanger
              onClick={handleDeleteGoal}
              disabled={deleting}
              className="w-full"
            >
              <Trash2 size={14} />
              {deleting ? 'Удаление…' : 'Удалить цель'}
            </GrowthButtonDanger>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onRemove,
}: {
  task: GoalTaskDto;
  onToggle: () => void;
  onRemove: (id: string) => void;
}) {
  const done = task.status === 'completed';
  return (
    <div
      className="flex items-start gap-2 rounded-lg px-3 py-2 group"
      style={{
        background: done ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${done ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="mt-0.5 shrink-0 text-white/40 hover:text-emerald-400 transition"
      >
        {done ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Circle size={18} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${done ? 'line-through text-white/40' : 'text-white/85'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {task.source === 'ai' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300">
              ИИ
            </span>
          )}
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/35">
            {TASK_PHASE_LABELS[task.phase]}
          </span>
          {task.dueDate && (
            <span className="text-[10px] text-white/35">{task.dueDate}</span>
          )}
        </div>
      </div>
      {task.status !== 'completed' && (
        <button
          type="button"
          onClick={() => onRemove(task.id)}
          className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-red-400 transition shrink-0"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
