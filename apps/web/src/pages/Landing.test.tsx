import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import Landing from './Landing';

describe('Landing', () => {
  const renderLanding = () =>
    render(<MemoryRouter><Landing /></MemoryRouter>);

  it('renders brand name', () => {
    renderLanding();
    expect(screen.getAllByText(/Impulse/i).length).toBeGreaterThan(0);
  });

  it('renders hero section', () => {
    renderLanding();
    expect(screen.getByText(/Личный рост/i)).toBeInTheDocument();
    expect(screen.getByText(/с опорой на данные/i)).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderLanding();
    expect(screen.getAllByText('Войти').length).toBeGreaterThan(0);
    expect(screen.getByText('Записаться на бета-тест')).toBeInTheDocument();
  });

  it('renders feature cards', () => {
    renderLanding();
    expect(screen.getByText('Наблюдения')).toBeInTheDocument();
    expect(screen.getByText('Цели и задачи')).toBeInTheDocument();
    expect(screen.getByText('Аналитика')).toBeInTheDocument();
  });

  it('renders CTA with beta-test link', () => {
    renderLanding();
    const betaTestLink = screen.getByRole('link', { name: 'Записаться на бета-тест' });
    expect(betaTestLink).toHaveAttribute('href', '/beta-test');
  });
});
