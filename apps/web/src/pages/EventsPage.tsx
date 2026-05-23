// src/pages/EventsPage.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Link2, Plus, CalendarDays } from 'lucide-react';
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
      className="flex flex-col rounded-2xl p-5 transition-all hover:scale-[1.01] cursor-pointer"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Тег */}
      <div className="mb-3">
        <span
          className="text-xs font-medium px-2 py-1 rounded"
          style={{ background: 'rgba(239,68,68,0.25)', color: '#f87171' }}
        >
          Событие
        </span>
      </div>

      {/* Заголовок */}
      <h3 className="text-white font-semibold text-base mb-2 line-clamp-2">{title}</h3>

      {/* Описание */}
      <p className="text-gray-400 text-sm leading-relaxed line-clamp-5 flex-1">
        {entry.description}
      </p>

      {/* Дата */}
      <div
        className="mt-4 pt-3 flex items-center gap-2 text-xs"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)' }}
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
      <div className="flex h-screen w-full items-center justify-center bg-[#000019]">
        <RadialPulseLoader text="Загрузка событий..." size={120} color="#ffffff" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000019] text-white">
      {/* Хедер */}
      <div className="flex items-start justify-between px-8 pt-8 pb-6">
        <div>
          <Breadcrumbs crumbs={[{ label: 'Главная', to: '/navigation' }, { label: 'События' }]} />
          <h1 className="text-4xl font-bold mt-2 mb-1">События</h1>
          <p className="text-gray-500 text-sm">Все записи о твоих событиях</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/chat"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'rgba(255,255,255,0.9)', color: '#000' }}
          >
            Создать событие
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            onClick={() => navigate('/graph')}
            className="p-2.5 rounded-xl transition-all hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            title="Граф"
          >
            <CalendarDays className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Контент */}
      <div className="px-8 pb-16">
        {(() => {
          if (error) {
            return (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <p className="text-gray-500">{error}</p>
                <button
                  onClick={() => globalThis.location.reload()}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Повторить
                </button>
              </div>
            );
          }
          if (entries.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-32 gap-3">
                <Plus className="w-10 h-10 text-gray-700" />
                <p className="text-gray-500 text-sm">Событий пока нет</p>
                <Link to="/chat" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Создать первое событие →
                </Link>
              </div>
            );
          }
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
