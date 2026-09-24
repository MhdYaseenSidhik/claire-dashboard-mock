import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchAnalysis, type AnalysisBundle } from './analysis';

/**
 * Regression guard for the analysis-bundle loader (S-6 / INV-6).
 *
 * The dashboard reads its numbers from public/data/analysis.json via
 * fetchAnalysis. The PR-recommendation table iterates bundle.recommendations,
 * so a bundle where that field is missing or is not an array must be rejected
 * at load time with a readable error — otherwise it slips past the loader and
 * throws a TypeError inside render (a blank/broken screen with no explanation).
 *
 * These tests pin that contract: fetchAnalysis returns a well-formed bundle and
 * throws a specific, catchable error on every malformed shape the loader is
 * responsible for, including a missing/invalid recommendations array.
 */

function makeResponse(body: unknown, init?: { ok?: boolean; status?: number; statusText?: string }): Response {
  const ok = init?.ok ?? true;
  return {
    ok,
    status: init?.status ?? (ok ? 200 : 500),
    statusText: init?.statusText ?? (ok ? 'OK' : 'Internal Server Error'),
    json: async () => body,
  } as unknown as Response;
}

const wellFormed: AnalysisBundle = {
  generatedAt: '2026-09-22T00:00:00.000Z',
  meta: {
    snapshotDate: '2026-09-01',
    materialCount: 1,
    forecastMethod: 'seasonal-naive-baseline',
    forecastEngine: 'baseline',
    dataGaps: [],
  },
  kpis: {
    grossInventoryValue: 1,
    daysOnHand: 1,
    turnover: 1,
    nmiCount: 0,
    smiCount: 0,
    nmiValue: 0,
    smiValue: 0,
    forecastAccuracyPct: 90,
    criticalSparesTotal: 1,
    criticalSparesAvailable: 1,
    criticalSparesAvailabilityPct: 100,
  },
  forecasts: [],
  alerts: [],
  recommendations: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchAnalysis', () => {
  it('returns the bundle when the payload is well-formed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse(wellFormed)));
    await expect(fetchAnalysis('data/analysis.json')).resolves.toMatchObject({
      kpis: { grossInventoryValue: 1 },
      forecasts: [],
      alerts: [],
      recommendations: [],
    });
  });

  it('throws a readable error on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(makeResponse(null, { ok: false, status: 404, statusText: 'Not Found' })),
    );
    await expect(fetchAnalysis('data/analysis.json')).rejects.toThrow(/404 Not Found/);
  });

  it('rejects a bundle missing kpis', async () => {
    const { kpis: _drop, ...noKpis } = wellFormed;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse(noKpis)));
    await expect(fetchAnalysis('data/analysis.json')).rejects.toThrow(/malformed/i);
  });

  it('rejects a bundle whose forecasts is not an array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse({ ...wellFormed, forecasts: {} })));
    await expect(fetchAnalysis('data/analysis.json')).rejects.toThrow(/malformed/i);
  });

  // This is the regression the fix adds: a bundle whose recommendations field
  // is missing or not an array must be rejected at load, not left to blow up in
  // the PR table. Fails before the fix (loader ignored recommendations), passes
  // after.
  it('rejects a bundle missing the recommendations array', async () => {
    const { recommendations: _drop, ...noRecs } = wellFormed;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse(noRecs)));
    await expect(fetchAnalysis('data/analysis.json')).rejects.toThrow(/malformed/i);
  });

  it('rejects a bundle whose recommendations is not an array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse({ ...wellFormed, recommendations: 'nope' })));
    await expect(fetchAnalysis('data/analysis.json')).rejects.toThrow(/malformed/i);
  });
});
