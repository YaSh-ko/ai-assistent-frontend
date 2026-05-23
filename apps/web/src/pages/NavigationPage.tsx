// src/pages/NavigationPage.tsx
import { Link } from 'react-router-dom';
import {
  MessageCircle,
  CalendarDays,
  Target,
  GitFork,
  BookOpenText,
  User,
} from 'lucide-react';
import ParticlesBackground from '@/components/ParticlesBackground';
import '../styles/navigation.css';

interface NavSection {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  to: string;
}

const sections: NavSection[] = [
  {
    title: 'Записи',
    subtitle: 'События и мысли',
    icon: <CalendarDays strokeWidth={1.5} />,
    to: '/records',
  },
  {
    title: 'Развитие',
    subtitle: 'Цели и рост',
    icon: <Target strokeWidth={1.5} />,
    to: '/development',
  },
  {
    title: 'Карта жизни',
    subtitle: 'Граф связей',
    icon: <GitFork strokeWidth={1.5} />,
    to: '/graph',
  },
  {
    title: 'Мемуары',
    subtitle: 'Истории и воспоминания',
    icon: <BookOpenText strokeWidth={1.5} />,
    to: '/memoirs',
  },
];

function NavCard({ section }: { readonly section: NavSection }) {
  return (
    <Link to={section.to} className="navpage-card">
      <div className="navpage-card__text">
        <span className="navpage-card__title">{section.title}</span>
        <span className="navpage-card__subtitle">{section.subtitle}</span>
      </div>
      <div className="navpage-card__icon-wrap">
        {section.icon}
      </div>
    </Link>
  );
}

export default function NavigationPage() {
  return (
    <div className="navpage">
      {/* Фон с частицами и линиями — как на лендинге */}
      <ParticlesBackground variant="default" />

      <div className="navpage__inner">
        {/* Хедер */}
        <header className="navpage__header">
          <div className="navpage__logo">Delёz</div>
          <Link to="/profile" className="navpage__profile-btn">
            <User strokeWidth={1.5} className="navpage__profile-icon" />
          </Link>
        </header>

        {/* Баннер — последнее событие / призыв к действию */}
        <div className="navpage-banner">
          <div className="navpage-banner__left">
            <span className="navpage-banner__label">Сегодня</span>
            <h2 className="navpage-banner__title">Что происходит в твоей жизни?</h2>
            <p className="navpage-banner__sub">Запиши событие — ИИ поможет увидеть главное</p>
            <Link to="/chat" className="navpage-banner__btn">
              Записать
            </Link>
          </div>
          <div className="navpage-banner__penguin">
            <img src="/penguin3.png" alt="penguin" className="navpage-banner__penguin-img" />
          </div>
        </div>

        {/* Сетка разделов */}
        <p className="navpage__section-label">Разделы</p>
        <div className="navpage__grid">
          {sections.map((s) => (
            <NavCard key={s.to} section={s} />
          ))}
        </div>

        {/* Широкая кнопка чата — как у Мэтч */}
        <Link to="/chat" className="navpage__chat-wide">
          <MessageCircle strokeWidth={1.5} className="navpage__chat-wide-icon" />
          <span>ИИ-чат</span>
        </Link>
      </div>
    </div>
  );
}
