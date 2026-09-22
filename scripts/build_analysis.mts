/**
 * Build the runtime analysis bundle the dashboard consumes.
 *
 * Reads the committed extract (public/data/extract.rows.json) and monthly
 * consumption (public/data/monthly.json), runs the REAL computation layer
 * (src/lib/kpis.ts + src/lib/forecast.ts) over them, and writes:
 *
 *   public/data/forecasts.json   per material+plant {h3,h6,h12} (the QA contract)
 *   public/data/analysis.json    { generatedAt, meta, kpis, forecasts, alerts, recommendations }
 *
 * Run via `npm run build:data` (tsx). This is the single source of the numbers
 * shown in the UI and published to the session dashboard — no figure is typed
 * by hand into the app.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  grossInventoryValue,
  daysOnHand,
  turnover,
  classifyMovement,
  nmiSmiSummary,
  forecastAccuracy,
  criticalSparesAvailability,
  alertsFor,
  prRecommendations,
  type MaterialRow,
  type ForecastMap,
} from '../src/lib/kpis';
import { forecastAll, type MonthlyRow } from '../src/lib/forecast';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '..', 'public', 'data');
const read = (f: string) => JSON.parse(readFileSync(resolve(dataDir, f), 'utf8'));

const rows = read('extract.rows.json') as MaterialRow[];
const monthly = read('monthly.json') as MonthlyRow[];

// 1) Forecasts (3/6/12 month) per material + plant.
const forecasts = forecastAll(monthly);
const forecastMap: ForecastMap = {};
for (const f of forecasts) {
  forecastMap[`${f.materialCode}|${f.plant}`] = { h3: f.h3, h6: f.h6, h12: f.h12 };
}
writeFileSync(resolve(dataDir, 'forecasts.json'), JSON.stringify(forecastMap, null, 2) + '\n');

// 2) KPIs.
const nmiSmi = nmiSmiSummary(rows);
const critical = criticalSparesAvailability(rows);
const grossValue = grossInventoryValue(rows);
const movingRows = rows.filter((r) => classifyMovement(r) === 'MOVING');
const avgDoh =
  movingRows.length > 0
    ? movingRows.reduce((s, r) => {
        const d = daysOnHand(r);
        return s + (Number.isFinite(d) ? d : 0);
      }, 0) / movingRows.length
    : 0;
const avgTurnover =
  rows.length > 0 ? rows.reduce((s, r) => s + turnover(r), 0) / rows.length : 0;

const kpis = {
  grossInventoryValue: Math.round(grossValue),
  daysOnHand: Math.round(avgDoh),
  turnover: Math.round(avgTurnover * 100) / 100,
  nmiCount: nmiSmi.nmiCount,
  smiCount: nmiSmi.smiCount,
  nmiValue: Math.round(nmiSmi.nmiValue),
  smiValue: Math.round(nmiSmi.smiValue),
  forecastAccuracyPct: Math.round(forecastAccuracy(rows) * 1000) / 10,
  criticalSparesTotal: critical.total,
  criticalSparesAvailable: critical.available,
  criticalSparesAvailabilityPct: critical.availabilityPct,
};

// 3) Alerts (flattened per material with its triggering numbers).
const alerts = rows.flatMap((r) =>
  alertsFor(r).map((kind) => ({
    kind,
    materialCode: r.materialCode,
    description: r.description,
    category: r.category,
    plant: r.plant,
    currentStock: r.currentStock,
    reorderPoint: r.reorderPoint,
    safetyStock: r.safetyStock,
    lastConsumption: r.consJun,
    materialType: r.materialType,
    criticalSpare: r.criticalSpare,
  })),
);

// 4) PR recommendations.
const recommendations = prRecommendations(rows, forecastMap);

const bundle = {
  generatedAt: new Date().toISOString(),
  meta: {
    snapshotDate: rows[0]?.snapshotDate ?? '2026-09-01',
    materialCount: rows.length,
    forecastMethod: 'seasonal-naive-baseline',
    forecastEngine: 'MCP engine not reachable this run — transparent seasonal-naive baseline over Monthly_Consumption',
    dataGaps: [
      'The SAP extract carries no PR/PO history — purchase-requisition timing is DERIVED (stock + forecast demand over lead time vs reorder point / safety stock) and every recommendation is advisory.',
      'This dataset is the mock extract described in the brief, encoded deterministically by scripts/build_fixtures.py; it is not a live SAP feed.',
    ],
  },
  kpis,
  forecasts,
  alerts,
  recommendations,
};

writeFileSync(resolve(dataDir, 'analysis.json'), JSON.stringify(bundle, null, 2) + '\n');
console.log(
  `analysis.json: ${forecasts.length} forecasts, ${alerts.length} alerts, ${recommendations.filter((r) => r.recommend).length} PR recs (of ${recommendations.length})`,
);
