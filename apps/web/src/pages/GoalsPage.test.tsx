import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import GoalsPage from './GoalsPage';
import DevelopmentPage from './DevelopmentPage';

vi.mock('@/components/ui/loading-animation', () => ({
  default: ({ text }: { text: string }) => <div>{text}</div>,
}));

vi.mock('@/lib/api-client', () => ({
  goalsApi: { getAll: vi.fn().mockResolvedValue({ goals: [] }) },
}));

describe('GoalsPage', () => {
  it('redirects to development', () => {
    render(
      <MemoryRouter initialEntries={['/goals']}>
        <Routes>
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/development" element={<DevelopmentPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Рост')).toBeInTheDocument();
  });
});
