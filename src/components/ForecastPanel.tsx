import { useMemo, useState } from 'react';
import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';
import type { Forecast } from '../lib/analysis';
import { formatMonth, formatNum } from '../lib/format';
import { Panel } from './ui/Card';
import { Select } from './ui/Select';
import { SegmentedControl } from './ui/SegmentedControl';
import { EmptyState, Skeleton } from './ui/State';
import { cx } from './ui/Card';

type Horizon = '3' | '6' | '12';

const HORIZON_OPTS = [
  { value: '3' as const, label: '3 mo' },
  { value: '6' as const, label: '6 mo' },
  { value: '12' as const, label: '12 mo' },
];

const ALL = '__all__';

interface Row {
  month: string;
  actual: number | null;
  forecast: number | null;
}

/** Stitch history + forecast into one series, overlapping at the seam so the
 * accent line continues visually from the last actual. */
function buildSeries(f: Forecast, horizon: number): { rows: Row[]; seam: string | null } {
  const hist = f.history.map<Row>((p) => ({ month: p.month, actual: p.qty, forecast: null }));
  const lastHist = f.history.length ? f.history[f.history.length - 1] : null;
  const seam = lastHist?.month ?? null;
  if (seam && hist.length) {
    hist[hist.length - 1] = { ...hist[hist.length - 1], forecast: lastHist!.qty };
  }
  const fut = f.future.slice(0, horizon).map<Row>((p) => ({ month: p.month, actual: null, forecast: p.qty }));
  return { rows: [...hist, ...fut], seam };
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-control border bg-surface px-3 py-2 text-caption shadow-e2">
      <p className="mb-1 font-medium text-fg">{formatMonth(label ?? '')}</p>
      {payload
        .filter((p) => p.value != null)
        .map((p) => (
          <p key={p.name} className="nums flex items-center gap-2 text-muted">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}: <span className="font-medium text-fg">{formatNum(p.value, 1)}</span>
          </p>
        ))}
    </div>
  );
}

export function ForecastPanel({ forecasts }: { forecasts: Forecast[] }) {
  const plants = useMemo(
    () => [ALL, ...Array.from(new Set(forecasts.map((f) => f.plant))).sort()],
    [forecasts],
  );

  const [plant, setPlant] = useState<string>(ALL);
  const [selected, setSelected] = useState<string>(forecasts[0]?.materialCode ?? '');
  const [horizon, setHorizon] = useState<Horizon>('6');

  const materialsForPlant = useMemo(
    () => forecasts.filter((f) => plant === ALL || f.plant === plant),
    [forecasts, plant],
  );

  // Keep the selection valid when the plant filter changes.
  const active =
    materialsForPlant.find((f) => f.materialCode === selected) ?? materialsForPlant[0] ?? null;

  const { rows, seam } = useMemo(
    () => (active ? buildSeries(active, Number(horizon)) : { rows: [], seam: null }),
    [active, horizon],
  );

  const horizonTotal = active ? active[`h${horizon}` as const] : 0;
  const accent = 'rgb(var(--accent))';
  const muted = 'rgb(var(--muted))';

  return (
    <Panel
      title="Demand forecast"
      caption={
        <>
          History → {horizon}-month forecast per material &amp; plant. Method:{' '}
          <span className="font-medium text-fg">{active?.method ?? '—'}</span>.
        </>
      }
      actions={<SegmentedControl options={HORIZON_OPTS} value={horizon} onChange={setHorizon} ariaLabel="Forecast horizon" />}
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Plant"
            value={plant}
            onChange={(v) => {
              setPlant(v);
              const next = forecasts.find((f) => (v === ALL || f.plant === v));
              if (next && !forecasts.some((f) => f.materialCode === selected && (v === ALL || f.plant === v))) {
                setSelected(next.materialCode);
              }
            }}
            options={plants.map((p) => ({ value: p, label: p === ALL ? 'All plants' : p }))}
          />
          <Select
            label="Material"
            value={active?.materialCode ?? ''}
            onChange={setSelected}
            options={materialsForPlant.map((f) => ({
              value: f.materialCode,
              label: `${f.materialCode} · ${f.plant}`,
            }))}
          />
        </div>

        {!active ? (
          <EmptyState
            icon={<LineChartIcon size={22} />}
            title="No consumption history for this selection"
            hint="Choose another plant or material to see its forecast."
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-caption text-muted">Forecast demand · next {horizon} mo</p>
                <p className="nums text-xl font-semibold text-fg">{formatNum(horizonTotal, 1)} units</p>
              </div>
              <div className="h-8 w-px bg-border/40" />
              <div className="flex items-center gap-4 text-caption text-muted">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-0.5 w-4" style={{ background: muted }} /> Actual
                </span>
                <span className="flex items-center gap-2">
                  <span className="inline-block h-0.5 w-4" style={{ background: accent }} /> Forecast
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="fc-band" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={accent} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={accent} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonth}
                    tick={{ fontSize: 11, fill: muted }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgb(var(--border) / 0.15)' }}
                    minTickGap={16}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: muted }}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgb(var(--border) / 0.3)' }} />
                  {seam ? (
                    <ReferenceLine
                      x={seam}
                      stroke="rgb(var(--border) / 0.4)"
                      strokeDasharray="4 4"
                      label={{ value: 'today', position: 'insideTopRight', fontSize: 10, fill: muted }}
                    />
                  ) : null}
                  <Area
                    type="monotone"
                    dataKey="forecast"
                    stroke="none"
                    fill="url(#fc-band)"
                    connectNulls
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual"
                    stroke={muted}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    name="Forecast"
                    stroke={accent}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}

export function ForecastPanelSkeleton() {
  return (
    <Panel title="Demand forecast" caption="Loading forecast series…">
      <div className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
        <Skeleton className={cx('h-64 w-full')} />
      </div>
    </Panel>
  );
}
