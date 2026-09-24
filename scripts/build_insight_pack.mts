/**
 * Build the monthly INSIGHT PACK spec the delivery step ships (INV-7 / S-7).
 *
 * Reads the committed analysis bundle (public/data/analysis.json — produced by
 * scripts/build_analysis.mts from the SAP extract + forecast layer) and emits a
 * single deterministic spec at public/data/insight_pack.json:
 *
 *   { generatedAt, meta, kpiRows, prRecommendations, alerts, forecasts, emailMarkdown }
 *
 * That spec is what the delivery seat feeds to build_xlsx (workbook),
 * build_pptx (deck) and ms_send_mail (email) — so the pack is REGENERATED from
 * the bundle every month, never hand-typed, and the delivery path makes NO call
 * to the forecasting MCP. The MCP is upstream (S-3); if it was not reachable the
 * bundle already carries a labelled seasonal-naive baseline and this spec surfaces
 * that label verbatim, so nothing is passed off as MCP output.
 *
 * Run via `npm run build:pack` (tsx). Requires build:data to have run first.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '..', 'public', 'data');
const read = (f: string) => JSON.parse(readFileSync(resolve(dataDir, f), 'utf8'));

type Kpis = Record<string, number>;
interface Rec {
  materialCode: string;
  plant: string;
  category: string;
  recommend: boolean;
  raiseByDate: string;
  qty: number;
  reason: string;
  leadTimeDays: number;
}
interface Bundle {
  generatedAt: string;
  meta: { snapshotDate: string; materialCount: number; forecastEngine: string; dataGaps: string[] };
  kpis: Kpis;
  forecasts: Array<{ materialCode: string; plant: string; method: string; h3: number; h6: number; h12: number }>;
  alerts: Array<Record<string, unknown>>;
  recommendations: Rec[];
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const bundle = read('analysis.json') as Bundle;
const { kpis, meta } = bundle;

// KPI table rows for the workbook Summary sheet.
const kpiRows: Array<[string, number | string, string]> = [
  ['Snapshot date', meta.snapshotDate, 'SAP extract snapshot'],
  ['Materials in scope', meta.materialCount, 'across plants and categories'],
  ['Gross inventory value', kpis.grossInventoryValue, 'INR'],
  ['Average days on hand (moving)', kpis.daysOnHand, 'days'],
  ['Average turnover', kpis.turnover, 'x per year'],
  ['Non-moving items (NMI)', kpis.nmiCount, 'count'],
  ['NMI value', kpis.nmiValue, 'INR — frozen capital'],
  ['Slow-moving items (SMI)', kpis.smiCount, 'count'],
  ['SMI value', kpis.smiValue, 'INR'],
  ['Forecast accuracy', kpis.forecastAccuracyPct, '% (back-test)'],
  ['Critical spares total', kpis.criticalSparesTotal, 'count'],
  ['Critical spares available', kpis.criticalSparesAvailable, 'count'],
  ['Critical-spares availability', kpis.criticalSparesAvailabilityPct, '%'],
  ['Forecast engine', meta.forecastEngine, 'from the analysis bundle'],
];

// PR recommendations, soonest raise-by first (the action list).
const prRecommendations = bundle.recommendations
  .filter((r) => r.recommend)
  .sort((a, b) => a.raiseByDate.localeCompare(b.raiseByDate));

const emailMarkdown = [
  `# Monthly Inventory Insight Pack — snapshot ${meta.snapshotDate}`,
  '',
  '## Headline KPIs',
  `- Gross inventory value: ${inr(kpis.grossInventoryValue)}`,
  `- Critical-spares availability: ${kpis.criticalSparesAvailabilityPct}% (${kpis.criticalSparesAvailable}/${kpis.criticalSparesTotal})`,
  `- Frozen capital: ${inr(kpis.nmiValue + kpis.smiValue)} in ${kpis.nmiCount} NMI + ${kpis.smiCount} SMI`,
  `- Days on hand ${kpis.daysOnHand} / turnover ${kpis.turnover}x`,
  '',
  `## ${prRecommendations.length} purchase requisitions recommended`,
  ...prRecommendations.map((r) => `- ${r.materialCode} (${r.plant}) — raise by ${r.raiseByDate}, qty ${r.qty}: ${r.reason}`),
  '',
  '## Method & caveats',
  ...meta.dataGaps.map((g) => `- ${g}`),
  `- Forecast engine: ${meta.forecastEngine}`,
].join('\n');

const spec = {
  generatedAt: new Date().toISOString(),
  meta,
  kpiRows,
  prRecommendations,
  alerts: bundle.alerts,
  forecasts: bundle.forecasts.map((f) => ({
    materialCode: f.materialCode,
    plant: f.plant,
    method: f.method,
    h3: f.h3,
    h6: f.h6,
    h12: f.h12,
  })),
  emailMarkdown,
};

writeFileSync(resolve(dataDir, 'insight_pack.json'), JSON.stringify(spec, null, 2) + '\n');
console.log(
  `insight_pack.json: ${kpiRows.length} KPI rows, ${prRecommendations.length} PR recs, ${spec.alerts.length} alerts, ${spec.forecasts.length} forecasts`,
);
