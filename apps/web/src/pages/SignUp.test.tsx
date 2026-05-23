import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SignUp from './SignUp';

vi.mock('@/components/ParticlesBackground', () => ({ default: () => null }));
vi.mock('@/components/PasswordToggleButton', () => ({
  default: ({ onToggle }: { onToggle: () => void }) => (
    <button onClick={onToggle} data-testid="pwd-toggle">toggle</button>
  ),
}));

const makeFetchResponse = (status: number, body: object = {}) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response);

const fillForm = (name: string, email: string, password: string) => {
  fireEvent.change(screen.getByLabelText('Имя'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText('Электронная почта'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: password } });
};

const submitForm = () => {
  fireEvent.submit(screen.getByLabelText('Электронная почта').closest('form')!);
};

describe('SignUp', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renders the sign-up form', () => {
    render(<MemoryRouter><SignUp /></MemoryRouter>);
    expect(screen.getByText('СОЗДАТЬ АККАУНТ')).toBeInTheDocument();
    expect(screen.getByLabelText('Имя')).toBeInTheDocument();
    expect(screen.getByLabelText('Электронная почта')).toBeInTheDocument();
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument();
    expect(screen.getByText('Уже есть аккаунт?')).toBeInTheDocument();
  });

  it('shows error when name is empty', async () => {
    render(<MemoryRouter><SignUp /></MemoryRouter>);
    fillForm('', 'user@example.com', 'password123');
    submitForm();
    await waitFor(() => {
      expect(screen.getByText('Введите имя')).toBeInTheDocument();
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows error for invalid email format', async () => {
    render(<MemoryRouter><SignUp /></MemoryRouter>);
    fillForm('Ivan', 'not-an-email', 'password123');
    submitForm();
    await waitFor(() => {
      expect(screen.getByText(/Некорректный/i)).toBeInTheDocument();
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows error for short password', async () => {
    render(<MemoryRouter><SignUp /></MemoryRouter>);
    fillForm('Ivan', 'user@example.com', 'abc');
    submitForm();
    await waitFor(() => {
      expect(screen.getByText(/короткий пароль|слишком короткий|минимум/i)).toBeInTheDocument();
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows success screen after successful registration', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchResponse(200, { user: { id: '1' } }));

    render(<MemoryRouter><SignUp /></MemoryRouter>);
    fillForm('Ivan Petrov', 'user@example.com', 'password123');
    submitForm();

    await waitFor(() => {
      expect(screen.getByText('ПРОВЕРЬТЕ ПОЧТУ')).toBeInTheDocument();
    });
    expect(screen.getByText(/user@example.com/)).toBeInTheDocument();
    expect(screen.getByText('Перейти к входу')).toBeInTheDocument();
  });

  it('shows "account already registered" error on 409', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchResponse(409, {}));

    render(<MemoryRouter><SignUp /></MemoryRouter>);
    fillForm('Ivan', 'user@example.com', 'password123');
    submitForm();

    await waitFor(() => {
      expect(screen.getByText('Аккаунт уже зарегистрирован')).toBeInTheDocument();
    });
  });

  it('shows "account already registered" when 400 and message includes "already exists"', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(400, { message: 'Email already exists' })
    );

    render(<MemoryRouter><SignUp /></MemoryRouter>);
    fillForm('Ivan', 'user@example.com', 'password123');
    submitForm();

    await waitFor(() => {
      expect(screen.getByText('Аккаунт уже зарегистрирован')).toBeInTheDocument();
    });
  });

  it('shows error on server failure', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(500, { message: 'Internal server error' })
    );

    render(<MemoryRouter><SignUp /></MemoryRouter>);
    fillForm('Ivan', 'user@example.com', 'password123');
    submitForm();

    await waitFor(() => {
      expect(screen.getByText(/ошибка|не удалось|попробуйте/i)).toBeInTheDocument();
    });
  });

  it('shows error on network failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    render(<MemoryRouter><SignUp /></MemoryRouter>);
    fillForm('Ivan', 'user@example.com', 'password123');
    submitForm();

    await waitFor(() => {
      expect(screen.getByText(/ошибка|не удалось|попробуйте/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility', () => {
    render(<MemoryRouter><SignUp /></MemoryRouter>);
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByTestId('pwd-toggle'));
    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'text');
  });

  it('shows error on 422 status', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeFetchResponse(422, { message: 'Validation error' }));

    render(<MemoryRouter><SignUp /></MemoryRouter>);
    fillForm('Ivan', 'user@example.com', 'password123');
    submitForm();

    await waitFor(() => {
      expect(screen.getByText(/Неверный формат данных/i)).toBeInTheDocument();
    });
  });

  it('shows error on 400 with custom message in detail field', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(400, { detail: 'Custom validation error' })
    );

    render(<MemoryRouter><SignUp /></MemoryRouter>);
    fillForm('Ivan', 'user@example.com', 'password123');
    submitForm();

    await waitFor(() => {
      expect(screen.getByText(/ошибка|не удалось|попробуйте/i)).toBeInTheDocument();
    });
  });
});
