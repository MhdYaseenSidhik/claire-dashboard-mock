import type { ReactNode } from 'react';
import { AlertTriangle, Boxes, CalendarClock, Gauge, RefreshCw, ShieldCheck } from 'lucide-react';
import type { Kpis } from '../lib/analysis';
import { formatInr, formatNum, formatPct } from '../lib/format';
import { Card } from './ui/Card';
import { Skeleton } from './ui/State';
import { cx } from './ui/Card';
import type { Tone } from './ui/Badge';

interface Tile {
  label: string;
  value: string;
  icon: ReactNode;
  tone: Tone;
  sub?: string;
  target?: string;
}

function toTiles(k: Kpis): Tile[] {
  return [
    {
      label: 'Gross inventory value',
      value: formatInr(k.grossInventoryValue),
      icon: <Boxes size={16} />,
      tone: 'accent',
      sub: 'Current stock × unit cost',
    },
    {
      label: 'Days on hand',
      value: formatNum(k.daysOnHand),
      icon: <CalendarClock size={16} />,
      tone: 'info',
      sub: 'Avg over moving materials',
      target: 'Target ≤ 90',
    },
    {
      label: 'Turnover',
      value: `${formatNum(k.turnover, 2)}×`,
      icon: <RefreshCw size={16} />,
      tone: 'info',
      sub: 'Annual consumption ÷ stock',
      target: 'Target ≥ 4×',
    },
    {
      label: 'NMI / SMI',
      value: `${k.nmiCount} / ${k.smiCount}`,
      icon: <AlertTriangle size={16} />,
      tone: 'warning',
      sub: `${formatInr(k.nmiValue + k.smiValue)} tied up`,
    },
    {
      label: 'Forecast accuracy',
      value: formatPct(k.forecastAccuracyPct),
      icon: <Gauge size={16} />,
      tone: k.forecastAccuracyPct >= 80 ? 'success' : 'warning',
      sub: 'FY25 vs latest run rate',
    },
    {
      label: 'Critical-spares availability',
      value: formatPct(k.criticalSparesAvailabilityPct),
      icon: <ShieldCheck size={16} />,
      tone: k.criticalSparesAvailabilityPct >= 90 ? 'success' : 'danger',
      sub: `${k.criticalSparesAvailable} of ${k.criticalSparesTotal} above ROP`,
    },
  ];
}

function TileCard({ tile }: { tile: Tile }) {
  const iconTone: Record<Tone, string> = {
    neutral: 'bg-fg/5 text-muted',
    accent: 'bg-accent/10 text-accent',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-info/10 text-info',
  };
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <p className="text-caption font-medium text-muted">{tile.label}</p>
        <span className={cx('grid h-7 w-7 place-items-center rounded-control', iconTone[tile.tone])}>
          {tile.icon}
        </span>
      </div>
      <p className="nums mt-3 text-2xl font-semibold text-fg">{tile.value}</p>
      {tile.sub ? <p className="mt-1 text-caption text-muted">{tile.sub}</p> : null}
      {tile.target ? <p className="mt-0.5 text-caption text-muted/80">{tile.target}</p> : null}
    </Card>
  );
}

export function KpiGrid({ kpis }: { kpis: Kpis }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {toTiles(kpis).map((t) => (
        <TileCard key={t.label} tile={t} />
      ))}
    </div>
  );
}

export function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-7 rounded-control" />
          </div>
          <Skeleton className="mt-4 h-8 w-24" />
          <Skeleton className="mt-2 h-3 w-32" />
        </Card>
      ))}
    </div>
  );
}
