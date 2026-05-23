import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, mapAuthError } from './auth-utils';

describe('validateEmail', () => {
  it('accepts a valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('accepts email with subdomain', () => {
    expect(validateEmail('user@mail.example.com')).toBe(true);
  });

  it('accepts email with plus sign', () => {
    expect(validateEmail('user+tag@example.com')).toBe(true);
  });

  it('rejects email without @', () => {
    expect(validateEmail('userexample.com')).toBe(false);
  });

  it('rejects email without domain', () => {
    expect(validateEmail('user@')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('rejects email with spaces (trimmed internally)', () => {
    expect(validateEmail('  user@example.com  ')).toBe(true);
  });

  it('rejects just an @', () => {
    expect(validateEmail('@')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepts password with 8 characters', () => {
    expect(validatePassword('12345678')).toBe(true);
  });

  it('accepts password longer than 8 characters', () => {
    expect(validatePassword('supersecretpassword')).toBe(true);
  });

  it('rejects password with 7 characters', () => {
    expect(validatePassword('1234567')).toBe(false);
  });

  it('rejects empty password', () => {
    expect(validatePassword('')).toBe(false);
  });

  it('rejects password with 1 character', () => {
    expect(validatePassword('a')).toBe(false);
  });
});

describe('mapAuthError', () => {
  it('returns default message for undefined', () => {
    expect(mapAuthError(undefined)).toBe('Что-то пошло не так. Попробуйте позже');
  });

  it('returns default message for empty string', () => {
    expect(mapAuthError('')).toBe('Что-то пошло не так. Попробуйте позже');
  });

  it('maps invalid email error', () => {
    expect(mapAuthError('Invalid email format')).toBe('Некорректный формат email-адреса');
  });

  it('maps short password error', () => {
    expect(mapAuthError('Password is too short')).toBe('Пароль слишком короткий (минимум 8 символов)');
  });

  it('maps user already exists error', () => {
    expect(mapAuthError('user already exists')).toBe('Аккаунт уже зарегистрирован');
  });

  it('maps UserAlreadyExistsException', () => {
    expect(mapAuthError('UserAlreadyExistsException')).toBe('Аккаунт уже зарегистрирован');
  });

  it('maps already registered error', () => {
    expect(mapAuthError('already registered')).toBe('Аккаунт уже зарегистрирован');
  });

  it('maps invalid credentials error', () => {
    expect(mapAuthError('Invalid credentials provided')).toBe('Неверный email-адрес или пароль');
  });

  it('maps incorrect password error', () => {
    expect(mapAuthError('Incorrect password')).toBe('Неверный email-адрес или пароль');
  });

  it('maps user not found error', () => {
    expect(mapAuthError('User not found')).toBe('Пользователь с таким email-адресом не найден');
  });

  it('maps token expired error', () => {
    expect(mapAuthError('Token expired')).toBe('Ссылка недействительна или устарела');
  });

  it('maps invalid token error', () => {
    expect(mapAuthError('Invalid token')).toBe('Ссылка недействительна или устарела');
  });

  it('passes through Russian message with "неверный"', () => {
    const msg = 'Неверный email-адрес или пароль';
    expect(mapAuthError(msg)).toBe(msg);
  });

  it('passes through Russian message with "пароль"', () => {
    const msg = 'Пароль устарел';
    expect(mapAuthError(msg)).toBe(msg);
  });

  it('returns default for unknown English error', () => {
    expect(mapAuthError('Something completely unknown happened')).toBe('Что-то пошло не так. Попробуйте позже');
  });
});
