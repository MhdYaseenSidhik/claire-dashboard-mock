import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import type { AnalysisBundle } from './lib/analysis';

/**
 * Acceptance tests derived from the S-6 / INV-6 acceptance criteria, written
 * against the app's public behaviour (not its internals):
 *  - KPI tiles render the values from the analysis bundle (kpis).
 *  - Forecast panel shows the 3 / 6 / 12-month horizon series (forecasts).
 *  - The forecast plant and material filters change what is shown.
 *  - Alert panels list the correct over / under / non-moving materials.
 *  - The PR table shows lead-time-aware raise-by dates, and its scope toggle
 *    switches between "to raise" and the full assessment.
 *
 * The bundle below spans two plants and several categories / alert kinds so a
 * filter that does nothing would be caught. fetchAnalysis is mocked so the app
 * renders against a known bundle with no network — the same approach as
 * App.test.tsx.
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
      ],
      h3: 46.5,
      h6: 105,
      h12: 199.9,
    },
    {
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
      materialCode: 'MAT-1003',
      plant: 'Plant-01',
      category: 'Mechanical',
      recommend: true,
      raiseByDate: '2026-10-05',
      qty: 12,
      advisory: true,
      reason: 'Stock below ROP; long lead time.',
      currentStock: 2,
      forecastOverLeadTime: 9,
      reorderPoint: 8,
      safetyStock: 4,
      leadTimeDays: 180,
      longLead: true,
    },
    {
      materialCode: 'MAT-1005',
      plant: 'Plant-02',
      category: 'Consumable',
      recommend: false,
      raiseByDate: '',
      qty: 0,
      advisory: true,
      reason: 'Holds cover over lead time.',
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

async function renderReady() {
  render(<App />);
  await waitFor(() => expect(screen.getByText('Gross inventory value')).toBeInTheDocument());
}

describe('S-6 acceptance — KPI tiles render values from the bundle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows every KPI tile with the formatted bundle value', async () => {
    await renderReady();
    // Gross inventory value 23,353,400 -> ₹2.34 Cr
    expect(screen.getByText('₹2.34 Cr')).toBeInTheDocument();
    // Days on hand
    expect(screen.getByText('Days on hand')).toBeInTheDocument();
    expect(screen.getByText('210')).toBeInTheDocument();
    // Turnover 1.48 -> 1.48×
    expect(screen.getByText('1.48×')).toBeInTheDocument();
    // NMI / SMI counts
    expect(screen.getByText('NMI / SMI')).toBeInTheDocument();
    expect(screen.getByText('3 / 2')).toBeInTheDocument();
    // Forecast accuracy 87.8 -> 87.8%
    expect(screen.getByText('87.8%')).toBeInTheDocument();
    // Critical-spares availability 33.33 -> 33.3%, "3 of 9 above ROP"
    expect(screen.getByText('Critical-spares availability')).toBeInTheDocument();
    expect(screen.getByText('33.3%')).toBeInTheDocument();
    expect(screen.getByText(/3 of 9 above ROP/)).toBeInTheDocument();
  });
});

describe('S-6 acceptance — forecast charts show the 3 / 6 / 12-month series', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the horizon total and switches it when 3 / 6 / 12 is selected', async () => {
    await renderReady();
    const group = screen.getByRole('radiogroup', { name: /forecast horizon/i });
    // Default horizon is 6 mo -> MAT-1001 h6 = 105.
    expect(screen.getByText(/next 6 mo/i)).toBeInTheDocument();
    expect(screen.getByText('105 units')).toBeInTheDocument();

    // Switch to 3 mo -> h3 = 46.5.
    fireEvent.click(within(group).getByRole('radio', { name: '3 mo' }));
    await waitFor(() => expect(screen.getByText('46.5 units')).toBeInTheDocument());
    expect(screen.getByText(/next 3 mo/i)).toBeInTheDocument();

    // Switch to 12 mo -> h12 = 199.9.
    fireEvent.click(within(group).getByRole('radio', { name: '12 mo' }));
    await waitFor(() => expect(screen.getByText('199.9 units')).toBeInTheDocument());
    expect(screen.getByText(/next 12 mo/i)).toBeInTheDocument();
  });
});

describe('S-6 acceptance — forecast filters change what is shown', () => {
  beforeEach(() => vi.clearAllMocks());

  it('the material select switches the forecast to another material', async () => {
    await renderReady();
    // Default first material MAT-1001 (h6 = 105).
    expect(screen.getByText('105 units')).toBeInTheDocument();

    const materialSelect = screen.getByLabelText('Material') as HTMLSelectElement;
    fireEvent.change(materialSelect, { target: { value: 'MAT-1009' } });

    // MAT-1009 h6 = 352.6 -> "352.6 units"; the previous 105 total is gone.
    await waitFor(() => expect(screen.getByText('352.6 units')).toBeInTheDocument());
    expect(screen.queryByText('105 units')).not.toBeInTheDocument();
  });

  it('the plant filter restricts the material options to that plant', async () => {
    await renderReady();
    const plantSelect = screen.getByLabelText('Plant') as HTMLSelectElement;
    const materialSelect = screen.getByLabelText('Material') as HTMLSelectElement;

    // All plants: both materials selectable.
    expect(within(materialSelect).getByRole('option', { name: /MAT-1001/ })).toBeInTheDocument();
    expect(within(materialSelect).getByRole('option', { name: /MAT-1009/ })).toBeInTheDocument();

    // Filter to Plant-03: only MAT-1009 remains, and the chart follows it.
    fireEvent.change(plantSelect, { target: { value: 'Plant-03' } });
    await waitFor(() =>
      expect(within(materialSelect).queryByRole('option', { name: /MAT-1001/ })).not.toBeInTheDocument(),
    );
    expect(within(materialSelect).getByRole('option', { name: /MAT-1009/ })).toBeInTheDocument();
    expect(screen.getByText('352.6 units')).toBeInTheDocument();
  });
});

describe('S-6 acceptance — alert panels list the correct materials', () => {
  beforeEach(() => vi.clearAllMocks());

  // The Panel renders as a Card (`.rounded-card`) whose header <h2> and body
  // list are siblings, so walk up to the enclosing card to scope the query.
  function panelByTitle(title: string): HTMLElement {
    const heading = screen.getByRole('heading', { name: title });
    const card = heading.closest('.rounded-card');
    if (!card) throw new Error(`No panel card found for "${title}"`);
    return card as HTMLElement;
  }

  it('groups under / over / non-moving into their panels', async () => {
    await renderReady();
    // Understock panel contains MAT-1003 (the ZSPN critical understock).
    const under = panelByTitle('Understock');
    expect(within(under).getByText('MAT-1003')).toBeInTheDocument();

    // Overstock panel contains MAT-1012.
    const over = panelByTitle('Overstock');
    expect(within(over).getByText('MAT-1012')).toBeInTheDocument();

    // Non-moving / slow-moving panel contains MAT-1006 and MAT-1015.
    const nm = panelByTitle('Non-moving / slow-moving');
    expect(within(nm).getByText('MAT-1006')).toBeInTheDocument();
    expect(within(nm).getByText('MAT-1015')).toBeInTheDocument();

    // A non-moving material must NOT leak into the understock panel.
    expect(within(under).queryByText('MAT-1006')).not.toBeInTheDocument();
  });
});

describe('S-6 acceptance — PR table shows lead-time-aware raise dates', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the recommended row with its raise-by date and scope toggle', async () => {
    await renderReady();
    // Default scope "To raise" -> only MAT-1003 (recommend true) shows, with a
    // formatted raise-by date (05 Oct 2026) and its long-lead badge (180).
    const table = screen.getByRole('table');
    expect(within(table).getByText('MAT-1003')).toBeInTheDocument();
    expect(within(table).getByText('05 Oct 2026')).toBeInTheDocument();
    expect(within(table).getByText('180')).toBeInTheDocument();
    // The non-recommended MAT-1005 is hidden in "to raise" scope.
    expect(within(table).queryByText('MAT-1005')).not.toBeInTheDocument();

    // Switch scope to "All" -> the full assessment includes MAT-1005.
    const scope = screen.getByRole('radiogroup', { name: /recommendation scope/i });
    fireEvent.click(within(scope).getByRole('radio', { name: 'All' }));
    await waitFor(() =>
      expect(within(screen.getByRole('table')).getByText('MAT-1005')).toBeInTheDocument(),
    );
  });

  it('states the advisory data-gap caveat (no PR/PO history)', async () => {
    await renderReady();
    expect(screen.getAllByText(/no PR\/PO history/i).length).toBeGreaterThan(0);
  });
});

describe('S-6 acceptance — theme toggle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('toggles the document theme class when clicked', async () => {
    await renderReady();
    const btn = screen.getByRole('button', { name: /switch to .* theme/i });
    const before = document.documentElement.classList.contains('dark');
    fireEvent.click(btn);
    await waitFor(() =>
      expect(document.documentElement.classList.contains('dark')).toBe(!before),
    );
  });
});
