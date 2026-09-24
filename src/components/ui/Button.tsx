import type { ButtonHTMLAttributes } from 'react';
import { cx } from './Card';

type Variant = 'primary' | 'secondary' | 'ghost';

const variantClass: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:brightness-110 active:brightness-95 shadow-e1',
  secondary: 'border bg-surface text-fg hover:bg-surface-2',
  ghost: 'text-muted hover:text-fg hover:bg-fg/5',
};

/** Shared button — one set of heights, radii and all interaction states. */
export function Button({
  variant = 'secondary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cx(
        'inline-flex h-control-sm items-center justify-center gap-2 rounded-control px-3 text-body font-medium',
        'transition duration-fast ease-out disabled:pointer-events-none disabled:opacity-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
        variantClass[variant],
        className,
      )}
      {...props}
    />
  );
}
