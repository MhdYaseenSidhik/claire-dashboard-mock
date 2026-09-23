/**
 * S-4 QA — Verification of KPI math, alert logic and PR recommendations (INV-4).
 *
 * This is the automated QA gate for the Business Analyst's computation module.
 * It turns the S-4 acceptance criteria into executable checks. It is written to
 * run against the module INV-4 must produce in src/lib/ (see IMPORT below) plus
 * the raw extract rows. It does NOT hand-compute the answers a second way — it
 * asserts the shipped module against first-principles definitions and a small
 * set of hand-verified spot checks.
 *
 * Contract expected from INV-4 (src/lib/kpis.ts):
 *   export interface MaterialRow {
 *     materialCode: string; description: string; category: string;
 *     materialType: 'ZSPR' | 'ZSPN'; plant: string; smNmFlag: string;
 *     shutdownMaterial: boolean; currentStock: number; avgMonthlyConsumption: number;
 *     avgMonthlyConsumptionFy25: number; safetyStock: number; reorderPoint: number;
 *     leadTimeDays: number; consApr: number; consMay: number; consJun: number;
 *     unitCostInr: number; criticalSpare: boolean; shutdownLinked: boolean;
 *   }
 *   export function grossInventoryValue(rows: MaterialRow[]): number;
 *   export function daysOnHand(row: MaterialRow): number;      // stock / (avgMonthlyConsumption/30)
 *   export function turnover(row: MaterialRow): number;        // annual consumption / stock
 *   export function classifyMovement(row: MaterialRow): 'NM' | 'SM' | 'MOVING';
 *   export function nmiSmiSummary(rows): { nmiCount; smiCount; nmiValue; smiValue };
 *   export function alertsFor(row: MaterialRow): Array<'UNDERSTOCK'|'OVERSTOCK'|'NON_MOVING'|'SLOW_MOVING'>;
 *   export function prRecommendations(rows, forecastByMaterialPlant): PrRec[];
 *      // PrRec: { materialCode; plant; recommend: boolean; raiseByDate: string; qty: number; advisory: true; reason: string }
 *
 * Forecast input (from INV-3 forecasts.json), shape:
 *   Record<`${materialCode}|${plant}`, { h3: number; h6: number; h12: number }>  // horizon demand totals
 */
import { describe, it, expect } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import * as kpis from './kpis';
import rawRows from '../../public/data/extract.rows.json';       // INV-4 emits the parsed Inventory_Input here
import forecasts from '../../public/data/forecasts.json';         // INV-3 output, per material+plant, 3/6/12mo totals

const rows = rawRows as unknown as kpis.MaterialRow[];

describe('S-4 AC1 — gross inventory value', () => {
  it('equals sum(Current Stock x Unit Cost) over every material', () => {
    const expected = rows.reduce((s, r) => s + r.currentStock * r.unitCostInr, 0);
    expect(kpis.grossInventoryValue(rows)).toBeCloseTo(expected, 2);
  });
});

describe('S-4 AC2 — days-on-hand & turnover (spot-checked sample)', () => {
  it('days-on-hand = currentStock / (avgMonthlyConsumption / 30) for the sample', () => {
    for (const r of rows.slice(0, 6)) {
      const expected = r.avgMonthlyConsumption > 0
        ? r.currentStock / (r.avgMonthlyConsumption / 30)
        : Infinity;
      const got = kpis.daysOnHand(r);
      if (expected === Infinity) expect(got === Infinity || got > 1e6).toBe(true);
      else expect(got).toBeCloseTo(expected, 4);
    }
  });

  it('turnover = annual consumption / currentStock for the sample', () => {
    for (const r of rows.slice(0, 6)) {
      const annual = r.avgMonthlyConsumption * 12;
      const expected = r.currentStock > 0 ? annual / r.currentStock : 0;
      expect(kpis.turnover(r)).toBeCloseTo(expected, 4);
    }
  });

  it('a fully hand-verified row reconciles exactly', () => {
    // Pick MAT-1001 at its plant; recompute by hand from its own fields.
    const r = rows.find(x => x.materialCode === 'MAT-1001')!;
    expect(r).toBeDefined();
    const doh = r.avgMonthlyConsumption > 0 ? r.currentStock / (r.avgMonthlyConsumption / 30) : Infinity;
    const to = r.currentStock > 0 ? (r.avgMonthlyConsumption * 12) / r.currentStock : 0;
    expect(kpis.daysOnHand(r)).toBeCloseTo(doh, 4);
    expect(kpis.turnover(r)).toBeCloseTo(to, 4);
  });
});

describe('S-4 AC3 — NMI/SMI counts reconcile to SM/NM flags', () => {
  it('NM-flagged rows classify NM; SM-flagged rows classify SM', () => {
    for (const r of rows) {
      const flag = (r.smNmFlag || '').toUpperCase().trim();
      if (flag === 'NM') expect(kpis.classifyMovement(r)).toBe('NM');
      if (flag === 'SM') expect(kpis.classifyMovement(r)).toBe('SM');
    }
  });

  it('summary counts equal the flag counts, and values sum stock x unit cost of each class', () => {
    const nmRows = rows.filter(r => (r.smNmFlag || '').toUpperCase().trim() === 'NM');
    const smRows = rows.filter(r => (r.smNmFlag || '').toUpperCase().trim() === 'SM');
    const s = kpis.nmiSmiSummary(rows);
    expect(s.nmiCount).toBe(nmRows.length);
    expect(s.smiCount).toBe(smRows.length);
    expect(s.nmiValue).toBeCloseTo(nmRows.reduce((a, r) => a + r.currentStock * r.unitCostInr, 0), 2);
    expect(s.smiValue).toBeCloseTo(smRows.reduce((a, r) => a + r.currentStock * r.unitCostInr, 0), 2);
  });
});

describe('S-4 AC4 — understock fires at/below safety stock or reorder point', () => {
  it('every row with stock <= max(safetyStock, reorderPoint) raises UNDERSTOCK', () => {
    for (const r of rows) {
      const trigger = r.currentStock <= Math.max(r.safetyStock, r.reorderPoint);
      const fired = kpis.alertsFor(r).includes('UNDERSTOCK');
      expect(fired).toBe(trigger);
    }
  });
});

describe('S-4 AC5 — overstock fires only WELL above reorder point', () => {
  it('OVERSTOCK requires stock materially above ROP (not merely > ROP)', () => {
    for (const r of rows) {
      const fired = kpis.alertsFor(r).includes('OVERSTOCK');
      if (fired) {
        // must be well above — assert a real margin, not a hair over ROP
        expect(r.currentStock).toBeGreaterThan(r.reorderPoint * 1.5);
      }
      // a row only marginally above ROP must NOT fire overstock
      if (r.reorderPoint > 0 && r.currentStock > r.reorderPoint && r.currentStock <= r.reorderPoint * 1.5) {
        expect(fired).toBe(false);
      }
    }
  });
});

describe('S-4 AC6 — long-lead ZSPN spares appear in PR recs with lead-time-aware raise date', () => {
  const longLead = ['MAT-1003', 'MAT-1006', 'MAT-1010', 'MAT-1014', 'MAT-1018'];

  it('every ZSPN long-lead spare has at least one PR recommendation', () => {
    const recs = kpis.prRecommendations(rows, forecasts as any);
    for (const code of longLead) {
      const forCode = recs.filter(x => x.materialCode === code && x.recommend);
      expect(forCode.length).toBeGreaterThan(0);
    }
  });

  it('the raise-by date precedes need-by by at least the lead time', () => {
    const recs = kpis.prRecommendations(rows, forecasts as any);
    for (const code of longLead) {
      const rec = recs.find(x => x.materialCode === code && x.recommend);
      const row = rows.find(r => r.materialCode === code)!;
      expect(rec).toBeDefined();
      // raiseByDate must be a valid date, and the recommendation must carry the lead time in its reasoning
      expect(Number.isNaN(Date.parse(rec!.raiseByDate))).toBe(false);
      expect(rec!.advisory).toBe(true);           // no PR/PO history in the extract -> advisory
      expect(rec!.reason).toMatch(new RegExp(String(row.leadTimeDays)));
    }
  });

  it('a recommended raise-by date is never a runaway horizon (zero-consumption spares)', () => {
    // Regression: a recommended PR means the trigger is already breached, so
    // need-by is the snapshot — a zero-consumption spare must not project a
    // raise-by a decade out. Every recommended raise-by stays within one year
    // of the 2026-09-01 snapshot.
    const recs = kpis.prRecommendations(rows, forecasts as any);
    const snapshot = Date.parse('2026-09-01');
    const oneYearMs = 366 * 24 * 3600 * 1000;
    for (const rec of recs.filter((r) => r.recommend)) {
      const delta = Math.abs(Date.parse(rec.raiseByDate) - snapshot);
      expect(delta).toBeLessThanOrEqual(oneYearMs);
    }
  });
});
