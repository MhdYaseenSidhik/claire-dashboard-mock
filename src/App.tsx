import { Boxes } from 'lucide-react';

/**
 * Baseline app shell. Later tickets (S-2+) mount the real KPI grid,
 * forecast charts, alerts and PR recommendations here, wired to the
 * analysis output of the SAP extract.
 */
export default function App() {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-surface">
        <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-6 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-control bg-accent/10 text-accent">
            <Boxes size={20} />
          </span>
          <div>
            <h1 className="text-base font-semibold leading-tight text-fg">
              Claire — Inventory &amp; Forecasting
            </h1>
            <p className="text-xs text-muted">Stores &amp; spares · demand forecast · KPI cockpit</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-6 py-10">
        <section className="rounded-card border bg-surface p-10 text-center shadow-e1">
          <h2 className="text-xl font-semibold text-fg">Dashboard baseline ready</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Scaffold in place. KPI cards, forecast charts, stock alerts and purchase-requisition
            recommendations are wired in by the following tickets.
          </p>
        </section>
      </main>
    </div>
  );
}
