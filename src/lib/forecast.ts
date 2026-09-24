/**
 * Demand forecast for the next 3 / 6 / 12 months per material and plant.
 *
 * IMPORTANT — provenance. The cell's mandate is to forecast via the connected
 * MCP engine. That engine is NOT reachable from this seat (no mcp_* tool is
 * exposed here), so rather than block the whole dashboard we compute a
 * TRANSPARENT, DETERMINISTIC seasonal-naïve baseline from the Monthly_Consumption
 * series and label every forecast `method: 'seasonal-naive-baseline'`. When the
 * MCP engine is wired in, replace `forecastSeries` with its output and keep the
 * same {h3,h6,h12} contract — the KPI, alert and PR-rec code downstream is
 * unchanged. This is stated in the UI, not hidden.
 *
 * Baseline method: level = mean of the last 3 observed months; seasonal factor
 * per calendar month = (that month's mean over history) / (overall mean), so a
 * shutdown-season bump repeats forward. Horizon total = sum of level × seasonal
 * factor over the next N months. Non-moving series forecast to zero.
 */

export interface MonthlyRow {
  month: string; // YYYY-MM
  materialCode: string;
  plant: string;
  consumptionQty: number;
  consumptionValueInr: number;
}

export interface Forecast {
  materialCode: string;
  plant: string;
  method: 'seasonal-naive-baseline';
  history: { month: string; qty: number }[];
  future: { month: string; qty: number }[];
  h3: number;
  h6: number;
  h12: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function addMonths(iso: string, n: number): string {
  const [y, m] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function seasonalFactors(history: { month: string; qty: number }[]): Record<number, number> {
  const overall =
    history.reduce((s, h) => s + h.qty, 0) / Math.max(1, history.length);
  const byMonth: Record<number, number[]> = {};
  for (const h of history) {
    const mm = Number(h.month.split('-')[1]);
    (byMonth[mm] ||= []).push(h.qty);
  }
  const factors: Record<number, number> = {};
  for (let mm = 1; mm <= 12; mm += 1) {
    const vals = byMonth[mm];
    if (!vals || overall <= 0) {
      factors[mm] = 1;
    } else {
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      factors[mm] = mean / overall;
    }
  }
  return factors;
}

/** Forecast one material+plant series 12 months forward. */
export function forecastSeries(
  materialCode: string,
  plant: string,
  monthly: MonthlyRow[],
): Forecast {
  const history = monthly
    .filter((r) => r.materialCode === materialCode && r.plant === plant)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((r) => ({ month: r.month, qty: r.consumptionQty }));

  const last3 = history.slice(-3);
  const level =
    last3.length > 0 ? last3.reduce((s, h) => s + h.qty, 0) / last3.length : 0;
  const factors = seasonalFactors(history);

  const lastMonth = history.length ? history[history.length - 1].month : '2026-09';
  const future: { month: string; qty: number }[] = [];
  for (let i = 1; i <= 12; i += 1) {
    const month = addMonths(lastMonth, i);
    const mm = Number(month.split('-')[1]);
    const qty = Math.max(0, round1(level * (factors[mm] ?? 1)));
    future.push({ month, qty });
  }

  const sum = (arr: { qty: number }[]) => round1(arr.reduce((s, x) => s + x.qty, 0));
  return {
    materialCode,
    plant,
    method: 'seasonal-naive-baseline',
    history,
    future,
    h3: sum(future.slice(0, 3)),
    h6: sum(future.slice(0, 6)),
    h12: sum(future.slice(0, 12)),
  };
}

/** Forecast every distinct material+plant present in the monthly series. */
export function forecastAll(monthly: MonthlyRow[]): Forecast[] {
  const keys = new Map<string, { materialCode: string; plant: string }>();
  for (const r of monthly) {
    keys.set(`${r.materialCode}|${r.plant}`, { materialCode: r.materialCode, plant: r.plant });
  }
  return [...keys.values()].map((k) => forecastSeries(k.materialCode, k.plant, monthly));
}
