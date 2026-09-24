import type { ReactNode } from 'react';
import { cx } from './Card';

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const toneClass: Record<Tone, string> = {
  neutral: 'bg-fg/5 text-muted',
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
};

/** A compact status badge. Semantic tones map to §4 of DESIGN.md. */
export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-control px-2 py-0.5 text-caption font-medium',
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A neutral chip for a dimension value such as a plant name. */
export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-control border px-2 py-0.5 text-caption text-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A coloured status dot for alert rows. */
export function Dot({ tone }: { tone: Tone }) {
  const bg: Record<Tone, string> = {
    neutral: 'bg-muted',
    accent: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
  };
  return <span aria-hidden className={cx('inline-block h-2 w-2 shrink-0 rounded-full', bg[tone])} />;
}
