import type { HTMLAttributes, ReactNode } from 'react';

/** Small className joiner — avoids a dependency for one helper. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** A surface card: shared radius, border and elevation language. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx('rounded-card border bg-surface shadow-e1', className)}
      {...props}
    />
  );
}

/** A titled panel — a Card with a header row for section content. */
export function Panel({
  title,
  caption,
  actions,
  children,
  className,
}: {
  title: string;
  caption?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cx('overflow-hidden', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-fg">{title}</h2>
          {caption ? <p className="mt-1 text-caption text-muted">{caption}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </Card>
  );
}
