import { cx } from './Card';

export interface SegOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Segmented control — used for the forecast horizon (3/6/12). Keyboard-operable
 * radio group with a visible focus ring and an accent active segment.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex h-control-sm items-center gap-1 rounded-control border bg-surface-2 p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cx(
              'rounded-control px-3 text-caption font-medium transition duration-fast ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
              active ? 'bg-accent text-white shadow-e1' : 'text-muted hover:text-fg',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
