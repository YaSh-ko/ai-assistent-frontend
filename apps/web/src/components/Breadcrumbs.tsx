// src/components/Breadcrumbs.tsx
import { Link } from 'react-router-dom';

interface Crumb {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  readonly crumbs: Crumb[];
}

export default function Breadcrumbs({ crumbs }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1 text-xs" aria-label="breadcrumb">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.to || `breadcrumb-${i}`} className="flex items-center gap-1">
            {i > 0 && (
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
            )}
            {crumb.to && !isLast ? (
              <Link
                to={crumb.to}
                className="transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              >
                {crumb.label}
              </Link>
            ) : (
              <span style={{ color: isLast ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)' }}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
