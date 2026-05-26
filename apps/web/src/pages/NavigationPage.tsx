// src/pages/NavigationPage.tsx
import { Link } from 'react-router-dom';
import {
  MessageCircle,
  CalendarDays,
  Target,
  GitFork,
  BarChart2,
  User,
} from 'lucide-react';
import '../styles/navigation.css';

interface NavSection {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  to: string;
}

const sections: NavSection[] = [
  {
    title: 'Опыт',
    subtitle: 'События и инсайты',
    icon: <CalendarDays strokeWidth={1.5} />,
    to: '/events',
  },
  {
    title: 'Рост',
    subtitle: 'Цели и эксперименты',
    icon: <Target strokeWidth={1.5} />,
    to: '/development',
  },
  {
    title: 'Граф знаний',
    subtitle: 'Карта связей',
    icon: <GitFork strokeWidth={1.5} />,
    to: '/graph',
  },
  {
    title: 'Аналитика',
    subtitle: 'Календарь и сводки',
    icon: <BarChart2 strokeWidth={1.5} />,
    to: '/report',
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
            <span className="navpage-banner__label">Фокус дня</span>
            <h2 className="navpage-banner__title">Куда движешься сейчас?</h2>
            <p className="navpage-banner__sub">Зафиксируй шаг, цель или инсайт — ассистент свяжет это с твоим графом</p>
          </div>
          <div className="navpage-banner__right">
            <Link to="/chat" className="navpage-banner__btn">
              Начать
            </Link>
          </div>
        </div>

        {/* Сетка разделов */}
        <p className="navpage__section-label">Разделы</p>
        <div className="navpage__grid">
          {sections.map((s) => (
            <NavCard key={s.to} section={s} />
          ))}
        </div>

        <Link to="/chat" className="navpage__chat-wide">
          <MessageCircle strokeWidth={1.5} className="navpage__chat-wide-icon" />
          <span>Открыть ассистента</span>
        </Link>
      </div>
    </div>
  );
}
