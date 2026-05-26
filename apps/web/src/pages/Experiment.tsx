import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MessageSquare, Quote } from 'lucide-react';
import { chatApi, experimentsApi } from '@/lib/api-client';
import RadialPulseLoader from '@/components/ui/loading-animation';
import Breadcrumbs from '@/components/Breadcrumbs';

interface IntensityMetric {
    id: string;
    intensity_value: number;
    metric_date: string;
}

interface ExperimentNode {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    success?: number | null;
    outcome?: string | null;
}

interface RelatedEntry {
    id: string;
    title: string;
    event_date?: string | null;
}

interface TestedConcept {
    id: string;
    name: string;
}

interface ExperimentDetail {
    experiment: ExperimentNode;
    intensity_metrics: {
        average: number | null;
        data_points: IntensityMetric[];
    };
    related_entries: RelatedEntry[];
    tested_concepts: TestedConcept[];
}

/** Новый агрегированный ответ и старый плоский ExperimentResponse с бэка. */
function parseAggregatedResponse(r: Record<string, unknown>): ExperimentDetail | null {
    const exp = r.experiment as Record<string, unknown>;
    if (typeof exp?.id !== 'string' || typeof exp?.status !== 'string') return null;

    const im = r.intensity_metrics;
    const bundle =
        im && typeof im === 'object'
            ? (im as ExperimentDetail['intensity_metrics'])
            : { average: null, data_points: [] };

    return {
        experiment: r.experiment as ExperimentNode,
        intensity_metrics: {
            average: bundle.average ?? null,
            data_points: Array.isArray(bundle.data_points) ? bundle.data_points : [],
        },
        related_entries: Array.isArray(r.related_entries) ? (r.related_entries as RelatedEntry[]) : [],
        tested_concepts: Array.isArray(r.tested_concepts) ? (r.tested_concepts as TestedConcept[]) : [],
    };
}

function parseFlatResponse(r: Record<string, unknown>): ExperimentDetail | null {
    if (typeof r.id !== 'string' || typeof r.status !== 'string') return null;

    return {
        experiment: {
            id: r.id,
            title: typeof r.title === 'string' ? r.title : 'Эксперимент',
            description: (r.description as string | null | undefined) ?? null,
            status: r.status,
            success: (r.success as number | null | undefined) ?? null,
            outcome: (r.outcome as string | null | undefined) ?? null,
        },
        intensity_metrics: { average: null, data_points: [] },
        related_entries: [],
        tested_concepts: [],
    };
}

function normalizeExperimentDetail(raw: unknown): ExperimentDetail | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;

    if (r.experiment && typeof r.experiment === 'object') {
        return parseAggregatedResponse(r);
    }

    return parseFlatResponse(r);
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    active: {
        label: 'Ещё экспериментируем',
        className: 'bg-[#1a4d1a] text-[#4ade80] border-[#4ade80]/30',
    },
    completed: {
        label: 'Завершён',
        className: 'bg-[#1a3d4d] text-[#4adeff] border-[#4adeff]/30',
    },
    paused: {
        label: 'На паузе',
        className: 'bg-[#4d4a1a] text-[#fbbf24] border-[#fbbf24]/30',
    },
    cancelled: {
        label: 'Отменён',
        className: 'bg-[#4d1a1a] text-[#f87171] border-[#f87171]/30',
    },
};

function buildIntensityPath(metrics: IntensityMetric[], width = 1000, height = 300): string {
    if (!metrics.length) return `M 0,${height / 2} L ${width},${height / 2}`;

    const sorted = [...metrics].sort(
        (a, b) => new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime()
    );

    const values = sorted.map(m => m.intensity_value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const points = sorted.map((m, i) => {
        const x = (i / Math.max(sorted.length - 1, 1)) * width;
        const y = height - ((m.intensity_value - minVal) / range) * (height * 0.75) - height * 0.1;
        return { x, y };
    });

    if (points.length === 1) {
        return `M 0,${points[0].y} L ${width},${points[0].y}`;
    }

    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx = (prev.x + curr.x) / 2;
        d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
    }
    return d;
}

type Period = 'week' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
    week: 'Неделя',
    month: 'Месяц',
    year: 'Год',
};

const Experiment = () => {
    const { id } = useParams<{ id?: string }>();
    const [detail, setDetail] = useState<ExperimentDetail | null>(null);
    const [chartMetrics, setChartMetrics] = useState<IntensityMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [metricsLoading, setMetricsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<Period>('week');
    const [closeExperiment, setCloseExperiment] = useState<'yes' | 'no' | null>(null);
    const [closing, setClosing] = useState(false);
    const [linkedThread, setLinkedThread] = useState<string | null>(null);

    const loadDetail = useCallback(() => {
        if (!id) return;
        setLoading(true);
        setError(null);
        experimentsApi
            .getById(id)
            .then((res: unknown) => {
                const normalized = normalizeExperimentDetail(res);
                if (!normalized) {
                    setError('Некорректный ответ сервера');
                    setDetail(null);
                    return;
                }
                setDetail(normalized);
            })
            .catch((err: unknown) => {
                console.error(err);
                const msg =
                    err instanceof Error && err.message
                        ? err.message
                        : 'Не удалось загрузить эксперимент';
                setError(msg);
            })
            .finally(() => setLoading(false));
    }, [id]);

    const loadMetricsForPeriod = useCallback(
        async (period: Period) => {
            if (!id) return;
            setMetricsLoading(true);
            try {
                const rows = await experimentsApi.getIntensityMetrics(id, period);
                setChartMetrics(rows as IntensityMetric[]);
            } catch {
                setChartMetrics([]);
            } finally {
                setMetricsLoading(false);
            }
        },
        [id]
    );

    useEffect(() => {
        loadDetail();
        if (id) {
            chatApi.getEntityThreads("task", id)
                .then(ids => setLinkedThread(ids[0] ?? null))
                .catch(() => undefined);
        }
    }, [loadDetail, id]);

    useEffect(() => {
        if (!id || !detail?.experiment) return;
        loadMetricsForPeriod(selectedPeriod).catch(() => {});
    }, [id, selectedPeriod, detail, loadMetricsForPeriod]);

    const getIntensityColor = (value: number) => {
        if (value > 0) return 'text-green-500';
        if (value < 0) return 'text-red-500';
        return 'text-white';
    };

    const confirmCloseExperiment = async () => {
        if (!id || !detail?.experiment || detail.experiment.status === 'completed') return;
        setCloseExperiment('yes');
        setClosing(true);
        try {
            await experimentsApi.updateExperiment(id, { status: 'completed' });
            setDetail(prev =>
                prev
                    ? {
                          ...prev,
                          experiment: { ...prev.experiment, status: 'completed' },
                      }
                    : prev
            );
        } catch (e) {
            console.error(e);
        } finally {
            setClosing(false);
        }
    };

    if (!id) {
        return <Navigate to="/experiments" replace />;
    }

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center growth-page">
                <RadialPulseLoader text="Загрузка..." size={120} color="#ffffff" />
            </div>
        );
    }

    if (error || !detail?.experiment) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4 growth-page">
                <p className="text-gray-400">{error ?? 'Эксперимент не найден'}</p>
                <Link to="/experiments" className="text-sm text-gray-500 hover:text-white flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> К экспериментам
                </Link>
            </div>
        );
    }

    const { experiment, related_entries, tested_concepts } = detail;
    const badge = STATUS_BADGE[experiment.status] ?? {
        label: experiment.status,
        className: 'bg-zinc-800/60 text-gray-300 border-zinc-800',
    };

    const avgIntensity =
        chartMetrics.length > 0
            ? chartMetrics.reduce((s, m) => s + m.intensity_value, 0) / chartMetrics.length
            : null;

    const intensityPath = buildIntensityPath(chartMetrics);
    const successVal = experiment.success ?? 0;
    const intensityColorClass = avgIntensity === null ? 'text-gray-500' : getIntensityColor(avgIntensity);
    const intensityDisplay = avgIntensity === null ? '—' : avgIntensity.toFixed(1);

    return (
        <div className="growth-page min-h-screen p-2 md:p-4 lg:p-8 font-sans">
            <div className="max-w-7xl mx-auto px-2 md:px-0">
                <header className="flex flex-col gap-2 mb-6 md:mb-8">
                    <Breadcrumbs crumbs={[
                        { label: 'Главная', to: '/navigation' },
                        { label: 'Эксперименты', to: '/experiments' },
                        { label: experiment.title },
                    ]} />
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mt-1">
                        <span
                            className={`text-xs px-2 md:px-3 py-1 rounded-full border font-medium ${badge.className}`}
                        >
                            {badge.label}
                        </span>
                        <h1 className="text-lg md:text-2xl font-bold">{experiment.title}</h1>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                    <div className="lg:col-span-2 space-y-4 md:space-y-6">
                        <div className="relative h-[280px] md:h-[300px] w-full bg-zinc-900/50 rounded-2xl border border-zinc-800/80 overflow-hidden">
                            <div className="absolute right-2 top-2 bottom-8 flex flex-col justify-between text-[10px] text-gray-500 z-10 pointer-events-none">
                                <span>80</span>
                                <span>60</span>
                                <span>40</span>
                                <span>20</span>
                            </div>
                            <div className="absolute inset-0 grid grid-cols-6 md:grid-cols-12 grid-rows-4 md:grid-rows-6 opacity-40">
                                {Array.from({ length: 24 }, (_, i) => (
                                    <div key={`grid-${i}`} className="border-r border-b border-gray-800/30" />
                                ))}
                            </div>

                            <svg className="absolute inset-0 w-full h-full pr-8" viewBox="0 0 1000 300" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="gradientExpRed" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
                                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                {metricsLoading ? (
                                    <text x="400" y="150" fill="gray" fontSize="14">
                                        …
                                    </text>
                                ) : (
                                    <>
                                        <path
                                            d={`${intensityPath} L 1000 300 L 0 300 Z`}
                                            fill="url(#gradientExpRed)"
                                        />
                                        <path
                                            d={intensityPath}
                                            fill="none"
                                            stroke="#f97316"
                                            strokeWidth="3"
                                            vectorEffect="non-scaling-stroke"
                                            className="drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                                        />
                                    </>
                                )}
                            </svg>
                        </div>

                        <div className="border border-zinc-800 rounded-2xl p-4 md:p-6 bg-zinc-900/50">
                            <div className="flex flex-col gap-4 mb-6">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                    <h2 className="text-xl md:text-2xl font-medium text-gray-200">Резюме</h2>
                                    <div className="text-right">
                                        <span className="text-[#6366f1] text-sm md:text-base whitespace-nowrap">
                                            Средняя интенсивность:{' '}
                                        <span
                                                className={`font-bold text-lg ${intensityColorClass}`}
                                            >
                                                {intensityDisplay}
                                            </span>
                                        </span>
                                    </div>
                                </div>

                                <div className="flex bg-zinc-900 rounded-full p-1 border border-gray-800 mx-auto w-fit">
                                    {(['week', 'month', 'year'] as const).map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setSelectedPeriod(p)}
                                            className={`px-3 md:px-4 py-1 text-xs md:text-sm rounded-full transition-all ${
                                                selectedPeriod === p
                                                    ? 'bg-[#1a1a4a] text-[#6366f1] shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                                                    : 'text-gray-500 hover:text-gray-300'
                                            }`}
                                        >
                                            {PERIOD_LABELS[p]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-6 border border-gray-800 rounded-xl p-4 bg-[#050510]/50">
                                <p className="text-gray-300 text-sm leading-relaxed mb-3 whitespace-pre-wrap">
                                    {experiment.outcome?.trim() || 'Резюме пока не заполнено.'}
                                </p>
                                {linkedThread && (
                                    <Link
                                        to={`/chat?threadId=${linkedThread}`}
                                        className="text-gray-400 hover:text-white transition-colors text-xs flex items-center justify-end gap-1"
                                    >
                                        <MessageSquare className="w-3 h-3" />
                                        К чату <ChevronRight className="w-3 h-3" />
                                    </Link>
                                )}
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
                                <div className="flex-1 w-full">
                                    {tested_concepts.length > 0 && (
                                        <div className="relative p-4 md:p-5 mb-0 rounded-xl bg-gradient-to-br from-[#1a1a40] to-[#050510] border border-white/5 shadow-inner-left">
                                            <div className="absolute top-3 left-3">
                                                <Quote className="w-4 h-4 md:w-5 md:h-5 text-white/20 transform rotate-180" />
                                            </div>
                                            <div className="relative pl-6 md:pl-7">
                                                <p className="text-indigo-100/90 text-xs md:text-sm italic leading-relaxed font-light tracking-wide">
                                                    {tested_concepts.map(c => c.name).join(' · ')}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto">
                                    <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
                                        <span className="text-xs md:text-sm tracking-wide font-medium text-gray-300 uppercase">
                                            На сколько успешен успех:
                                        </span>
                                        <span className="text-lg md:text-xl">
                                            {successVal}/10
                                        </span>
                                    </div>
                                    <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4">
                                        <span className="text-xs md:text-sm uppercase tracking-wide text-gray-300">
                                            Закрыть эксперимент?
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => void confirmCloseExperiment()}
                                                disabled={closing || experiment.status === 'completed'}
                                                className={`px-3 py-1 rounded-lg text-xs transition-colors uppercase ${
                                                    closeExperiment === 'yes'
                                                        ? 'bg-white/20 border border-white text-white'
                                                        : 'border border-white/50 hover:bg-zinc-800/60'
                                                } disabled:opacity-40`}
                                            >
                                                Да
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCloseExperiment('no')}
                                                className={`px-3 py-1 rounded-lg text-xs transition-colors uppercase ${
                                                    closeExperiment === 'no'
                                                        ? 'bg-white/20 border border-white text-white'
                                                        : 'border border-dashed border-gray-600 text-gray-500 hover:border-gray-400 hover:text-gray-300'
                                                }`}
                                            >
                                                Нет
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-900/50 min-h-[300px] flex flex-col">
                            <h2 className="text-lg font-semibold mb-4 text-white">Суть эксперимента</h2>
                            <div className="border-t border-zinc-800 mb-4 w-full" />
                            <p className="text-gray-300 text-sm leading-relaxed flex-grow overflow-y-auto experiment-scrollbar pr-2 whitespace-pre-wrap">
                                {experiment.description?.trim() || 'Описание не указано.'}
                            </p>
                            {linkedThread && (
                                <div className="mt-4 pt-4">
                                    <Link
                                        to={`/chat?threadId=${linkedThread}`}
                                        className="text-gray-400 hover:text-white transition-colors text-sm flex items-center justify-end gap-1"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        К чату <ChevronRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            )}
                        </div>

                        <div className="border border-zinc-800 rounded-2xl p-6 bg-zinc-900/50">
                            <h2 className="text-lg font-semibold mb-4 text-white">Что случилось за это время?</h2>
                            <div className="border-t border-zinc-800 mb-4 w-full" />
                            <div className="space-y-4">
                                {related_entries.length === 0 ? (
                                    <p className="text-gray-500 text-sm">Связанных записей пока нет.</p>
                                ) : (
                                    related_entries.map(entry => (
                                        <Link
                                            key={entry.id}
                                            to={`/event/${entry.id}`}
                                            className="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-colors group border-b border-gray-800/50 last:border-0 pb-3 last:pb-0"
                                        >
                                            <span className="text-gray-300 text-sm group-hover:text-white">
                                                {entry.title}
                                                {entry.event_date ? (
                                                    <span className="block text-xs text-gray-500 mt-0.5">
                                                        {entry.event_date}
                                                    </span>
                                                ) : null}
                                            </span>
                                            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors shrink-0" />
                                        </Link>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Experiment;
