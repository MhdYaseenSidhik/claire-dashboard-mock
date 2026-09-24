import { ArrowDownCircle, ArrowUpCircle, CheckCircle2, PauseCircle } from 'lucide-react';
import type { Alert, AlertKind } from '../lib/analysis';
import { formatNum } from '../lib/format';
import { Panel } from './ui/Card';
import { Badge, Chip, Dot, type Tone } from './ui/Badge';
import { EmptyState, Skeleton } from './ui/State';

interface Group {
  key: 'under' | 'over' | 'nonmoving';
  title: string;
  kinds: AlertKind[];
  tone: Tone;
  emptyTitle: string;
  emptyHint: string;
}

const GROUPS: Group[] = [
  {
    key: 'under',
    title: 'Understock',
    kinds: ['UNDERSTOCK'],
    tone: 'danger',
    emptyTitle: 'No understock items',
    emptyHint: 'Every material is above its reorder point and safety stock.',
  },
  {
    key: 'over',
    title: 'Overstock',
    kinds: ['OVERSTOCK'],
    tone: 'warning',
    emptyTitle: 'No overstock items',
    emptyHint: 'No material is holding well above its reorder point.',
  },
  {
    key: 'nonmoving',
    title: 'Non-moving / slow-moving',
    kinds: ['NON_MOVING', 'SLOW_MOVING'],
    tone: 'warning',
    emptyTitle: 'Everything is moving',
    emptyHint: 'No non-moving or slow-moving materials this snapshot.',
  },
];

function kindTone(kind: AlertKind): Tone {
  switch (kind) {
    case 'UNDERSTOCK':
      return 'danger';
    case 'OVERSTOCK':
      return 'warning';
    case 'NON_MOVING':
      return 'danger';
    case 'SLOW_MOVING':
      return 'warning';
  }
}

function kindLabel(kind: AlertKind): string {
  return {
    UNDERSTOCK: 'Understock',
    OVERSTOCK: 'Overstock',
    NON_MOVING: 'Non-moving',
    SLOW_MOVING: 'Slow-moving',
  }[kind];
}

function trigger(a: Alert): string {
  if (a.kind === 'UNDERSTOCK') {
    return `Stock ${formatNum(a.currentStock)} ≤ ROP ${formatNum(a.reorderPoint)} / SS ${formatNum(a.safetyStock)}`;
  }
  if (a.kind === 'OVERSTOCK') {
    return `Stock ${formatNum(a.currentStock)} vs ROP ${formatNum(a.reorderPoint)}`;
  }
  return `Last month consumption ${formatNum(a.lastConsumption)}`;
}

function AlertRow({ a }: { a: Alert }) {
  const tone = kindTone(a.kind);
  return (
    <li className="flex items-start gap-3 px-6 py-3">
      <span className="mt-1.5">
        <Dot tone={tone} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="nums text-body font-medium text-fg">{a.materialCode}</span>
          <Chip>{a.plant}</Chip>
          {a.criticalSpare ? <Badge tone="info">Critical</Badge> : null}
        </div>
        <p className="mt-0.5 truncate text-caption text-muted">{a.description}</p>
        <p className="nums mt-1 text-caption text-muted">{trigger(a)}</p>
      </div>
      <Badge tone={tone} className="mt-0.5 shrink-0">
        {kindLabel(a.kind)}
      </Badge>
    </li>
  );
}

function GroupPanel({ group, alerts }: { group: Group; alerts: Alert[] }) {
  const rows = alerts.filter((a) => group.kinds.includes(a.kind));
  const Icon = group.key === 'under' ? ArrowDownCircle : group.key === 'over' ? ArrowUpCircle : PauseCircle;
  return (
    <Panel
      title={group.title}
      caption={rows.length ? `${rows.length} flagged` : 'None flagged'}
      actions={<span className="text-muted"><Icon size={18} /></span>}
    >
      {rows.length === 0 ? (
        <EmptyState icon={<CheckCircle2 size={22} />} title={group.emptyTitle} hint={group.emptyHint} tone="success" />
      ) : (
        <ul className="divide-y divide-border/10">
          {rows.map((a) => (
            <AlertRow key={`${a.kind}-${a.materialCode}-${a.plant}`} a={a} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function AlertPanels({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {GROUPS.map((g) => (
        <GroupPanel key={g.key} group={g} alerts={alerts} />
      ))}
    </div>
  );
}

export function AlertPanelsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {GROUPS.map((g) => (
        <Panel key={g.key} title={g.title} caption="Loading…">
          <ul className="divide-y divide-border/10">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="flex items-start gap-3 px-6 py-3">
                <Skeleton className="mt-1 h-2 w-2 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-2 h-3 w-40" />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}
