import type { ReactNode } from 'react';
import { cx } from './Card';

/** A shimmer skeleton block sized to the final layout, not a spinner in a void. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cx('animate-pulse rounded-control bg-fg/10', className)}
    />
  );
}

/** An empty state: says what goes here, with an optional next action / tone. */
export function EmptyState({
  icon,
  title,
  hint,
  tone = 'muted',
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  tone?: 'muted' | 'success';
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon ? (
        <span className={cx('mb-1', tone === 'success' ? 'text-success' : 'text-muted')}>{icon}</span>
      ) : null}
      <p className={cx('text-body font-medium', tone === 'success' ? 'text-success' : 'text-fg')}>{title}</p>
      {hint ? <p className="max-w-sm text-caption text-muted">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** An inline, recoverable error strip. */
export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-danger/30 bg-danger/10 px-4 py-3"
    >
      <p className="text-body text-danger">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-control px-2 py-1 text-caption font-medium text-danger underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
