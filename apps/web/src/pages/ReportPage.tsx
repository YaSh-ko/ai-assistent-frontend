import { useEffect, useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Eye, Target, Zap, Sparkles, Loader2 } from 'lucide-react';
import { entriesApi, goalsApi, experimentsApi, insightsApi } from '@/lib/api-client';
import RadialPulseLoader from '@/components/ui/loading-animation';
import Breadcrumbs from '@/components/Breadcrumbs';

interface EntityItem {
  id: string;
  type: 'observation' | 'goal' | 'task';
  title: string;
  description: string;
  status?: string;
  created_at: string;
  event_date?: string;
}

const TYPE_META: Record<string, { label: string; color: string; icon: typeof Eye }> = {
  observation: { label: 'Наблюдение', color: '#34d399', icon: Eye },
  goal: { label: 'Цель', color: '#f59e0b', icon: Target },
  task: { label: 'Задача', color: '#60a5fa', icon: Zap },
};

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function ReportPage() {
  const [loading, setLoading] = useState(true);
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      entriesApi.getAll().catch(() => ({ entries: [] })),
      goalsApi.getAll().catch(() => ({ goals: [] })),
      experimentsApi.getAll().catch(() => ({ experiments: [] })),
    ]).then(([ed, gd, xd]) => {
      const items: EntityItem[] = [];
      for (const e of (ed.entries ?? []) as any[]) {
        items.push({
          id: e.id, type: 'observation', title: e.title || '',
          description: e.description || '', status: 'active',
          created_at: e.created_at || '', event_date: e.event_date || '',
        });
      }
      for (const g of (gd.goals ?? []) as any[]) {
        items.push({
          id: g.id, type: 'goal', title: g.title || '',
          description: g.description || '', status: g.status || '',
          created_at: g.created_at || '',
        });
      }
      for (const x of (xd.experiments ?? []) as any[]) {
        items.push({
          id: x.id, type: 'task', title: x.title || '',
          description: x.description || '', status: x.status || '',
          created_at: x.created_at || '',
        });
      }
      setEntities(items);
    }).finally(() => setLoading(false));
  }, []);

  const entitiesByDate = useMemo(() => {
    const map: Record<string, EntityItem[]> = {};
    for (const e of entities) {
      const raw = e.event_date || e.created_at;
      if (!raw) continue;
      const key = raw.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [entities]);

  const cells = useMemo(() => getMonthDays(year, month), [year, month]);

  const prevMonth = useCallback(() => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
    setSummary(null);
  }, [month]);

  const nextMonth = useCallback(() => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
    setSummary(null);
  }, [month]);

  const handleDayClick = useCallback((day: number) => {
    const key = toDateKey(new Date(year, month, day));
    setSelectedDate(prev => prev === key ? null : key);
    setSummary(null);
  }, [year, month]);

  const selectedEntities = selectedDate ? (entitiesByDate[selectedDate] || []) : [];

  const handleGenerateSummary = useCallback(async () => {
    if (!selectedDate || selectedEntities.length === 0) return;
    setSummaryLoading(true);
    setSummary(null);
    try {
      const result = await insightsApi.summarize({
        entities: selectedEntities.map(e => ({
          id: e.id, type: e.type, title: e.title,
          description: e.description, status: e.status,
          created_at: e.created_at,
        })),
        context: 'day_summary',
        date: selectedDate,
      });
      setSummary(result.summary);
    } catch {
      setSummary('Не удалось сгенерировать сводку.');
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedDate, selectedEntities]);

  const today = toDateKey(new Date());

  const totalEntries = entities.filter(e => e.type === 'observation').length;
  const totalGoals = entities.filter(e => e.type === 'goal').length;
  const totalTasks = entities.filter(e => e.type === 'task').length;
  const activeDays = Object.keys(entitiesByDate).length;

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center growth-page">
        <RadialPulseLoader text="Загрузка..." size={120} color="#ffffff" />
      </div>
    );
  }

  return (
    <div className="growth-page min-h-screen">
      <div className="px-6 pt-6 pb-4">
        <Breadcrumbs crumbs={[{ label: 'Главная', to: '/navigation' }, { label: 'Аналитика' }]} />
        <h1 className="text-3xl font-bold mt-2">Аналитика</h1>
        <p className="text-sm text-white/40 mt-1">Календарь активности и ИИ-сводки</p>
      </div>

      {/* Stats row */}
      <div className="px-6 pb-4 grid grid-cols-4 gap-3">
        {[
          { label: 'Наблюдений', value: totalEntries, color: '#34d399' },
          { label: 'Целей', value: totalGoals, color: '#f59e0b' },
          { label: 'Задач', value: totalTasks, color: '#60a5fa' },
          { label: 'Активных дней', value: activeDays, color: '#a78bfa' },
        ].map(s => (
          <div key={s.label}
            className="rounded-xl p-4 text-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[11px] text-white/40 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="px-6 pb-8 flex gap-4 flex-col lg:flex-row">
        {/* Calendar */}
        <div
          className="rounded-2xl p-5 flex-1"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 transition">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium text-white/80">
              {MONTHS_RU[month]} {year}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 transition">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS_RU.map(d => (
              <div key={d} className="text-center text-[10px] text-white/30 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />;
              const key = toDateKey(new Date(year, month, day));
              const dayEntities = entitiesByDate[key] || [];
              const isSelected = selectedDate === key;
              const isToday = key === today;
              const hasObs = dayEntities.some(e => e.type === 'observation');
              const hasGoal = dayEntities.some(e => e.type === 'goal');
              const hasTask = dayEntities.some(e => e.type === 'task');

              return (
                <button
                  key={key}
                  onClick={() => handleDayClick(day)}
                  className="relative flex flex-col items-center justify-center rounded-lg py-2 transition-all"
                  style={{
                    background: isSelected ? 'rgba(255,255,255,0.12)' : 'transparent',
                    border: isToday ? '1px solid rgba(52,211,153,0.4)' : '1px solid transparent',
                  }}
                >
                  <span className={`text-sm ${dayEntities.length > 0 ? 'text-white font-medium' : 'text-white/30'}`}>
                    {day}
                  </span>
                  {dayEntities.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {hasObs && <span className="w-1 h-1 rounded-full bg-emerald-400" />}
                      {hasGoal && <span className="w-1 h-1 rounded-full bg-amber-400" />}
                      {hasTask && <span className="w-1 h-1 rounded-full bg-blue-400" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-[10px] text-white/30">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Наблюдения</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Цели</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Задачи</span>
          </div>
        </div>

        {/* Day detail panel */}
        <div
          className="rounded-2xl p-5 w-full lg:w-96 shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {!selectedDate ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-white/20 text-sm">
              <span className="text-3xl mb-2">📅</span>
              Выбери день в календаре
            </div>
          ) : (
            <div>
              <div className="text-sm font-medium text-white/70 mb-3">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ru-RU', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </div>

              {selectedEntities.length === 0 ? (
                <p className="text-xs text-white/30">Нет записей за этот день</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {selectedEntities.map(e => {
                    const meta = TYPE_META[e.type] || TYPE_META.observation;
                    const Icon = meta.icon;
                    return (
                      <div key={e.id}
                        className="rounded-lg p-3"
                        style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${meta.color}22` }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon size={12} style={{ color: meta.color }} />
                          <span className="text-[10px] font-medium" style={{ color: meta.color }}>{meta.label}</span>
                          {e.status && e.status !== 'active' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/40">{e.status}</span>
                          )}
                        </div>
                        <p className="text-xs text-white/70 leading-relaxed">
                          {e.title || e.description.slice(0, 100)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedEntities.length > 0 && (
                <>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={summaryLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-medium transition-all disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(96,165,250,0.15))',
                      border: '1px solid rgba(52,211,153,0.2)',
                      color: '#34d399',
                    }}
                  >
                    {summaryLoading ? (
                      <><Loader2 size={14} className="animate-spin" /> Генерация...</>
                    ) : (
                      <><Sparkles size={14} /> Сводка от ИИ</>
                    )}
                  </button>

                  {summary && (
                    <div className="mt-3 rounded-lg p-3 text-xs leading-relaxed text-white/70"
                      style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.12)' }}
                    >
                      {summary}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
