import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import type { AnalysisBundle } from './lib/analysis';
import { formatInr } from './lib/format';

/**
 * S-6 / INV-6 acceptance suite — one describe block per acceptance criterion,
 * asserted against the dashboard's PUBLIC behaviour (rendered output and the
 * controls a user drives), not its internals. Derived from the INV-6 criteria
 * BEFORE reading the implementation:
 *
 *   AC1  KPI tiles render the values from the analysis bundle.
 *   AC2  The forecast panel shows the 3 / 6 / 12-month horizon series, and the
 *        horizon toggle changes what is shown.
 *   AC3  The plant and material filters change what the forecast panel shows.
 *   AC4  The alert panels list the correct understock / overstock /
 *        non-moving / slow-moving materials in their respective columns.
 *   AC5  The PR table shows lead-time-aware raise-by dates, flags long-lead
 *        spares, and its scope toggle switches between "to raise" and the full
 *        assessment.
 *
 * fetchAnalysis is mocked (as in App.test.tsx) so the app renders against a
 * known bundle with no network. The bundle below spans two plants, several
 * categories and every alert kind, and holds distinct 3/6/12 horizon totals and
 * distinct future-series lengths, so a toggle or filter that does nothing would
 * be caught rather than passing by coincidence.
 */
const bundle: AnalysisBundle = {
  generatedAt: '2026-09-22',
  meta: {
    snapshotDate: '2026-09-01',
    materialCount: 4,
    forecastMethod: 'seasonal-naive-baseline',
    forecastEngine: 'Baseline over Monthly_Consumption.',
    dataGaps: ['No PR/PO history in the extract — PR recommendations are advisory.'],
  },
  kpis: {
    grossInventoryValue: 23_353_400,
    daysOnHand: 210,
    turnover: 1.48,
    nmiCount: 3,
    smiCount: 2,
    nmiValue: 79_50_000,
    smiValue: 30_00_000,
    forecastAccuracyPct: 87.8,
    criticalSparesTotal: 9,
    criticalSparesAvailable: 3,
    criticalSparesAvailabilityPct: 33.33,
  },
  forecasts: [
    {
      // Plant-01 material with a 12-entry future series so all three horizons
      // truncate to a different length, and distinct h3/h6/h12 totals.
      materialCode: 'MAT-1001',
      plant: 'Plant-01',
      method: 'seasonal-naive-baseline',
      history: [
        { month: '2026-07', qty: 15 },
        { month: '2026-08', qty: 17 },
        { month: '2026-09', qty: 18 },
      ],
      future: [
        { month: '2026-10', qty: 14.6 },
        { month: '2026-11', qty: 15.5 },
        { month: '2026-12', qty: 16.4 },
        { month: '2027-01', qty: 18.3 },
        { month: '2027-02', qty: 20.1 },
        { month: '2027-03', qty: 20.1 },
        { month: '2027-04', qty: 17.4 },
        { month: '2027-05', qty: 16.4 },
        { month: '2027-06', qty: 15.5 },
        { month: '2027-07', qty: 13.7 },
        { month: '2027-08', qty: 15.5 },
        { month: '2027-09', qty: 16.4 },
      ],
      h3: 46.5,
      h6: 105,
      h12: 199.9,
    },
    {
      // A second plant, so the plant filter has something to narrow to.
      materialCode: 'MAT-1009',
      plant: 'Plant-03',
      method: 'seasonal-naive-baseline',
      history: [
        { month: '2026-07', qty: 120 },
        { month: '2026-08', qty: 130 },
        { month: '2026-09', qty: 125 },
      ],
      future: [
        { month: '2026-10', qty: 118 },
        { month: '2026-11', qty: 122 },
        { month: '2026-12', qty: 112 },
      ],
      h3: 157,
      h6: 352.6,
      h12: 672,
    },
  ],
  alerts: [
    {
      kind: 'UNDERSTOCK',
      materialCode: 'MAT-1003',
      description: 'Pump seal kit',
      category: 'Mechanical',
      plant: 'Plant-01',
      currentStock: 2,
      reorderPoint: 8,
      safetyStock: 4,
      lastConsumption: 1,
      materialType: 'ZSPN',
      criticalSpare: true,
    },
    {
      kind: 'OVERSTOCK',
      materialCode: 'MAT-1012',
      description: 'Cable gland',
      category: 'Electrical',
      plant: 'Plant-03',
      currentStock: 900,
      reorderPoint: 120,
      safetyStock: 60,
      lastConsumption: 40,
      materialType: 'ZSPR',
      criticalSpare: false,
    },
    {
      kind: 'NON_MOVING',
      materialCode: 'MAT-1006',
      description: 'Turbine spare',
      category: 'Mechanical',
      plant: 'Plant-02',
      currentStock: 5,
      reorderPoint: 3,
      safetyStock: 2,
      lastConsumption: 0,
      materialType: 'ZSPN',
      criticalSpare: true,
    },
    {
      kind: 'SLOW_MOVING',
      materialCode: 'MAT-1015',
      description: 'Sensor module',
      category: 'Instrumentation',
      plant: 'Plant-03',
      currentStock: 30,
      reorderPoint: 10,
      safetyStock: 5,
      lastConsumption: 1,
      materialType: 'ZSPR',
      criticalSpare: false,
    },
  ],
  recommendations: [
    {
      // Recommended, long-lead (180 days) ZSPN spare -> lead-time-aware raise date.
      materialCode: 'MAT-1003',
      plant: 'Plant-01',
      category: 'Mechanical',
      recommend: true,
      raiseByDate: '2026-10-05',
      qty: 12,
      advisory: true,
      reason: 'Projected stock below trigger over 180-day lead time (long-lead ZSPN spare — raise early)',
      currentStock: 2,
      forecastOverLeadTime: 9,
      reorderPoint: 8,
      safetyStock: 4,
      leadTimeDays: 180,
      longLead: true,
    },
    {
      // NOT recommended — appears only when scope = "All".
      materialCode: 'MAT-1005',
      plant: 'Plant-02',
      category: 'Consumable',
      recommend: false,
      raiseByDate: '',
      qty: 0,
      advisory: true,
      reason: 'Cover holds over lead time.',
      currentStock: 200,
      forecastOverLeadTime: 30,
      reorderPoint: 50,
      safetyStock: 25,
      leadTimeDays: 30,
      longLead: false,
    },
  ],
};

vi.mock('./lib/analysis', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/analysis')>();
  return { ...actual, fetchAnalysis: vi.fn().mockResolvedValue(bundle) };
});

const { default: App } = await import('./App');

/** Render the app and wait until the bundle has loaded (skeleton -> ready). */
async function renderReady() {
  render(<App />);
  await waitFor(() => expect(screen.getByText('Gross inventory value')).toBeInTheDocument());
}

/**
 * Locate a titled Panel (ui/Card `Panel`) by its visible <h2> title and return
 * its enclosing card element, so queries can be scoped to that panel. The panels
 * are not ARIA landmarks, so we anchor on the heading text the panel renders.
 */
function panelByTitle(title: string | RegExp): HTMLElement {
  // There can be more than one heading with the same name (App renders an
  // sr-only section heading, and the Panel renders its own visible <h2>). The
  // panel is the heading that sits inside a Card, so pick that one.
  const headings = screen.getAllByRole('heading', { name: title });
  for (const h of headings) {
    const card = h.closest('div.rounded-card');
    if (card instanceof HTMLElement) return card;
  }
  throw new Error(`Panel card not found for title ${String(title)}`);
}

/** The demand-forecast panel, scoped for horizon/filter queries. */
function forecastRegion() {
  return panelByTitle('Demand forecast');
}

describe('S-6 AC1 — KPI tiles render the values from the analysis bundle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows every KPI tile labelled and populated from the bundle', async () => {
    await renderReady();

    // Gross inventory value 23,353,400 -> ₹2.34 Cr (matches the reconciled extract figure).
    expect(screen.getByText('Gross inventory value')).toBeInTheDocument();
    expect(screen.getByText(formatInr(bundle.kpis.grossInventoryValue))).toBeInTheDocument();
    expect(screen.getByText('₹2.34 Cr')).toBeInTheDocument();

    // Days on hand.
    expect(screen.getByText('Days on hand')).toBeInTheDocument();
    expect(screen.getByText('210')).toBeInTheDocument();

    // Turnover 1.48 -> "1.48×".
    expect(screen.getByText('Turnover')).toBeInTheDocument();
    expect(screen.getByText('1.48×')).toBeInTheDocument();

    // NMI / SMI counts "3 / 2".
    expect(screen.getByText('NMI / SMI')).toBeInTheDocument();
    expect(screen.getByText('3 / 2')).toBeInTheDocument();

    // Forecast accuracy 87.8%.
    expect(screen.getByText('Forecast accuracy')).toBeInTheDocument();
    expect(screen.getByText('87.8%')).toBeInTheDocument();

    // Critical-spares availability 33.33 -> "33.3%", subtext "3 of 9 above ROP".
    expect(screen.getByText('Critical-spares availability')).toBeInTheDocument();
    expect(screen.getByText('33.3%')).toBeInTheDocument();
    expect(screen.getByText(/3 of 9 above ROP/)).toBeInTheDocument();
  });

  it('formats tied-up NMI+SMI value from the bundle (₹ over the sum)', async () => {
    await renderReady();
    // nmiValue 79,50,000 + smiValue 30,00,000 = 1,09,50,000 -> ₹1.10 Cr.
    const tied = formatInr(bundle.kpis.nmiValue + bundle.kpis.smiValue);
    expect(screen.getByText(new RegExp(`${tied.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} tied up`))).toBeInTheDocument();
  });
});

describe('S-6 AC2 — forecast panel shows the 3 / 6 / 12-month horizon series', () => {
  beforeEach(() => vi.clearAllMocks());

  it('defaults to the 6-month horizon and renders its total', async () => {
    await renderReady();
    const region = forecastRegion();
    // Default horizon is 6 months; MAT-1001 h6 = 105 -> "105 units".
    expect(within(region).getByText(/Forecast demand · next 6 mo/)).toBeInTheDocument();
    expect(within(region).getByText('105 units')).toBeInTheDocument();
  });

  it('switching the horizon toggle changes the headline total to the matching h3 / h12', async () => {
    await renderReady();
    const region = forecastRegion();

    // 3 mo -> h3 = 46.5 units.
    fireEvent.click(within(region).getByRole('radio', { name: '3 mo' }));
    await waitFor(() => expect(within(region).getByText('46.5 units')).toBeInTheDocument());
    expect(within(region).getByText(/next 3 mo/)).toBeInTheDocument();

    // 12 mo -> h12 = 199.9 units.
    fireEvent.click(within(region).getByRole('radio', { name: '12 mo' }));
    await waitFor(() => expect(within(region).getByText('199.9 units')).toBeInTheDocument());
    expect(within(region).getByText(/next 12 mo/)).toBeInTheDocument();

    // The three horizons produced three DIFFERENT totals — the toggle is real.
    expect(within(region).queryByText('105 units')).not.toBeInTheDocument();
  });
});

describe('S-6 AC3 — plant & material filters change what the forecast panel shows', () => {
  beforeEach(() => vi.clearAllMocks());

  it('selecting a different plant switches the active material and its forecast', async () => {
    await renderReady();
    const region = forecastRegion();

    // Initial selection is the first forecast: MAT-1001 / Plant-01, h6 = 105.
    expect(within(region).getByText('105 units')).toBeInTheDocument();

    // Filter to Plant-03 -> only MAT-1009 remains, h6 = 352.6.
    const plantSelect = within(region).getByLabelText('Plant');
    fireEvent.change(plantSelect, { target: { value: 'Plant-03' } });
    await waitFor(() => expect(within(region).getByText('352.6 units')).toBeInTheDocument());
    expect(within(region).queryByText('105 units')).not.toBeInTheDocument();

    // The material select now offers MAT-1009 (Plant-03) as the active value.
    const materialSelect = within(region).getByLabelText('Material') as HTMLSelectElement;
    expect(materialSelect.value).toBe('MAT-1009');
  });

  it('selecting a specific material updates the shown forecast total', async () => {
    await renderReady();
    const region = forecastRegion();

    // With all plants, pick MAT-1009 directly -> h6 = 352.6.
    const materialSelect = within(region).getByLabelText('Material');
    fireEvent.change(materialSelect, { target: { value: 'MAT-1009' } });
    await waitFor(() => expect(within(region).getByText('352.6 units')).toBeInTheDocument());
  });
});

describe('S-6 AC4 — alert panels list the correct over / under / non-moving materials', () => {
  beforeEach(() => vi.clearAllMocks());

  it('places each material in its correct alert column', async () => {
    await renderReady();

    const understock = panelByTitle('Understock');
    const overstock = panelByTitle('Overstock');
    const nonMoving = panelByTitle('Non-moving / slow-moving');

    // Understock column holds MAT-1003 and NOT the overstock/non-moving codes.
    expect(within(understock).getByText('MAT-1003')).toBeInTheDocument();
    expect(within(understock).queryByText('MAT-1012')).not.toBeInTheDocument();

    // Overstock column holds MAT-1012.
    expect(within(overstock).getByText('MAT-1012')).toBeInTheDocument();
    expect(within(overstock).queryByText('MAT-1003')).not.toBeInTheDocument();

    // Non-moving / slow-moving column holds both MAT-1006 (NM) and MAT-1015 (SM).
    expect(within(nonMoving).getByText('MAT-1006')).toBeInTheDocument();
    expect(within(nonMoving).getByText('MAT-1015')).toBeInTheDocument();
  });

  it('labels the understock item with its kind and critical-spare flag', async () => {
    await renderReady();
    const understock = panelByTitle('Understock');
    // The kind badge (a <span>, distinct from the panel's <h2> title) and the
    // Critical badge both render for MAT-1003.
    const understockLabels = within(understock).getAllByText('Understock');
    expect(understockLabels.some((el) => el.tagName === 'SPAN')).toBe(true);
    expect(within(understock).getByText('Critical')).toBeInTheDocument();
  });
});

describe('S-6 AC5 — PR table shows lead-time-aware raise dates and scope toggle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the recommended row with a formatted lead-time-aware raise-by date', async () => {
    await renderReady();
    const region = panelByTitle('Purchase-requisition recommendations');

    // Default scope "To raise": the recommended MAT-1003 row is shown.
    expect(within(region).getByText('MAT-1003')).toBeInTheDocument();
    // raiseByDate 2026-10-05 -> "05 Oct 2026" (formatDate, en-GB UTC).
    expect(within(region).getByText('05 Oct 2026')).toBeInTheDocument();
    // Lead time 180 days is shown, and the reason carries the lead-time wording.
    expect(within(region).getByText('180')).toBeInTheDocument();
    expect(within(region).getByText(/180-day lead time/)).toBeInTheDocument();

    // The non-recommended MAT-1005 is hidden in "To raise" scope.
    expect(within(region).queryByText('MAT-1005')).not.toBeInTheDocument();
  });

  it('the scope toggle reveals the non-recommended rows in the full assessment', async () => {
    await renderReady();
    const region = panelByTitle('Purchase-requisition recommendations');

    fireEvent.click(within(region).getByRole('radio', { name: 'All' }));
    await waitFor(() => expect(within(region).getByText('MAT-1005')).toBeInTheDocument());
    // The recommended row is still present alongside it.
    expect(within(region).getByText('MAT-1003')).toBeInTheDocument();
  });

  it('carries the advisory disclosure that the extract has no PR/PO history', async () => {
    await renderReady();
    const region = panelByTitle('Purchase-requisition recommendations');
    expect(within(region).getByText(/Advisory/)).toBeInTheDocument();
    expect(within(region).getByText(/no PR\/PO history/)).toBeInTheDocument();
  });
});
