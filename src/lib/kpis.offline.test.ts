/**
 * S-4 INV-4 — offline reproducibility regression.
 *
 * The prior S-4 run aborted on a transient network failure (getaddrinfo
 * ENOTFOUND bedrock-runtime.us-east-1.amazonaws.com) before it committed. That
 * was infra, not this module: the KPI/alert/PR layer is pure and reads only the
 * static fixtures shipped in public/data. This test PROVES that independently —
 * it disables the network (fetch throws) and asserts alertsFor and
 * prRecommendations still run to completion over the fixtures. It fails without
 * the KPI module (import + calls) and passes with it, so it is the regression
 * guard that keeps the S-4 deliverable reproducible with no network access.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as kpis from './kpis';
import rawRows from '../../public/data/extract.rows.json';
import forecasts from '../../public/data/forecasts.json';

const rows = rawRows as unknown as kpis.MaterialRow[];

// Anything that would reach the network throws, so a hidden dependency surfaces
// here as a failure rather than as a flaky run against a live backend.
const netBlocked = () => {
  throw new Error('network access is not allowed in the S-4 computation layer');
};

describe('S-4 INV-4 — runs offline against the static fixtures (regression)', () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeAll(() => {
    originalFetch = globalThis.fetch;
    // Deliberately replace fetch with a throwing stub for the duration of the suite.
    globalThis.fetch = vi.fn(netBlocked) as unknown as typeof globalThis.fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch as typeof globalThis.fetch;
  });

  it('the fixtures are real, non-empty inputs (not the empty placeholder)', () => {
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    expect(Object.keys(forecasts as Record<string, unknown>).length).toBeGreaterThan(0);
  });

  it('alertsFor runs to completion for every row with no network', () => {
    const valid = new Set(['UNDERSTOCK', 'OVERSTOCK', 'NON_MOVING', 'SLOW_MOVING']);
    let processed = 0;
    for (const row of rows) {
      const alerts = kpis.alertsFor(row);
      expect(Array.isArray(alerts)).toBe(true);
      for (const a of alerts) expect(valid.has(a)).toBe(true);
      processed += 1;
    }
    expect(processed).toBe(rows.length);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('prRecommendations returns one advisory rec per row with no network', () => {
    const recs = kpis.prRecommendations(rows, forecasts as kpis.ForecastMap);
    expect(recs.length).toBe(rows.length);
    for (const rec of recs) {
      expect(rec.advisory).toBe(true);
      expect(typeof rec.recommend).toBe('boolean');
      expect(Number.isNaN(Date.parse(rec.raiseByDate))).toBe(false);
      expect(Number.isFinite(rec.qty)).toBe(true);
      expect(rec.qty).toBeGreaterThanOrEqual(0);
    }
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('the whole KPI summary computes offline (gross value, NMI/SMI, accuracy, spares)', () => {
    expect(Number.isFinite(kpis.grossInventoryValue(rows))).toBe(true);
    const nmi = kpis.nmiSmiSummary(rows);
    expect(nmi.nmiCount + nmi.smiCount).toBeLessThanOrEqual(rows.length);
    const acc = kpis.forecastAccuracy(rows);
    expect(acc).toBeGreaterThanOrEqual(0);
    expect(acc).toBeLessThanOrEqual(1);
    const spares = kpis.criticalSparesAvailability(rows);
    expect(spares.available).toBeLessThanOrEqual(spares.total);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
