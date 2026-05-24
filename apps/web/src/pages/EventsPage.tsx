// src/pages/EventsPage.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Link2, Plus, Network } from 'lucide-react';
import { entriesApi } from '@/lib/api-client';
import RadialPulseLoader from '@/components/ui/loading-animation';
import Breadcrumbs from '@/components/Breadcrumbs';

interface Entry {
  id: string;
  title?: string | null;
  description: string;
  event_date: string;
  created_at: string;
}

function EventCard({ entry }: { readonly entry: Entry }) {
  const title = entry.title ?? entry.description.slice(0, 50);
  const date = new Date(entry.event_date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Link
      to={`/event/${entry.id}`}
      className="flex flex-col rounded-xl p-5 transition-all hover:-translate-y-px cursor-pointer"
      style={{
        background: '#211D25',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Тег */}
      <div className="mb-3">
        <span
          className="text-xs font-medium px-2 py-1 rounded-md"
          style={{ background: 'rgba(128,255,181,0.1)', color: '#80FFB5' }}
        >
          Опыт
        </span>
      </div>

      {/* Заголовок */}
      <h3 className="font-semibold text-sm mb-2 line-clamp-2" style={{ color: '#ffffff' }}>
        {title}
      </h3>

      {/* Описание */}
      <p className="text-sm leading-relaxed line-clamp-4 flex-1" style={{ color: '#A1A1AA' }}>
        {entry.description}
      </p>

      {/* Дата */}
      <div
        className="mt-4 pt-3 flex items-center gap-2 text-xs"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(161,161,170,0.5)' }}
      >
        <Link2 className="w-3 h-3 shrink-0" />
        <span className="truncate">{date}</span>
      </div>
    </Link>
  );
}

export default function EventsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    entriesApi
      .getAll()
      .then((data) => setEntries(data.entries ?? []))
      .catch(() => setError('Не удалось загрузить события'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ background: '#171717' }}>
        <RadialPulseLoader text="Загрузка..." size={120} color="#80FFB5" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#171717', color: '#C1BEC6' }}>
      {/* Хедер */}
      <div
        className="flex items-start justify-between px-8 pt-8 pb-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div>
          <Breadcrumbs crumbs={[{ label: 'Главная', to: '/navigation' }, { label: 'Опыт' }]} />
          <h1 className="text-3xl font-bold mt-2 mb-1 tracking-tight" style={{ color: '#ffffff' }}>
            Опыт
          </h1>
          <p className="text-sm" style={{ color: '#A1A1AA' }}>Всё, что ты пережил и из чего вырос</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/chat"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: 'rgba(128,255,181,0.1)',
              border: '1px solid rgba(128,255,181,0.3)',
              color: '#80FFB5',
            }}
          >
            Добавить
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => navigate('/graph')}
            className="p-2 rounded-lg transition-all"
            style={{
              background: '#211D25',
              border: '1px solid rgba(255,255,255,0.07)',
              color: '#A1A1AA',
            }}
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
                  className="text-sm transition-colors"
                  style={{ color: '#A1A1AA' }}
                >
                  Повторить
                </button>
              </div>
            );
          }
          if (entries.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-32 gap-3">
                <Plus className="w-8 h-8" style={{ color: 'rgba(161,161,170,0.3)' }} />
                <p className="text-sm" style={{ color: '#A1A1AA' }}>Опыта пока нет</p>
                <Link
                  to="/chat"
                  className="text-sm transition-colors"
                  style={{ color: '#80FFB5' }}
                >
                  Добавить первый опыт →
                </Link>
              </div>
            );
          }
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {entries.map((entry) => (
                <EventCard key={entry.id} entry={entry} />
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
