/**
 * The runtime analysis bundle the dashboard consumes.
 *
 * These types describe public/data/analysis.json, produced by
 * scripts/build_analysis.mts over the real computation layer (src/lib/kpis.ts +
 * src/lib/forecast.ts). No figure is typed by hand into the UI — the app reads
 * this bundle. Keep these shapes in step with build_analysis.mts.
 */

export interface Kpis {
  grossInventoryValue: number;
  daysOnHand: number;
  turnover: number;
  nmiCount: number;
  smiCount: number;
  nmiValue: number;
  smiValue: number;
  forecastAccuracyPct: number;
  criticalSparesTotal: number;
  criticalSparesAvailable: number;
  criticalSparesAvailabilityPct: number;
}

export interface ForecastPoint {
  month: string;
  qty: number;
}

export interface Forecast {
  materialCode: string;
  plant: string;
  method: string;
  history: ForecastPoint[];
  future: ForecastPoint[];
  /** Total forecast demand over the next 3 / 6 / 12 months. */
  h3: number;
  h6: number;
  h12: number;
}

export type AlertKind = 'UNDERSTOCK' | 'OVERSTOCK' | 'NON_MOVING' | 'SLOW_MOVING';

export interface Alert {
  kind: AlertKind;
  materialCode: string;
  description: string;
  category: string;
  plant: string;
  currentStock: number;
  reorderPoint: number;
  safetyStock: number;
  lastConsumption: number;
  materialType: 'ZSPR' | 'ZSPN';
  criticalSpare: boolean;
}

export interface Recommendation {
  materialCode: string;
  plant: string;
  category: string;
  recommend: boolean;
  raiseByDate: string;
  qty: number;
  advisory: boolean;
  reason: string;
  currentStock: number;
  forecastOverLeadTime: number;
  reorderPoint: number;
  safetyStock: number;
  leadTimeDays: number;
  longLead: boolean;
}

export interface AnalysisMeta {
  snapshotDate: string;
  materialCount: number;
  forecastMethod: string;
  forecastEngine: string;
  dataGaps: string[];
}

export interface AnalysisBundle {
  generatedAt: string;
  meta: AnalysisMeta;
  kpis: Kpis;
  forecasts: Forecast[];
  alerts: Alert[];
  recommendations: Recommendation[];
}

/** Where the app reads the bundle from. Overridable via VITE_DATA_URL. */
export const DATA_URL: string =
  (import.meta.env?.VITE_DATA_URL as string | undefined) ?? 'data/analysis.json';

/**
 * Fetch and minimally validate the analysis bundle. Throws a readable error the
 * UI can show inline rather than letting a partial parse render as blanks.
 */
export async function fetchAnalysis(url: string = DATA_URL, signal?: AbortSignal): Promise<AnalysisBundle> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Couldn't load analysis (${res.status} ${res.statusText})`);
  }
  const data = (await res.json()) as Partial<AnalysisBundle>;
  if (
    !data ||
    !data.kpis ||
    !Array.isArray(data.forecasts) ||
    !Array.isArray(data.alerts) ||
    !Array.isArray(data.recommendations)
  ) {
    throw new Error('Analysis bundle is malformed — expected kpis, forecasts, alerts and recommendations.');
  }
  return data as AnalysisBundle;
}
