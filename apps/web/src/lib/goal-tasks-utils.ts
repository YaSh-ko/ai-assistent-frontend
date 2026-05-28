import type { GoalTaskDto } from '@/lib/api-client';

export type TaskPhase = GoalTaskDto['phase'];

export const TASK_PHASES: TaskPhase[] = ['now', 'next', 'backlog'];

export const TASK_PHASE_LABELS: Record<TaskPhase, string> = {
  now: 'Сейчас',
  next: 'Дальше',
  backlog: 'Бэклог',
};

export function groupTasksByPhase(tasks: GoalTaskDto[]): Record<TaskPhase, GoalTaskDto[]> {
  const groups: Record<TaskPhase, GoalTaskDto[]> = { now: [], next: [], backlog: [] };
  for (const t of tasks) {
    const phase = TASK_PHASES.includes(t.phase) ? t.phase : 'now';
    groups[phase].push(t);
  }
  return groups;
}

export function getProgressFromTasks(tasks: GoalTaskDto[]): {
  total: number;
  completed: number;
  percent: number;
} {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percent };
}

export function getWeeklyActivityFromTasks(
  tasks: GoalTaskDto[],
  days = 7,
): { label: string; count: number }[] {
  const done = tasks.filter((t) => t.status === 'completed' && t.completed_at);
  const result: { label: string; count: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('ru-RU', { weekday: 'short' });
    const count = done.filter((t) => t.completed_at?.slice(0, 10) === key).length;
    result.push({ label, count });
  }
  return result;
}

