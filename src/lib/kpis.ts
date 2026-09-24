/**
 * Inventory KPIs, movement classification, stock alerts and purchase-requisition
 * recommendations for the Claire dashboard.
 *
 * This is the computation layer. It is pure and deterministic so it can be
 * unit-tested (see kpis.verify.test.ts, the QA gate). Every definition below is
 * first-principles from the SAP extract fields; nothing is hidden behind a
 * config flag. The extract has NO PR/PO history, so PR recommendations are
 * DERIVED (stock + forecast demand over lead time vs reorder point / safety
 * stock) and flagged `advisory` — never presented as an authoritative PR feed.
 */

export interface MaterialRow {
  materialCode: string;
  description: string;
  category: string;
  materialType: 'ZSPR' | 'ZSPN';
  plant: string;
  smNmFlag: string;
  shutdownMaterial: boolean;
  currentStock: number;
  avgMonthlyConsumption: number;
  avgMonthlyConsumptionFy25: number;
  safetyStock: number;
  reorderPoint: number;
  leadTimeDays: number;
  consApr: number;
  consMay: number;
  consJun: number;
  unitCostInr: number;
  criticalSpare: boolean;
  shutdownLinked: boolean;
  snapshotDate?: string;
}

/** Forecast horizon totals (units of demand) per material+plant, keyed `${code}|${plant}`. */
export type ForecastMap = Record<string, { h3: number; h6: number; h12: number }>;

export type Movement = 'NM' | 'SM' | 'MOVING';
export type AlertKind = 'UNDERSTOCK' | 'OVERSTOCK' | 'NON_MOVING' | 'SLOW_MOVING';

export interface PrRec {
  materialCode: string;
  plant: string;
  category: string;
  recommend: boolean;
  raiseByDate: string;
  qty: number;
  advisory: true;
  reason: string;
  currentStock: number;
  forecastOverLeadTime: number;
  reorderPoint: number;
  safetyStock: number;
  leadTimeDays: number;
  longLead: boolean;
}

const SNAPSHOT_DATE = '2026-09-01';
/** Overstock only fires when stock is materially above ROP, not a hair over it. */
export const OVERSTOCK_FACTOR = 1.5;

const round2 = (n: number) => Math.round(n * 100) / 100;
const flagOf = (row: MaterialRow) => (row.smNmFlag || '').toUpperCase().trim();

/** Sum of Current Stock × Unit Cost over every material (gross inventory value, INR). */
export function grossInventoryValue(rows: MaterialRow[]): number {
  return rows.reduce((sum, r) => sum + r.currentStock * r.unitCostInr, 0);
}

/** Days of stock on hand at the average daily consumption rate. */
export function daysOnHand(row: MaterialRow): number {
  const perDay = row.avgMonthlyConsumption / 30;
  if (!(perDay > 0)) return Infinity;
  return row.currentStock / perDay;
}

/** Annual turnover = annual consumption / current stock. Zero when stock is zero. */
export function turnover(row: MaterialRow): number {
  if (!(row.currentStock > 0)) return 0;
  return (row.avgMonthlyConsumption * 12) / row.currentStock;
}

/**
 * Movement class. The SM/NM flag from the extract is authoritative; when a row
 * carries neither, fall back to consumption (no movement -> NM, very low -> SM).
 */
export function classifyMovement(row: MaterialRow): Movement {
  const flag = flagOf(row);
  if (flag === 'NM') return 'NM';
  if (flag === 'SM') return 'SM';
  if (row.avgMonthlyConsumption <= 0) return 'NM';
  if (turnover(row) < 1) return 'SM';
  return 'MOVING';
}

export interface NmiSmiSummary {
  nmiCount: number;
  smiCount: number;
  nmiValue: number;
  smiValue: number;
}

/** Counts and tied-up value of non-moving (NMI) and slow-moving (SMI) materials. */
export function nmiSmiSummary(rows: MaterialRow[]): NmiSmiSummary {
  let nmiCount = 0;
  let smiCount = 0;
  let nmiValue = 0;
  let smiValue = 0;
  for (const r of rows) {
    const flag = flagOf(r);
    const value = r.currentStock * r.unitCostInr;
    if (flag === 'NM') {
      nmiCount += 1;
      nmiValue += value;
    } else if (flag === 'SM') {
      smiCount += 1;
      smiValue += value;
    }
  }
  return { nmiCount, smiCount, nmiValue: round2(nmiValue), smiValue: round2(smiValue) };
}

/**
 * Forecast accuracy over the last observable month. The extract exposes
 * avgMonthlyConsumption (current run-rate) and the FY25 average, plus the
 * Apr/May/Jun actuals; accuracy is 1 - MAPE of the FY25 average used as a naive
 * forecast against those actuals, aggregated across materials with movement.
 */
export function forecastAccuracy(rows: MaterialRow[]): number {
  let errSum = 0;
  let n = 0;
  for (const r of rows) {
    const actuals = [r.consApr, r.consMay, r.consJun];
    const predicted = r.avgMonthlyConsumptionFy25;
    for (const a of actuals) {
      if (a > 0) {
        errSum += Math.abs(a - predicted) / a;
        n += 1;
      }
    }
  }
  if (n === 0) return 0;
  const mape = errSum / n;
  return Math.max(0, Math.min(1, 1 - mape));
}

export interface CriticalSparesSummary {
  total: number;
  available: number;
  shortfall: number;
  availabilityPct: number;
}

/**
 * Critical-spares availability: of the Critical Spare = Y materials, how many
 * are at or above their reorder point (i.e. not in a shortfall position).
 */
export function criticalSparesAvailability(rows: MaterialRow[]): CriticalSparesSummary {
  const critical = rows.filter((r) => r.criticalSpare);
  const available = critical.filter((r) => r.currentStock > Math.max(r.safetyStock, r.reorderPoint)).length;
  const total = critical.length;
  const shortfall = total - available;
  return {
    total,
    available,
    shortfall,
    availabilityPct: total === 0 ? 100 : round2((available / total) * 100),
  };
}

/** The alerts a single row raises. Order is stable for display. */
export function alertsFor(row: MaterialRow): AlertKind[] {
  const alerts: AlertKind[] = [];
  const trigger = Math.max(row.safetyStock, row.reorderPoint);
  if (row.currentStock <= trigger) alerts.push('UNDERSTOCK');
  if (row.reorderPoint > 0 && row.currentStock > row.reorderPoint * OVERSTOCK_FACTOR) {
    alerts.push('OVERSTOCK');
  }
  const movement = classifyMovement(row);
  if (movement === 'NM') alerts.push('NON_MOVING');
  else if (movement === 'SM') alerts.push('SLOW_MOVING');
  return alerts;
}

function forecastOverLeadTime(
  row: MaterialRow,
  forecast: ForecastMap[string] | undefined,
): number {
  const leadMonths = row.leadTimeDays / 30;
  if (forecast) {
    // Pro-rate the forecast horizon that best covers the lead time.
    if (leadMonths <= 3) return (forecast.h3 / 3) * leadMonths;
    if (leadMonths <= 6) return (forecast.h6 / 6) * leadMonths;
    return (forecast.h12 / 12) * leadMonths;
  }
  return row.avgMonthlyConsumption * leadMonths;
}

/**
 * Purchase-requisition recommendations. For each material we project stock over
 * the lead time against the forecast demand: if projected stock would fall to
 * or below the reorder point / safety stock, recommend raising a PR now, sized
 * to bring cover back above the reorder point plus the safety buffer. The
 * raise-by date is need-by minus the lead time. ADVISORY — the extract has no
 * PR/PO history, so these are derived, not read from an SAP PR feed.
 */
export function prRecommendations(rows: MaterialRow[], forecastByMaterialPlant: ForecastMap): PrRec[] {
  const recs: PrRec[] = [];
  for (const row of rows) {
    const key = `${row.materialCode}|${row.plant}`;
    const overLead = forecastOverLeadTime(row, forecastByMaterialPlant[key]);
    const projected = row.currentStock - overLead;
    const trigger = Math.max(row.reorderPoint, row.safetyStock);
    const recommend = projected <= trigger;
    const longLead = row.leadTimeDays >= 90;

    // Size the PR to cover lead-time demand and restore ROP + safety buffer.
    const targetLevel = row.reorderPoint + row.safetyStock;
    const qty = recommend ? Math.max(0, Math.ceil(overLead + targetLevel - row.currentStock)) : 0;

    // need-by = when projected stock hits the trigger; raise-by = need-by - lead time.
    // When a PR is recommended the trigger is already breached at the snapshot,
    // so need-by is the snapshot itself (raise now / overdue). Only a non-
    // recommended row with zero consumption gets the "never depletes" horizon —
    // otherwise a zero-consumption spare would project a need-by 10 years out.
    const perDay = row.avgMonthlyConsumption / 30;
    const daysToTrigger = recommend
      ? 0
      : perDay > 0
        ? Math.max(0, (row.currentStock - trigger) / perDay)
        : 3650;
    const needBy = new Date(SNAPSHOT_DATE);
    needBy.setDate(needBy.getDate() + Math.round(daysToTrigger));
    const raiseBy = new Date(needBy);
    raiseBy.setDate(raiseBy.getDate() - row.leadTimeDays);
    const raiseByDate = (recommend ? raiseBy : needBy).toISOString().slice(0, 10);

    const reason = recommend
      ? `Projected stock ${Math.round(projected)} ≤ trigger ${trigger} after ${overLead.toFixed(
          0,
        )} forecast demand over ${row.leadTimeDays}-day lead time` +
        (longLead ? ` (long-lead ${row.materialType} spare — raise early)` : '')
      : `Cover holds: projected ${Math.round(projected)} > trigger ${trigger} over ${row.leadTimeDays}-day lead time`;

    recs.push({
      materialCode: row.materialCode,
      plant: row.plant,
      category: row.category,
      recommend,
      raiseByDate,
      qty,
      advisory: true,
      reason,
      currentStock: row.currentStock,
      forecastOverLeadTime: round2(overLead),
      reorderPoint: row.reorderPoint,
      safetyStock: row.safetyStock,
      leadTimeDays: row.leadTimeDays,
      longLead,
    });
  }
  return recs;
}
