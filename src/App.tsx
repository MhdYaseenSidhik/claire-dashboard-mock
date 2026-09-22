import { Boxes, TriangleAlert } from 'lucide-react';
import { useAnalysis } from './hooks/useAnalysis';
import { formatDate } from './lib/format';
import { KpiGrid, KpiGridSkeleton } from './components/KpiGrid';
import { ForecastPanel, ForecastPanelSkeleton } from './components/ForecastPanel';
import { AlertPanels, AlertPanelsSkeleton } from './components/AlertPanels';
import { PrRecTable, PrRecTableSkeleton } from './components/PrRecTable';
import { ThemeToggle } from './components/ThemeToggle';
import { InlineError } from './components/ui/State';
import { Chip } from './components/ui/Badge';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-xl font-semibold text-fg">{children}</h2>;
}

export default function App() {
  const state = useAnalysis();

  return (
    <div className="min-h-screen bg-surface-2">
      <header className="sticky top-0 z-20 border-b bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-page items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-control bg-accent/10 text-accent">
              <Boxes size={20} />
            </span>
            <div>
              <h1 className="text-base font-semibold leading-tight text-fg">
                Claire — Inventory &amp; Forecasting
              </h1>
              <p className="text-caption text-muted">Stores &amp; spares · demand forecast · KPI cockpit</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {state.status === 'ready' ? (
              <Chip className="hidden sm:inline-flex">Snapshot {formatDate(state.data.meta.snapshotDate)}</Chip>
            ) : null}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-page flex-col gap-8 px-6 py-8">
        {state.status === 'error' ? (
          <InlineError message={state.error} onRetry={state.reload} />
        ) : null}

        {state.status === 'ready' && state.data.meta.forecastEngine ? (
          <div className="flex items-start gap-2 rounded-card border border-info/25 bg-info/10 px-4 py-3 text-caption text-info">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            <p>
              <span className="font-semibold">Forecast method: {state.data.meta.forecastMethod}.</span>{' '}
              {state.data.meta.forecastEngine} Recommendations are advisory — see the notes below the PR table.
            </p>
          </div>
        ) : null}

        <section aria-labelledby="kpi-heading">
          <h2 id="kpi-heading" className="sr-only">Key performance indicators</h2>
          {state.status === 'ready' ? <KpiGrid kpis={state.data.kpis} /> : <KpiGridSkeleton />}
        </section>

        <section aria-labelledby="forecast-heading">
          <h2 id="forecast-heading" className="sr-only">Demand forecast</h2>
          {state.status === 'ready' ? (
            <ForecastPanel forecasts={state.data.forecasts} />
          ) : (
            <ForecastPanelSkeleton />
          )}
        </section>

        <section aria-labelledby="alerts-heading">
          <SectionTitle>
            <span id="alerts-heading">Stock alerts</span>
          </SectionTitle>
          {state.status === 'ready' ? <AlertPanels alerts={state.data.alerts} /> : <AlertPanelsSkeleton />}
        </section>

        <section aria-labelledby="recs-heading">
          <SectionTitle>
            <span id="recs-heading">Purchase requisitions</span>
          </SectionTitle>
          {state.status === 'ready' ? (
            <PrRecTable recommendations={state.data.recommendations} />
          ) : (
            <PrRecTableSkeleton />
          )}
        </section>

        <footer className="border-t pt-6 text-caption text-muted">
          {state.status === 'ready' ? (
            <p>
              {state.data.meta.materialCount} materials · generated {formatDate(state.data.generatedAt)} ·{' '}
              {state.data.meta.dataGaps[0]}
            </p>
          ) : (
            <p>Loading analysis bundle…</p>
          )}
        </footer>
      </main>
    </div>
  );
}
