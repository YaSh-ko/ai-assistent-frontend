import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, ChevronLeft, MessageSquare, Trash2, GitBranch, Eye, Target } from "lucide-react";
import { toast } from "sonner";
import { chatApi, entriesApi } from "@/lib/api-client";
import RadialPulseLoader from "@/components/ui/loading-animation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { GrowthButtonDanger } from "@/components/ui/growth-field";

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

interface GraphRelation {
  id: string;
  entity_type: string;
  title: string;
  description?: string | null;
  relation_type: string;
  score?: number | null;
  reason?: string | null;
}

interface EntryNote {
  id: string;
  entry_id: string;
  content: string;
  source: string;
  created_at: string;
}

interface AnalysisData {
  entry: EntryData;
  intensity_metrics: IntensityMetric[];
  related_situations: RelatedSituation[];
  graph_relations?: GraphRelation[];
  entry_notes?: EntryNote[];
  negative_impacts: NegativeImpact[];
  transformations: Transformation[];
  related_concepts?: { id: string; name: string; relevance?: number | null }[];
}

function formatNoteDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

const NOTE_SOURCE_LABELS: Record<string, string> = {
  chat: "из чата",
  manual: "вручную",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  observation: "Наблюдение",
  goal: "Цель",
};

const ENTITY_TYPE_STYLES: Record<string, { bg: string; color: string; icon: typeof Eye }> = {
  observation: { bg: "rgba(52,211,153,0.12)", color: "#34d399", icon: Eye },
  goal: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", icon: Target },
};

function relatedEntityPath(entityType: string, entityId: string): string {
  return entityType === "goal" ? `/goals/${entityId}` : `/event/${entityId}`;
}

function buildIntensityPath(metrics: IntensityMetric[], width = 600, height = 200): string {
  if (!metrics.length) return `M 0,${height / 2} L ${width},${height / 2}`;
  const sorted = [...metrics].sort(
    (a, b) => new Date(a.metric_date).getTime() - new Date(b.metric_date).getTime()
  );
  const values = sorted.map(m => m.intensity_value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const points = sorted.map((m, i) => ({
    x: (i / Math.max(sorted.length - 1, 1)) * width,
    y: height - ((m.intensity_value - minVal) / range) * (height * 0.8) - height * 0.1,
  }));
  if (points.length === 1) return `M 0,${points[0].y} L ${width},${points[0].y}`;
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
  const navigate = useNavigate();
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedThread, setLinkedThread] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    entriesApi.getAnalysis(id)
      .then((res: AnalysisData) => setData(res))
      .catch(() => setError("Не удалось загрузить данные"))
      .finally(() => setLoading(false));
    chatApi.getEntityThreads("observation", id)
      .then(ids => setLinkedThread(ids[0] ?? null))
      .catch(() => undefined);
  }, [id]);

  const handleDeleteEntry = async () => {
    if (!id) return;
    const confirmed = globalThis.confirm('Удалить это наблюдение? Оно также исчезнет из графа.');
    if (!confirmed) return;
    setDeleting(true);
    try {
      await entriesApi.delete(id);
      toast.success('Наблюдение удалено');
      navigate('/events');
    } catch {
      toast.error('Не удалось удалить наблюдение');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ background: '#09090b' }}>
        <RadialPulseLoader text="Загрузка..." size={120} color="#34d399" />
      </div>
    );
  }

  if (!id || error || !data) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4" style={{ background: '#09090b' }}>
        <p style={{ color: '#A1A1AA' }}>{error ?? "Не найдено"}</p>
        <Link to="/events" className="text-sm flex items-center gap-1" style={{ color: '#34d399' }}>
          <ChevronLeft className="w-4 h-4" /> Назад
        </Link>
      </div>
    );
  }

  const { entry, intensity_metrics, graph_relations = [], entry_notes = [], negative_impacts, transformations } = data;
  const avgIntensity = intensity_metrics.length
    ? intensity_metrics.reduce((s, m) => s + m.intensity_value, 0) / intensity_metrics.length
    : null;
  const intensityPath = buildIntensityPath(intensity_metrics);
  const relatedGraphItems = graph_relations.filter(
    r => r.entity_type === "observation" || r.entity_type === "goal",
  );

  return (
    <div className="min-h-screen" style={{ background: '#09090b', color: '#e4e4e7' }}>
      {/* Хедер */}
      <div
        className="py-4 md:py-5 px-4 md:px-8"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <Breadcrumbs crumbs={[
          { label: 'Главная', to: '/navigation' },
          { label: 'Опыт', to: '/events' },
          { label: entry.title ?? entry.description.slice(0, 40) },
        ]} />
        <h1 className="text-xl md:text-2xl font-bold mt-2 tracking-tight" style={{ color: '#ffffff' }}>
          {entry.title ?? entry.description.slice(0, 60)}
        </h1>
      </div>

      {/* Основной контент */}
      <div className="container mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">

          {/* Левая + центральная колонки */}
          <div className="lg:col-span-2 space-y-4">

            {/* График интенсивности */}
            <div
              className="rounded-xl p-4 md:p-5"
              style={{ background: '#19161D', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-xs font-medium mb-3" style={{ color: '#A1A1AA' }}>
                Динамика интенсивности
              </p>
              <div className="relative h-40 md:h-52">
                <svg viewBox="0 0 600 200" className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <pattern id="grid" width="60" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 60 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="600" height="200" fill="url(#grid)" />
                  <path d={intensityPath} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              {avgIntensity !== null && (
                <div className="text-xs text-right mt-3" style={{ color: '#A1A1AA' }}>
                  Средняя:{" "}
                  <span style={{ color: '#34d399' }}>{avgIntensity.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Описание + связанные */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Описание */}
              <div
                className="rounded-xl p-4 md:p-5 flex flex-col"
                style={{ background: '#211D25', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold" style={{ color: '#ffffff' }}>Первичная запись</h2>
                  {linkedThread && (
                    <Link
                      to={`/chat?threadId=${linkedThread}`}
                      className="text-xs flex items-center gap-1 transition-colors hover:text-white"
                      style={{ color: '#A1A1AA' }}
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span className="hidden sm:inline">К чату</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: '12px' }} />
                <p className="leading-relaxed text-xs md:text-sm flex-1" style={{ color: '#e4e4e7' }}>
                  {entry.description}
                </p>
              </div>

              {/* Связанные элементы графа */}
              <div
                className="rounded-xl p-4 md:p-5 flex-1 flex flex-col"
                style={{ background: '#211D25', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold" style={{ color: '#ffffff' }}>
                    Связанные записи
                  </h2>
                  {relatedGraphItems.length > 0 && (
                    <Link
                      to={`/graph?node=${id}`}
                      className="text-xs flex items-center gap-1 transition-colors hover:text-white"
                      style={{ color: '#A1A1AA' }}
                    >
                      <GitBranch className="w-3 h-3" />
                      На графе
                    </Link>
                  )}
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: '10px' }} />
                <div className="space-y-2 grow">
                  {relatedGraphItems.length ? relatedGraphItems.map(r => {
                    const typeStyle = ENTITY_TYPE_STYLES[r.entity_type] ?? ENTITY_TYPE_STYLES.observation;
                    const TypeIcon = typeStyle.icon;
                    return (
                    <Link
                      key={`${r.entity_type}-${r.id}`}
                      to={relatedEntityPath(r.entity_type, r.id)}
                      className="block p-2.5 rounded-lg transition-all hover:bg-white/[0.04]"
                      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded mb-1.5"
                        style={{ background: typeStyle.bg, color: typeStyle.color }}
                      >
                        <TypeIcon className="w-3 h-3" />
                        {ENTITY_TYPE_LABELS[r.entity_type] ?? r.entity_type}
                      </span>
                      <span className="text-xs font-medium block" style={{ color: '#e4e4e7' }}>
                        {r.title}
                      </span>
                      {r.description && r.description !== r.title && (
                        <span className="text-[11px] mt-1 block line-clamp-2" style={{ color: 'rgba(161,161,170,0.7)' }}>
                          {r.description}
                        </span>
                      )}
                      {typeof r.score === "number" && (
                        <span className="text-[10px] mt-1.5 block" style={{ color: 'rgba(52,211,153,0.6)' }}>
                          Схожесть {Math.round(r.score * 100)}%
                        </span>
                      )}
                    </Link>
                    );
                  }) : (
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(161,161,170,0.4)' }}>
                      Появятся, когда система найдёт наблюдения или цели на ту же тему.
                      Запишите ещё пару заметок про одну ситуацию — связь создастся автоматически.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {entry_notes.length > 0 && (
              <div
                className="rounded-xl p-4 md:p-5"
                style={{ background: '#211D25', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <h2 className="text-sm font-semibold mb-3" style={{ color: '#ffffff' }}>
                  Дополнения
                </h2>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginBottom: '12px' }} />
                <div className="space-y-3">
                  {entry_notes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-lg px-3 py-3"
                      style={{
                        background: 'rgba(52,211,153,0.04)',
                        border: '1px solid rgba(52,211,153,0.12)',
                      }}
                    >
                      <p className="text-[10px] mb-1.5" style={{ color: 'rgba(161,161,170,0.7)' }}>
                        {formatNoteDate(note.created_at)}
                        {" · "}
                        {NOTE_SOURCE_LABELS[note.source] ?? note.source}
                      </p>
                      <p className="text-xs md:text-sm leading-relaxed" style={{ color: '#e4e4e7' }}>
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Правая колонка: инсайты + действия */}
          <div className="space-y-4">
            <div
              className="rounded-xl p-4 md:p-5"
              style={{ background: '#19161D', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {negative_impacts.length > 0 && (
                <>
                  <h2 className="text-sm font-semibold mb-3" style={{ color: '#ffffff' }}>
                    Что это показало
                  </h2>
                  <div className="space-y-2">
                    {negative_impacts.map(impact => (
                      <div
                        key={impact.id}
                        className="px-3 py-2 rounded-lg text-xs"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.07)',
                          color: '#e4e4e7',
                        }}
                      >
                        {impact.title}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {negative_impacts.length === 0 && transformations.length === 0 && (
                <p className="text-xs text-center py-6" style={{ color: 'rgba(161,161,170,0.4)' }}>
                  Добавь инсайт из этого опыта в чате
                </p>
              )}

              {transformations.length > 0 && (
                <>
                  {negative_impacts.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '16px 0' }} />
                  )}
                  <h2 className="text-sm font-semibold mb-3" style={{ color: '#ffffff' }}>
                    Что делаю дальше
                  </h2>
                  <div className="space-y-2">
                    {transformations.map(t => (
                      <div
                        key={t.id}
                        className="px-3 py-2 rounded-lg text-xs leading-relaxed"
                        style={{
                          background: 'rgba(52,211,153,0.06)',
                          border: '1px solid rgba(52,211,153,0.18)',
                          color: '#e4e4e7',
                        }}
                      >
                        {t.title}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <GrowthButtonDanger
              onClick={handleDeleteEntry}
              disabled={deleting}
              className="w-full"
            >
              <Trash2 size={14} />
              {deleting ? 'Удаление…' : 'Удалить наблюдение'}
            </GrowthButtonDanger>
          </div>
        </div>
      </div>
    </div>
  );
}
