import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import Landing from './Landing';

vi.mock('@/components/ParticlesBackground', () => ({ default: () => null }));
vi.mock('@/components/LandingFooter', () => ({ default: () => <footer>Footer</footer> }));

// Mock image assets
vi.mock('@/assets/memory.png', () => ({ default: 'memory.png' }));
vi.mock('@/assets/overtime.png', () => ({ default: 'overtime.png' }));
vi.mock('@/assets/history.png', () => ({ default: 'history.png' }));
vi.mock('@/assets/padlock.png', () => ({ default: 'padlock.png' }));
vi.mock('@/assets/shield.png', () => ({ default: 'shield.png' }));
vi.mock('@/assets/configuration.png', () => ({ default: 'configuration.png' }));
vi.mock('@/assets/Macbook Air M2 Silver Flatten.png', () => ({ default: 'macbook.png' }));
vi.mock('@/assets/circle_of_sins.png', () => ({ default: 'circle.png' }));

describe('Landing', () => {
  const renderLanding = () =>
    render(<MemoryRouter><Landing /></MemoryRouter>);

  it('renders brand name', () => {
    renderLanding();
    expect(screen.getAllByText(/Delёz/i).length).toBeGreaterThan(0);
  });

  it('renders hero section', () => {
    renderLanding();
    expect(screen.getByText(/Трудно разобраться в себе/i)).toBeInTheDocument();
    expect(screen.getByText(/Разберёмся вместе/i)).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderLanding();
    const loginLinks = screen.getAllByText('Войти');
    expect(loginLinks.length).toBeGreaterThan(0);
    const betaLinks = screen.getAllByText('Бета-тестирование');
    expect(betaLinks.length).toBeGreaterThan(0);
  });

  it('renders problem section', () => {
    renderLanding();
    expect(screen.getByText('Одна мысль не даёт спать?')).toBeInTheDocument();
    expect(screen.getByText('Выводы забываются')).toBeInTheDocument();
  });

  it('renders how it works section', () => {
    renderLanding();
    expect(screen.getByText('Delёz запоминает, анализирует и связывает')).toBeInTheDocument();
    expect(screen.getByText('Обсуждаешь событие с ИИ')).toBeInTheDocument();
  });

  it('renders security section', () => {
    renderLanding();
    expect(screen.getByText('Твои данные принадлежат только тебе')).toBeInTheDocument();
    expect(screen.getByText('End-to-end шифрование')).toBeInTheDocument();
  });

  it('renders philosophy section', () => {
    renderLanding();
    expect(screen.getByText('Основано на концепциях Жиля Делёза')).toBeInTheDocument();
    expect(screen.getByText('Ризома (сеть без центра)')).toBeInTheDocument();
  });

  it('renders CTA section with beta-test links', () => {
    renderLanding();
    const betaTestLinks = screen.getAllByRole('link', { name: 'Записаться на бета-тест' });
    expect(betaTestLinks.length).toBeGreaterThan(0);
    betaTestLinks.forEach(link => {
      expect(link).toHaveAttribute('href', '/beta-test');
    });
  });

  it('renders target audience section', () => {
    renderLanding();
    expect(screen.getByText('Для кого это?')).toBeInTheDocument();
    expect(screen.getByText('13–18 лет')).toBeInTheDocument();
    expect(screen.getByText('55+ лет')).toBeInTheDocument();
  });

  it('renders footer', () => {
    renderLanding();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });
});
