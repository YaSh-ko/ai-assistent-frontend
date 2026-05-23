import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { entriesApi } from "@/lib/api-client";
import RadialPulseLoader from "@/components/ui/loading-animation";
import Breadcrumbs from "@/components/Breadcrumbs";

interface EntryData {
  id: string;
  title?: string | null;
  description: string;
  event_date: string;
}

interface IntensityMetric {
  id: string;
  intensity_value: number;
  metric_date: string;
  note?: string | null;
}

interface RelatedSituation {
  id: string;
  target_type: string;
  target_id: string;
  target_title?: string | null;
  relation_type: string;
}

interface NegativeImpact {
  id: string;
  title: string;
  description?: string | null;
  severity?: number | null;
}

interface Transformation {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
}

interface AnalysisData {
  entry: EntryData;
  intensity_metrics: IntensityMetric[];
  related_situations: RelatedSituation[];
  negative_impacts: NegativeImpact[];
  transformations: Transformation[];
  related_concepts?: { id: string; name: string; relevance?: number | null }[];
}

// Строим SVG path из точек интенсивности
function buildIntensityPath(metrics: IntensityMetric[], width = 600, height = 200): string {
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
    // Инвертируем Y: большее значение = выше
    const y = height - ((m.intensity_value - minVal) / range) * (height * 0.8) - height * 0.1;
    return { x, y };
  });

  if (points.length === 1) {
    return `M 0,${points[0].y} L ${width},${points[0].y}`;
  }

  // Smooth curve через cubic bezier
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}

export default function Event() {
  const { id } = useParams<{ id?: string }>();
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    entriesApi.getAnalysis(id)
      .then((res: AnalysisData) => {
        setData(res);
      })
      .catch((err: unknown) => {
        console.error("Failed to load entry analysis", err);
        setError("Не удалось загрузить данные события");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#000019]">
        <RadialPulseLoader text="Загрузка..." size={120} color="#ffffff" />
      </div>
    );
  }

  if (!id || error || !data) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-[#000019] text-white">
        <p className="text-gray-400">{error ?? "Событие не найдено"}</p>
        <Link to="/chat" className="text-sm text-gray-500 hover:text-white flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Обратно
        </Link>
      </div>
    );
  }

  const { entry, intensity_metrics, related_situations, negative_impacts, transformations } = data;

  const avgIntensity =
    intensity_metrics.length
      ? intensity_metrics.reduce((s, m) => s + m.intensity_value, 0) / intensity_metrics.length
      : null;

  const intensityPath = buildIntensityPath(intensity_metrics);

  const getIntensityColor = (value: number) => {
    if (value > 0) return "text-green-500";
    if (value < 0) return "text-red-500";
    return "text-white";
  };

  // Разделяем related_situations на "повлияло" и "связанные"
  const influenced = related_situations.filter(s => s.relation_type === "influenced");
  const related = related_situations.filter(s => s.relation_type !== "influenced");

  return (
    <div className="min-h-screen bg-[#000019] text-white">
      {/* Хедер */}
      <div className="border-b border-gray-800 py-4 md:py-5 px-4 md:px-6">
        <Breadcrumbs crumbs={[
          { label: 'Главная', to: '/navigation' },
          { label: 'События', to: '/events' },
          { label: entry.title ?? entry.description.slice(0, 40) },
        ]} />
        <h1 className="text-xl md:text-3xl font-bold mt-2">
          {entry.title ?? entry.description.slice(0, 60)}
        </h1>
      </div>

      {/* Основной контент */}
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Левая + центральная колонки */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* График интенсивности */}
            <div className="border border-gray-700/50 rounded-lg p-4 md:p-6 bg-[#0a0a1a]/50">
              <div className="relative h-48 md:h-64">
                <svg viewBox="0 0 600 200" className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(100,150,150,0.1)" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="600" height="200" fill="url(#grid)" />
                  <path d={intensityPath} fill="none" stroke="#ef4444" strokeWidth="3" />
                </svg>
              </div>
              {avgIntensity !== null && (
                <div className="text-sm md:text-base text-gray-400 text-right mt-4">
                  Средняя интенсивность:{" "}
                  <span className={getIntensityColor(avgIntensity)}>
                    {avgIntensity.toFixed(1)}
                  </span>
                </div>
              )}
            </div>

            {/* Описание + связанные ситуации */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Описание */}
              <div className="border border-white/20 rounded-2xl p-4 md:p-6 bg-[#0a0a1a]/50 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base md:text-lg font-semibold text-white">Описание ситуации</h2>
                  <Link to="/chat" className="text-gray-400 hover:text-white transition-colors text-xs md:text-sm flex items-center gap-1">
                    <span className="hidden sm:inline">К чату</span>
                    <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                  </Link>
                </div>
                <div className="border-t border-white/20 mb-4 w-full" />
                <p className="text-gray-300 leading-relaxed text-xs md:text-sm">{entry.description}</p>
              </div>

              {/* Правая колонка: повлияло + связанные */}
              <div className="flex flex-col gap-4 md:gap-6">
                <div className="border border-white/20 rounded-2xl p-4 md:p-6 bg-[#0a0a1a]/50 flex-1 flex flex-col">
                  <h2 className="text-base md:text-lg font-semibold mb-4 text-white">На что это повлияло потом?</h2>
                  <div className="border-t border-white/20 mb-4 w-full" />
                  <div className="space-y-2 flex-grow">
                    {influenced.length ? influenced.map(s => (
                      <Link
                        key={s.id}
                        to={`/event/${s.target_id}`}
                        className="flex items-center justify-between p-2 md:p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group"
                      >
                        <span className="text-gray-300 text-xs md:text-sm group-hover:text-white">
                          {s.target_title ?? "Ситуация"}
                        </span>
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-gray-600 group-hover:text-white transition-colors" />
                      </Link>
                    )) : (
                      <p className="text-gray-600 text-xs">Нет данных</p>
                    )}
                  </div>
                </div>

                <div className="border border-white/20 rounded-2xl p-4 md:p-6 bg-[#0a0a1a]/50 flex-1 flex flex-col">
                  <h2 className="text-base md:text-lg font-semibold mb-4 text-white">Связанные ситуации</h2>
                  <div className="border-t border-white/20 mb-4 w-full" />
                  <div className="space-y-2 flex-grow">
                    {related.length ? related.map(s => (
                      <Link
                        key={s.id}
                        to={`/event/${s.target_id}`}
                        className="flex items-center justify-between p-2 md:p-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group"
                      >
                        <span className="text-gray-300 text-xs md:text-sm group-hover:text-white">
                          {s.target_title ?? "Ситуация"}
                        </span>
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-gray-600 group-hover:text-white transition-colors" />
                      </Link>
                    )) : (
                      <p className="text-gray-600 text-xs">Нет данных</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Правая колонка: негативные последствия + трансформация */}
          <div className="space-y-4 md:space-y-6">
            <div className="border border-white/20 rounded-lg p-4 md:p-6 bg-[#0a0a1a]/50">
              <div className="space-y-2 md:space-y-3">
                {negative_impacts.length ? negative_impacts.map(impact => (
                  <div
                    key={impact.id}
                    className="block w-full px-3 md:px-4 py-2 md:py-3 bg-red-900/40 border border-red-800/50 rounded-lg text-xs md:text-sm text-center text-gray-200"
                  >
                    {impact.title}
                  </div>
                )) : (
                  <p className="text-gray-600 text-xs text-center">Нет негативных последствий</p>
                )}
              </div>

              {transformations.length > 0 && (
                <>
                  <div className="border-t border-gray-700/50 my-4 md:my-6" />
                  <div>
                    <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-center text-white">Трансформация</h2>
                    <div className="space-y-2 md:space-y-3">
                      {transformations.map(t => (
                        <div
                          key={t.id}
                          className="p-2 md:p-3 bg-green-800/40 border border-green-700/50 rounded-lg text-xs md:text-sm text-gray-200 leading-relaxed"
                        >
                          {t.title}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
