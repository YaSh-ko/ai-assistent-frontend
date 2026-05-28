import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Target, Trophy, Workflow } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import GoalCard from "@/components/goals/GoalCard";
import RadialPulseLoader from "@/components/ui/loading-animation";
import { goalsApi } from "@/lib/api-client";

type DevelopmentTab = "goals" | "habits";

interface GoalItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  target_date?: string | null;
}

interface HabitItem {
  id: string;
  title: string;
  doneToday: boolean;
  streak: number;
}

const HABITS_STORAGE_KEY = "delez_habits_tracker";

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
    return JSON.parse(raw) as HabitItem[];
  } catch {
    return [];
  }
}

function saveHabits(habits: HabitItem[]): void {
  localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
}

export default function DevelopmentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: DevelopmentTab = tabParam === "habits" ? "habits" : "goals";

  const setActiveTab = (tab: DevelopmentTab) => {
    setSearchParams(tab === "goals" ? {} : { tab }, { replace: true });
  };

  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, { completed: number; total: number; percent: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [habits, setHabits] = useState<HabitItem[]>([]);

  useEffect(() => {
    setHabits(loadHabits());
  }, []);

  useEffect(() => {
    Promise.all([goalsApi.getAll(), goalsApi.getProgress().catch(() => ({}))])
      .then(([data, progress]) => {
        const loaded = (data.goals ?? []) as GoalItem[];
        setGoals(loaded);
        setProgressMap(progress);
      })
      .catch(() => setError("Не удалось загрузить цели"))
      .finally(() => setLoading(false));
  }, []);

  const sortedGoals = useMemo(() => {
    const order: Record<string, number> = { active: 0, paused: 1, completed: 2, cancelled: 3 };
    return [...goals].sort(
      (a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9),
    );
  }, [goals]);

  const overview = useMemo(() => {
    let taskTotal = 0;
    let taskDone = 0;
    for (const g of goals) {
      const p = progressMap[g.id];
      if (p) {
        taskTotal += p.total;
        taskDone += p.completed;
      }
    }
    const taskPercent = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;
    return {
      total: goals.length,
      activeGoals: goals.filter((g) => g.status === "active").length,
      taskTotal,
      taskDone,
      taskPercent,
    };
  }, [goals, progressMap]);

  const habitsStats = useMemo(() => {
    const total = habits.length;
    const done = habits.filter((h) => h.doneToday).length;
    const completion = total > 0 ? Math.round((done / total) * 100) : 0;
    const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);
    return { total, done, completion, bestStreak };
  }, [habits]);

  const toggleHabit = (habitId: string): void => {
    const next = habits.map((habit) => {
      if (habit.id !== habitId) return habit;
      const nextDone = !habit.doneToday;
      return {
        ...habit,
        doneToday: nextDone,
        streak: nextDone ? habit.streak + 1 : Math.max(0, habit.streak - 1),
      };
    });
    setHabits(next);
    saveHabits(next);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ background: "#09090b" }}>
        <RadialPulseLoader text="Загрузка..." size={120} color="#34d399" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#09090b", color: "#e4e4e7" }}>
      <div
        className="flex items-start justify-between px-8 pt-8 pb-6"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div>
          <Breadcrumbs crumbs={[{ label: "Главная", to: "/navigation" }, { label: "Рост" }]} />
          <h1 className="mt-2 mb-1 text-3xl font-bold tracking-tight" style={{ color: "#ffffff" }}>
            Рост
          </h1>
          <p className="text-sm" style={{ color: "#A1A1AA" }}>Цели, задачи и привычки</p>
        </div>
        <Link
          to="/chat"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all"
          style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399" }}
        >
          Новая цель
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="px-8 pb-8">
        {error ? (
          <div
            className="mb-4 rounded-xl p-4 text-sm"
            style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#fca5a5" }}
          >
            {error}
          </div>
        ) : null}

        <div
          className="rounded-xl p-1.5 mb-6"
          style={{ background: "#19161D", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: "goals" as const, label: "Цели", icon: Target },
              { id: "habits" as const, label: "Привычки", icon: Workflow },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-all"
                  style={{
                    border: isActive ? "1px solid rgba(52,211,153,0.25)" : "1px solid transparent",
                    background: isActive ? "rgba(52,211,153,0.08)" : "transparent",
                    color: isActive ? "#34d399" : "#A1A1AA",
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "goals" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: "Целей", value: String(overview.total) },
                { label: "Активных", value: String(overview.activeGoals) },
                { label: "Задач сделано", value: `${overview.taskDone}/${overview.taskTotal || "—"}` },
                { label: "Прогресс", value: overview.taskTotal > 0 ? `${overview.taskPercent}%` : "—" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl p-5"
                  style={{ background: "#211D25", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <p className="text-xs" style={{ color: "#A1A1AA" }}>{item.label}</p>
                  <p className="mt-3 text-2xl font-bold tracking-tight" style={{ color: "#ffffff" }}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {goals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Target className="w-8 h-8" style={{ color: "rgba(161,161,170,0.3)" }} />
                <p className="text-sm" style={{ color: "#A1A1AA" }}>Целей пока нет</p>
                <Link to="/chat" className="text-sm flex items-center gap-1" style={{ color: "#34d399" }}>
                  Поставить первую цель в чате <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sortedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    taskProgress={progressMap[goal.id] ?? { completed: 0, total: 0, percent: 0 }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "habits" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "Привычек", value: String(habitsStats.total) },
                { label: "Сегодня", value: String(habitsStats.done) },
                { label: "Выполнение", value: `${habitsStats.completion}%` },
                { label: "Серия", value: `${habitsStats.bestStreak} дн.` },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl p-5"
                  style={{ background: "#211D25", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <p className="text-xs" style={{ color: "#A1A1AA" }}>{item.label}</p>
                  <p className="mt-3 text-2xl font-bold" style={{ color: "#ffffff" }}>{item.value}</p>
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
                    background: habit.doneToday ? "rgba(52,211,153,0.08)" : "#211D25",
                    border: habit.doneToday
                      ? "1px solid rgba(52,211,153,0.25)"
                      : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: "#ffffff" }}>{habit.title}</p>
                  <p className="mt-1 text-xs" style={{ color: "#A1A1AA" }}>Серия: {habit.streak} дн.</p>
                </button>
              ))}
            </div>
            <p className="text-xs flex items-center gap-1" style={{ color: "#71717a" }}>
              <Trophy size={12} /> Привычки пока только на устройстве (прототип)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
