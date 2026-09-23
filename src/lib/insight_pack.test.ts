import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Contract for the INV-7 monthly insight pack (scripts/build_insight_pack.mts).
 *
 * The delivery step (workbook + deck + email) must be built from the committed
 * analysis bundle, NOT from a fresh forecasting-MCP call. These tests pin that:
 * the emitted spec is internally consistent with analysis.json, and it carries
 * the bundle's forecast-engine label verbatim so a baseline is never passed off
 * as MCP output. Run `npm run build:pack` first to generate the spec.
 */
const dataDir = resolve(__dirname, '..', '..', 'public', 'data');
const read = (f: string) => JSON.parse(readFileSync(resolve(dataDir, f), 'utf8'));

describe('INV-7 insight pack spec', () => {
  const packPath = resolve(dataDir, 'insight_pack.json');

  it('has been generated (run `npm run build:pack`)', () => {
    expect(existsSync(packPath)).toBe(true);
  });

  it('is consistent with the analysis bundle', () => {
    const bundle = read('analysis.json');
    const pack = read('insight_pack.json');

    // PR recommendations in the pack === the recommend-true rows in the bundle.
    const bundleRecs = bundle.recommendations.filter((r: { recommend: boolean }) => r.recommend);
    expect(pack.prRecommendations.length).toBe(bundleRecs.length);

    // Alerts and forecasts carried through 1:1.
    expect(pack.alerts.length).toBe(bundle.alerts.length);
    expect(pack.forecasts.length).toBe(bundle.forecasts.length);

    // Gross inventory value surfaced in the KPI table matches the bundle.
    const givRow = pack.kpiRows.find((r: [string, unknown, string]) => r[0] === 'Gross inventory value');
    expect(givRow?.[1]).toBe(bundle.kpis.grossInventoryValue);
  });

  it('carries the forecast-engine label verbatim (no MCP output is faked)', () => {
    const bundle = read('analysis.json');
    const pack = read('insight_pack.json');
    expect(pack.meta.forecastEngine).toBe(bundle.meta.forecastEngine);
    expect(pack.emailMarkdown).toContain(bundle.meta.forecastEngine);
  });

  it('sorts PR recommendations by soonest raise-by date', () => {
    const pack = read('insight_pack.json');
    const dates = pack.prRecommendations.map((r: { raiseByDate: string }) => r.raiseByDate);
    const sorted = [...dates].sort((a, b) => a.localeCompare(b));
    expect(dates).toEqual(sorted);
  });
});
