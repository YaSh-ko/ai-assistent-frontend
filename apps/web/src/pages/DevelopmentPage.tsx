import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck2, Flag, Trophy, Workflow } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import RadialPulseLoader from "@/components/ui/loading-animation";
import { goalsApi } from "@/lib/api-client";

type DevelopmentTab = "smart" | "habits" | "planner" | "year";

interface GoalItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
}

interface HabitItem {
  id: string;
  title: string;
  doneToday: boolean;
  streak: number;
}

interface TaskItem {
  id: string;
  title: string;
  date: string;
  goalId: string;
}

interface PlannerDayCell {
  day: number;
  dateKey: string;
}

interface PlannerEmptyCell {
  day: null;
  dateKey: string; // Теперь всегда строка, например "empty-2024-0-1"
}

type PlannerCell = PlannerDayCell | PlannerEmptyCell;

const HABITS_STORAGE_KEY = "delez_habits_tracker";
const TASKS_STORAGE_KEY = "delez_tasks_calendar_v1";

function loadHabits(): HabitItem[] {
  try {
    const raw = localStorage.getItem(HABITS_STORAGE_KEY);
    if (!raw) {
      return [
        { id: "habit-1", title: "Фокус-сессия 60 минут", doneToday: false, streak: 0 },
        { id: "habit-2", title: "Физическая активность", doneToday: false, streak: 0 },
        { id: "habit-3", title: "Читать 20 минут", doneToday: false, streak: 0 },
      ];
    }
    const parsed = JSON.parse(raw) as HabitItem[];
    return parsed;
  } catch {
    return [];
  }
}

function saveHabits(habits: HabitItem[]): void {
  localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
}

function buildMonthCells(nowDate: Date): PlannerCell[] {
  const year = nowDate.getFullYear();
  const month = nowDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysCount = lastDay.getDate();
  const cells: PlannerCell[] = [];

  // Пустые ячейки в начале месяца с уникальным ключом
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({ day: null, dateKey: `empty-${year}-${month}-${i}` });
  }
  for (let d = 1; d <= daysCount; d += 1) {
    const date = new Date(year, month, d);
    const yearValue = date.getFullYear();
    const monthValue = String(date.getMonth() + 1).padStart(2, "0");
    const dayValue = String(date.getDate()).padStart(2, "0");
    cells.push({ day: d, dateKey: `${yearValue}-${monthValue}-${dayValue}` });
  }
  return cells;
}

function loadTasks(): TaskItem[] {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TaskItem[];
  } catch {
    return [];
  }
}

function saveTasks(tasks: TaskItem[]): void {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

export default function DevelopmentPage() {
  const [activeTab, setActiveTab] = useState<DevelopmentTab>("smart");
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [taskTitle, setTaskTitle] = useState<string>("");
  const [taskDate, setTaskDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [taskGoalId, setTaskGoalId] = useState<string>("");
  const [plannerCells, setPlannerCells] = useState<PlannerCell[]>([]);

  useEffect(() => {
    const initialHabits = loadHabits();
    setHabits(initialHabits);
  }, []);

  useEffect(() => {
    setTasks(loadTasks());
    setPlannerCells(buildMonthCells(new Date()));
  }, []);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    goalsApi
      .getAll()
      .then((data) => {
        const loadedGoals = (data.goals ?? []) as GoalItem[];
        setGoals(loadedGoals);
      })
      .catch(() => {
        setError("Не удалось загрузить цели");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const smartProgress = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter((goal) => goal.status === "completed").length;
    const active = goals.filter((goal) => goal.status === "active").length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, active, percent };
  }, [goals]);

  const habitsStats = useMemo(() => {
    const total = habits.length;
    const done = habits.filter((habit) => habit.doneToday).length;
    const completion = total > 0 ? Math.round((done / total) * 100) : 0;
    const bestStreak = habits.reduce((max, habit) => Math.max(max, habit.streak), 0);
    return { total, done, completion, bestStreak };
  }, [habits]);

  const yearlySummary = useMemo(() => {
    return {
      achievedGoals: smartProgress.completed,
      activeGoals: smartProgress.active,
      habitsConsistency: habitsStats.completion,
      strongestHabit: habits
        .slice()
        .sort((a, b) => b.streak - a.streak)[0]?.title ?? "Пока нет данных",
    };
  }, [habits, habitsStats.completion, smartProgress.active, smartProgress.completed]);

  const toggleHabit = (habitId: string): void => {
    const next = habits.map((habit) => {
      if (habit.id !== habitId) {
        return habit;
      }

      const nextDone = !habit.doneToday;
      const nextStreak = nextDone ? habit.streak + 1 : Math.max(0, habit.streak - 1);
      return {
        ...habit,
        doneToday: nextDone,
        streak: nextStreak,
      };
    });

    setHabits(next);
    saveHabits(next);
  };

  const addTask = (): void => {
    const trimmedTitle = taskTitle.trim();
    if (!trimmedTitle || !taskDate) {
      return;
    }
    const nextTask: TaskItem = {
      id: crypto.randomUUID(), // Безопасная генерация уникального ID
      title: trimmedTitle,
      date: taskDate,
      goalId: taskGoalId,
    };
    setTasks((prev) => [nextTask, ...prev]);
    setTaskTitle("");
  };

  const removeTask = (taskId: string): void => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    for (const task of tasks) {
      const existing = map.get(task.date);
      if (existing) {
        existing.push(task);
      } else {
        map.set(task.date, [task]);
      }
    }
    return map;
  }, [tasks]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ background: '#09090b' }}>
        <RadialPulseLoader text="Загрузка..." size={120} color="#34d399" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#09090b', color: '#e4e4e7' }}>
      <div className="flex items-start justify-between px-8 pt-8 pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <Breadcrumbs crumbs={[{ label: "Главная", to: "/navigation" }, { label: "Рост" }]} />
          <h1 className="mt-2 mb-1 text-3xl font-bold tracking-tight" style={{ color: '#ffffff' }}>Рост</h1>
          <p className="text-sm" style={{ color: '#A1A1AA' }}>Цели, привычки и прогресс</p>
        </div>
        <Link
          to="/goals"
          className="rounded-lg px-4 py-2 text-sm font-medium transition-all"
          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}
        >
          К целям
        </Link>
      </div>

      <div className="px-8 pb-8">
        {error ? (
          <div className="mb-4 rounded-xl p-4 text-sm" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#fca5a5' }}>
            {error}
          </div>
        ) : null}

        <div className="rounded-xl p-1.5" style={{ background: '#19161D', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
            {[
              { id: "smart", label: "SMART цели", icon: Flag },
              { id: "habits", label: "Привычки", icon: Workflow },
              { id: "planner", label: "Календарь", icon: CalendarCheck2 },
              { id: "year", label: "Итоги", icon: Trophy },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === (tab.id as DevelopmentTab);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as DevelopmentTab)}
                  className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-all"
                  style={{
                    border: isActive ? '1px solid rgba(52,211,153,0.25)' : '1px solid transparent',
                    background: isActive ? 'rgba(52,211,153,0.08)' : 'transparent',
                    color: isActive ? '#34d399' : '#A1A1AA',
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-8 py-6 pb-16">
        {activeTab === "smart" ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            {[
              { label: "Всего целей", value: String(smartProgress.total) },
              { label: "Выполнено", value: String(smartProgress.completed) },
              { label: "Активные", value: String(smartProgress.active) },
              { label: "Прогресс", value: `${smartProgress.percent}%` },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl p-5"
                style={{ background: '#211D25', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-xs" style={{ color: '#A1A1AA' }}>{item.label}</p>
                <p className="mt-3 text-3xl font-bold tracking-tight" style={{ color: '#ffffff' }}>{item.value}</p>
              </div>
            ))}
            <div
              className="rounded-xl p-4 lg:col-span-4"
              style={{ background: '#19161D', border: '1px solid rgba(52,211,153,0.12)' }}
            >
              <p className="text-sm" style={{ color: '#e4e4e7' }}>
                Маленький стабильный шаг каждый день создаёт большую траекторию через год.
              </p>
            </div>
          </div>
        ) : null}

        {activeTab === "habits" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              {[
                { label: "Всего привычек", value: String(habitsStats.total) },
                { label: "Отмечено сегодня", value: String(habitsStats.done) },
                { label: "Выполнение", value: `${habitsStats.completion}%` },
                { label: "Лучшая серия", value: `${habitsStats.bestStreak} дн.` },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl p-5"
                  style={{ background: '#211D25', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-xs" style={{ color: '#A1A1AA' }}>{item.label}</p>
                  <p className="mt-3 text-3xl font-bold tracking-tight" style={{ color: '#ffffff' }}>{item.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {habits.map((habit) => (
                <button
                  key={habit.id}
                  type="button"
                  onClick={() => toggleHabit(habit.id)}
                  className="rounded-xl p-4 text-left transition-all"
                  style={{
                    background: habit.doneToday ? 'rgba(52,211,153,0.08)' : '#211D25',
                    border: habit.doneToday ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: '#ffffff' }}>{habit.title}</p>
                  <p className="mt-1.5 text-xs" style={{ color: '#A1A1AA' }}>Серия: {habit.streak} дн.</p>
                  <p className="mt-1 text-xs" style={{ color: habit.doneToday ? '#34d399' : 'rgba(161,161,170,0.5)' }}>
                    {habit.doneToday ? '✓ Отмечено' : 'Нажми, чтобы отметить'}
                  </p>
                </button>
              ))}
            </div>
            <p className="text-sm" style={{ color: '#A1A1AA' }}>
              Повторяемое действие важнее разового идеального действия.
            </p>
          </div>
        ) : null}

        {activeTab === "planner" ? (
          <div className="space-y-3">
            <div
              className="rounded-xl p-5"
              style={{ background: '#19161D', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <h2 className="text-base font-semibold mb-1" style={{ color: '#ffffff' }}>Календарь задач</h2>
              <p className="text-sm mb-4" style={{ color: '#A1A1AA' }}>Добавляй задачи по датам и связывай с целями.</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_160px_200px_auto]">
                <input
                  value={taskTitle}
                  onChange={(event) => setTaskTitle(event.target.value)}
                  placeholder="Название задачи"
                  className="h-9 rounded-lg px-3 text-sm outline-none"
                  style={{ background: '#211D25', border: '1px solid rgba(255,255,255,0.08)', color: '#e4e4e7' }}
                />
                <input
                  type="date"
                  value={taskDate}
                  onChange={(event) => setTaskDate(event.target.value)}
                  className="h-9 rounded-lg px-3 text-sm outline-none"
                  style={{ background: '#211D25', border: '1px solid rgba(255,255,255,0.08)', color: '#e4e4e7' }}
                />
                <select
                  value={taskGoalId}
                  onChange={(event) => setTaskGoalId(event.target.value)}
                  className="h-9 rounded-lg px-3 text-sm outline-none"
                  style={{ background: '#211D25', border: '1px solid rgba(255,255,255,0.08)', color: '#e4e4e7' }}
                >
                  <option value="">Без цели</option>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>{goal.title}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addTask}
                  className="rounded-lg px-4 text-sm font-medium transition-all"
                  style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}
                >
                  Добавить
                </button>
              </div>
            </div>

            <div
              className="rounded-xl p-5"
              style={{ background: '#19161D', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="mb-3 grid grid-cols-7 gap-1.5 text-xs" style={{ color: '#A1A1AA' }}>
                {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                  <div key={day} className="text-center">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {plannerCells.map((cell) => {
                  if (cell.day == null) {
                    return <div key={cell.dateKey} className="min-h-[80px] rounded-lg border border-transparent" />;
                  }
                  const dayTasks = tasksByDate.get(cell.dateKey) ?? [];
                  return (
                    <div
                      key={cell.dateKey}
                      className="min-h-[80px] rounded-lg p-1.5"
                      style={{
                        background: dayTasks.length > 0 ? 'rgba(52,211,153,0.05)' : '#211D25',
                        border: dayTasks.length > 0 ? '1px solid rgba(52,211,153,0.15)' : '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <p className="text-xs mb-1" style={{ color: '#A1A1AA' }}>{cell.day}</p>
                      <div className="space-y-0.5">
                        {dayTasks.slice(0, 2).map((task) => (
                          <div
                            key={task.id}
                            className="rounded px-1.5 py-0.5 text-[10px] leading-snug"
                            style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}
                          >
                            {task.title}
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <p className="text-[10px]" style={{ color: '#A1A1AA' }}>+{dayTasks.length - 2}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="rounded-xl p-5"
              style={{ background: '#19161D', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="mb-3 text-sm font-semibold" style={{ color: '#ffffff' }}>Список задач</p>
              <div className="space-y-2">
                {tasks.map((task) => {
                  const goal = goals.find((item) => item.id === task.goalId);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                      style={{ background: '#211D25', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div>
                        <p className="text-sm" style={{ color: '#e4e4e7' }}>{task.title}</p>
                        <p className="text-xs" style={{ color: '#A1A1AA' }}>
                          {task.date}{goal ? ` · ${goal.title}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTask(task.id)}
                        className="rounded-md px-2 py-1 text-xs transition-all"
                        style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#fca5a5' }}
                      >
                        Удалить
                      </button>
                    </div>
                  );
                })}
                {tasks.length === 0 && (
                  <p className="text-sm" style={{ color: 'rgba(161,161,170,0.5)' }}>Задач пока нет.</p>
                )}
              </div>
              <div className="mt-4">
                <Link
                  to="/goals"
                  className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-all"
                  style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}
                >
                  Перейти к целям
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "year" ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              { label: "Достигнутые цели", value: String(yearlySummary.achievedGoals) },
              { label: "Активные цели", value: String(yearlySummary.activeGoals) },
              { label: "Стабильность привычек", value: `${yearlySummary.habitsConsistency}%` },
              { label: "Сильнейшая привычка", value: yearlySummary.strongestHabit },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl p-5"
                style={{ background: '#211D25', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-xs" style={{ color: '#A1A1AA' }}>{item.label}</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight" style={{ color: '#ffffff' }}>{item.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
