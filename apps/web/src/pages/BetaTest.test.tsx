import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import BetaTest from './BetaTest';

describe('BetaTest', () => {
  it('renders bot signup page', () => {
    render(<MemoryRouter><BetaTest /></MemoryRouter>);
    expect(screen.getByText('Бета-тестирование')).toBeInTheDocument();
    expect(screen.getByText(/Запись через Telegram/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Открыть @/i })).toHaveAttribute(
      'href',
      expect.stringContaining('t.me/'),
    );
  });

  it('links to sign in', () => {
    render(<MemoryRouter><BetaTest /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Войти/i })).toHaveAttribute('href', '/sign-in');
  });
});
