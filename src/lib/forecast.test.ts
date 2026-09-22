import { describe, it, expect } from 'vitest';
import { forecastSeries, forecastAll, type MonthlyRow } from './forecast';

function series(qtys: number[]): MonthlyRow[] {
  const months = [
    '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03',
    '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09',
  ];
  return qtys.map((q, i) => ({
    month: months[i],
    materialCode: 'MAT-X',
    plant: 'Plant-01',
    consumptionQty: q,
    consumptionValueInr: q * 100,
  }));
}

describe('forecastSeries', () => {
  it('projects 12 future months labelled with the seasonal-naive method', () => {
    const f = forecastSeries('MAT-X', 'Plant-01', series(Array(12).fill(10)));
    expect(f.method).toBe('seasonal-naive-baseline');
    expect(f.future).toHaveLength(12);
    expect(f.future[0].month).toBe('2026-10');
    expect(f.future[11].month).toBe('2027-09');
  });

  it('a flat series forecasts a flat level (h3 ≈ 3× the level)', () => {
    const f = forecastSeries('MAT-X', 'Plant-01', series(Array(12).fill(10)));
    expect(f.h3).toBeCloseTo(30, 1);
    expect(f.h6).toBeCloseTo(60, 1);
    expect(f.h12).toBeCloseTo(120, 1);
  });

  it('h3 ≤ h6 ≤ h12 (cumulative horizons)', () => {
    const f = forecastSeries('MAT-X', 'Plant-01', series([2, 4, 6, 8, 10, 12, 8, 6, 4, 2, 4, 6]));
    expect(f.h3).toBeLessThanOrEqual(f.h6);
    expect(f.h6).toBeLessThanOrEqual(f.h12);
  });

  it('a non-moving (all-zero) series forecasts zero demand', () => {
    const f = forecastSeries('MAT-X', 'Plant-01', series(Array(12).fill(0)));
    expect(f.h3).toBe(0);
    expect(f.h6).toBe(0);
    expect(f.h12).toBe(0);
  });

  it('carries a seasonal bump forward (a high recent month lifts the next same month)', () => {
    // Month 02 (Feb) is the peak both years' worth of one year of history.
    const f = forecastSeries('MAT-X', 'Plant-01', series([5, 5, 5, 5, 20, 5, 5, 5, 5, 5, 5, 5]));
    const feb = f.future.find((x) => x.month.endsWith('-02'));
    const jul = f.future.find((x) => x.month.endsWith('-07'));
    expect(feb!.qty).toBeGreaterThan(jul!.qty);
  });

  it('never forecasts negative demand', () => {
    const f = forecastSeries('MAT-X', 'Plant-01', series([0, 0, 1, 0, 0, 3, 0, 0, 0, 0, 0, 0]));
    for (const p of f.future) expect(p.qty).toBeGreaterThanOrEqual(0);
  });
});

describe('forecastAll', () => {
  it('produces one forecast per distinct material+plant', () => {
    const rows: MonthlyRow[] = [
      ...series(Array(12).fill(4)),
      ...series(Array(12).fill(7)).map((r) => ({ ...r, materialCode: 'MAT-Y', plant: 'Plant-02' })),
    ];
    const all = forecastAll(rows);
    expect(all).toHaveLength(2);
    expect(new Set(all.map((f) => `${f.materialCode}|${f.plant}`)).size).toBe(2);
  });
});
