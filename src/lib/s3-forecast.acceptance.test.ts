/**
 * S-3 (INV-3) — Forecast via MCP: acceptance-criteria test suite.
 *
 * Derived from the S-3 acceptance criteria BEFORE any implementation exists,
 * so it is a specification of "done", not a mirror of the code:
 *
 *   AC1  Forecasts are keyed by material + plant + horizon, for 3 / 6 / 12 months.
 *   AC2  Each forecast carries the MCP model name (not a hand-rolled baseline label).
 *   AC3  Each forecast carries a back-test accuracy figure.
 *   AC4  The forecasts are baked into public/data/analysis.json.
 *
 * It reads the shipped analysis bundle and asserts the contract. It is meant to
 * live at src/lib/s3-forecast.acceptance.test.ts on feature/s-3-inv-3-forecast-via-mcp
 * once that branch carries the MCP forecast, and to run in CI via `vitest run`.
 *
 * NOTE ON PROVENANCE — this is why AC2/AC3 are strict. The seasonal-naive
 * baseline on the S-7 branch labels forecasts `method: "seasonal-naive-baseline"`
 * and sets meta.forecastEngine to "MCP engine not reachable this run". That is a
 * transparent fallback, NOT an MCP forecast, and it must FAIL AC2 — the criterion
 * is an MCP model name, not any method string. Do not relax these to make the
 * baseline pass; that would ship a mislabelled forecast.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Method/engine strings that indicate a hand-rolled fallback rather than the MCP.
const NON_MCP_MARKERS = [
  'seasonal-naive-baseline',
  'naive',
  'baseline',
  'not reachable',
  'hand-rolled',
  'fallback',
];

interface HorizonForecast {
  materialCode: string;
  plant: string;
  // AC1 horizon totals (the S-7 Forecast contract uses h3/h6/h12):
  h3?: number;
  h6?: number;
  h12?: number;
  // AC2/AC3 fields the MCP forecast must add:
  mcpModel?: string;
  model?: string;
  method?: string;
  backtestAccuracyPct?: number;
  accuracyPct?: number;
}

interface AnalysisBundle {
  generatedAt: string | null;
  meta?: { forecastEngine?: string; forecastModel?: string; mcpModel?: string };
  forecasts: HorizonForecast[];
}

function loadBundle(): AnalysisBundle {
  const p = resolve(__dirname, '../../public/data/analysis.json');
  return JSON.parse(readFileSync(p, 'utf-8')) as AnalysisBundle;
}

// A model name is an MCP model name if it is a non-empty string that does not
// contain any of the fallback markers.
function looksLikeMcpModel(s: unknown): boolean {
  if (typeof s !== 'string' || s.trim() === '') return false;
  const low = s.toLowerCase();
  return !NON_MCP_MARKERS.some((m) => low.includes(m));
}

describe('S-3 INV-3 — Forecast via MCP acceptance criteria', () => {
  let bundle: AnalysisBundle;

  beforeAll(() => {
    bundle = loadBundle();
  });

  it('AC4: forecasts are baked into analysis.json (non-empty, generatedAt set)', () => {
    expect(bundle.generatedAt).not.toBeNull();
    expect(Array.isArray(bundle.forecasts)).toBe(true);
    expect(bundle.forecasts.length).toBeGreaterThan(0);
  });

  it('AC1: every forecast is keyed by material + plant', () => {
    // Guard against a vacuous pass over an empty array: an unimplemented
    // forecast (forecasts: []) must FAIL every per-row criterion, not pass it.
    expect(bundle.forecasts.length, 'no forecasts to check — forecast not produced').toBeGreaterThan(0);
    for (const f of bundle.forecasts) {
      expect(typeof f.materialCode, `materialCode on ${JSON.stringify(f).slice(0, 60)}`).toBe('string');
      expect(f.materialCode.length).toBeGreaterThan(0);
      expect(typeof f.plant).toBe('string');
      expect(f.plant.length).toBeGreaterThan(0);
    }
  });

  it('AC1: every material+plant carries all three horizons (3 / 6 / 12 months)', () => {
    expect(bundle.forecasts.length, 'no forecasts to check — forecast not produced').toBeGreaterThan(0);
    for (const f of bundle.forecasts) {
      const key = `${f.materialCode}@${f.plant}`;
      for (const h of ['h3', 'h6', 'h12'] as const) {
        const v = f[h];
        expect(typeof v, `${h} on ${key}`).toBe('number');
        expect(Number.isFinite(v as number), `${h} finite on ${key}`).toBe(true);
        expect(v as number, `${h} non-negative on ${key}`).toBeGreaterThanOrEqual(0);
      }
      // Horizons must be non-decreasing: 12mo total >= 6mo total >= 3mo total.
      expect((f.h6 as number) >= (f.h3 as number), `h6>=h3 on ${key}`).toBe(true);
      expect((f.h12 as number) >= (f.h6 as number), `h12>=h6 on ${key}`).toBe(true);
    }
  });

  it('AC1: material+plant keys are unique (no duplicate series)', () => {
    expect(bundle.forecasts.length, 'no forecasts to check — forecast not produced').toBeGreaterThan(0);
    const keys = bundle.forecasts.map((f) => `${f.materialCode}|${f.plant}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('AC2: every forecast carries an MCP model name (not a fallback label)', () => {
    expect(bundle.forecasts.length, 'no forecasts to check — forecast not produced').toBeGreaterThan(0);
    for (const f of bundle.forecasts) {
      const key = `${f.materialCode}@${f.plant}`;
      const model = f.mcpModel ?? f.model ?? f.method ?? bundle.meta?.mcpModel ?? bundle.meta?.forecastModel;
      expect(looksLikeMcpModel(model), `MCP model name on ${key} — got ${JSON.stringify(model)}`).toBe(true);
    }
  });

  it('AC2: the bundle engine is not the "MCP not reachable" fallback', () => {
    const engine = (bundle.meta?.forecastEngine ?? '').toLowerCase();
    expect(NON_MCP_MARKERS.some((m) => engine.includes(m)), `forecastEngine=${bundle.meta?.forecastEngine}`).toBe(false);
  });

  it('AC3: every forecast carries a back-test accuracy figure in [0,100]', () => {
    expect(bundle.forecasts.length, 'no forecasts to check — forecast not produced').toBeGreaterThan(0);
    for (const f of bundle.forecasts) {
      const key = `${f.materialCode}@${f.plant}`;
      const acc = f.backtestAccuracyPct ?? f.accuracyPct;
      expect(typeof acc, `back-test accuracy on ${key} — got ${JSON.stringify(acc)}`).toBe('number');
      expect(acc as number, `accuracy >= 0 on ${key}`).toBeGreaterThanOrEqual(0);
      expect(acc as number, `accuracy <= 100 on ${key}`).toBeLessThanOrEqual(100);
    }
  });
});
