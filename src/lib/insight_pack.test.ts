import { describe, it, expect } from 'vitest';
import bundle from '../../public/data/analysis.json';
import pack from '../../public/data/insight_pack.json';

/**
 * Contract for the INV-7 monthly insight pack (scripts/build_insight_pack.mts).
 *
 * The delivery step (workbook + deck + email) must be built from the committed
 * analysis bundle, NOT from a fresh forecasting-MCP call. These tests pin that:
 * the emitted spec is internally consistent with analysis.json, and it carries
 * the bundle's forecast-engine label verbatim so a baseline is never passed off
 * as MCP output. Regenerate the spec with `npm run build:pack` before running.
 */
describe('INV-7 insight pack spec', () => {
  it('has PR recommendations equal to the recommend-true bundle rows', () => {
    const bundleRecs = bundle.recommendations.filter((r) => r.recommend);
    expect(pack.prRecommendations.length).toBe(bundleRecs.length);
  });

  it('carries alerts and forecasts through 1:1', () => {
    expect(pack.alerts.length).toBe(bundle.alerts.length);
    expect(pack.forecasts.length).toBe(bundle.forecasts.length);
  });

  it('surfaces gross inventory value matching the bundle', () => {
    const givRow = pack.kpiRows.find((r) => r[0] === 'Gross inventory value');
    expect(givRow?.[1]).toBe(bundle.kpis.grossInventoryValue);
  });

  it('carries the forecast-engine label verbatim (no MCP output is faked)', () => {
    expect(pack.meta.forecastEngine).toBe(bundle.meta.forecastEngine);
    expect(pack.emailMarkdown).toContain(bundle.meta.forecastEngine);
  });

  it('sorts PR recommendations by soonest raise-by date', () => {
    const dates = pack.prRecommendations.map((r) => r.raiseByDate);
    const sorted = [...dates].sort((a, b) => a.localeCompare(b));
    expect(dates).toEqual(sorted);
  });
});
