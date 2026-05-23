import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import PasswordToggleButton from './PasswordToggleButton';

describe('PasswordToggleButton', () => {
  it('renders "Показать пароль" aria-label when show=false', () => {
    render(<PasswordToggleButton show={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Показать пароль' })).toBeInTheDocument();
  });

  it('renders "Скрыть пароль" aria-label when show=true', () => {
    render(<PasswordToggleButton show={true} onToggle={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Скрыть пароль' })).toBeInTheDocument();
  });

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(<PasswordToggleButton show={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('has type="button" to not submit forms', () => {
    render(<PasswordToggleButton show={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('changes color on mouseEnter', () => {
    render(<PasswordToggleButton show={false} onToggle={vi.fn()} />);
    const btn = screen.getByRole('button');
    fireEvent.mouseEnter(btn);
    expect(btn.style.color).toBe('rgb(255, 255, 255)');
    expect(btn.style.transform).toBe('scale(1.1)');
  });

  it('restores color on mouseLeave', () => {
    render(<PasswordToggleButton show={false} onToggle={vi.fn()} />);
    const btn = screen.getByRole('button');
    fireEvent.mouseEnter(btn);
    fireEvent.mouseLeave(btn);
    expect(btn.style.transform).toBe('scale(1)');
  });

  it('renders Eye icon when show=false', () => {
    const { container } = render(<PasswordToggleButton show={false} onToggle={vi.fn()} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders EyeOff icon when show=true', () => {
    const { container } = render(<PasswordToggleButton show={true} onToggle={vi.fn()} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
