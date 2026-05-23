import '@testing-library/jest-dom';
import { vi } from 'vitest';

const originalWarn = console.warn;

vi.spyOn(console, 'warn').mockImplementation((message?: unknown, ...args: unknown[]) => {
  if (
    typeof message === 'string' &&
    message.includes('React Router Future Flag Warning:')
  ) {
    return;
  }

  originalWarn(message, ...args);
});
