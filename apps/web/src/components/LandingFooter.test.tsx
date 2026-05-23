import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import LandingFooter from './LandingFooter';

describe('LandingFooter', () => {
  const renderFooter = () =>
    render(<MemoryRouter><LandingFooter /></MemoryRouter>);

  it('renders brand name', () => {
    renderFooter();
    expect(screen.getByText('Delёz')).toBeInTheDocument();
    expect(screen.getByText('Персональный ИИ-ассистент на всю жизнь')).toBeInTheDocument();
  });

  it('renders product links', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: 'Войти' })).toHaveAttribute('href', '/sign-in');
    expect(screen.getByRole('link', { name: 'Регистрация' })).toHaveAttribute('href', '/sign-up');
  });

  it('renders privacy policy link', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: 'Политика конфиденциальности' })).toHaveAttribute('href', '/privacy');
  });

  it('renders support email link', () => {
    renderFooter();
    const emailLink = screen.getByRole('link', { name: 'delez.ai@mail.ru' });
    expect(emailLink).toHaveAttribute('href', 'mailto:delez.ai@mail.ru');
  });

  it('renders copyright', () => {
    renderFooter();
    expect(screen.getByText(/2026 Delёz/)).toBeInTheDocument();
  });
});
