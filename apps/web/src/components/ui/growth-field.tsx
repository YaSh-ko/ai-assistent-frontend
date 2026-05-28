import type { InputHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes } from 'react';

const fieldBase =
  'h-10 rounded-xl px-3 text-sm outline-none transition focus:ring-2 focus:ring-emerald-500/25';

export const growthFieldStyle = {
  background: '#211D25',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#e4e4e7',
} as const;

export function GrowthInput({ className = '', style, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`${fieldBase} ${className}`}
      style={{ ...growthFieldStyle, ...style }}
      {...props}
    />
  );
}

export function GrowthSelect({ className = '', style, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`${fieldBase} appearance-none cursor-pointer ${className}`}
      style={{ ...growthFieldStyle, ...style }}
      {...props}
    >
      {children}
    </select>
  );
}

export function GrowthButtonPrimary({
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-medium transition hover:opacity-90 disabled:opacity-50 ${className}`}
      style={{
        background: 'rgba(52,211,153,0.12)',
        border: '1px solid rgba(52,211,153,0.35)',
        color: '#34d399',
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function GrowthButtonGhost({
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-medium transition hover:bg-white/5 disabled:opacity-50 ${className}`}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#A1A1AA',
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function GrowthButtonDanger({
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-medium transition hover:opacity-90 disabled:opacity-50 ${className}`}
      style={{
        background: 'rgba(248,113,113,0.08)',
        border: '1px solid rgba(248,113,113,0.25)',
        color: '#fca5a5',
      }}
      {...props}
    >
      {children}
    </button>
  );
}
