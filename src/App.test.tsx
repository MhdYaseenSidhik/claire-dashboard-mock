import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { AnalysisBundle } from './lib/analysis';
import { formatDate } from './lib/format';

// Mock the analysis loader so the app renders against a known bundle without a
// real network fetch. Recharts is exercised through the ForecastPanel, so the
// ResizeObserver stub in src/test/setup.ts is what keeps that from throwing.
const bundle: AnalysisBundle = {
  generatedAt: '2026-09-22',
  meta: {
    snapshotDate: '2026-09-01',
    materialCount: 18,
    forecastMethod: 'Holt-Winters (additive)',
    forecastEngine: 'Produced by the forecasting engine.',
    dataGaps: ['No PR/PO history in the extract — PR recommendations are advisory.'],
  },
  kpis: {
    grossInventoryValue: 124_00_000,
    daysOnHand: 82,
    turnover: 3.4,
    nmiCount: 2,
    smiCount: 3,
    nmiValue: 5_00_000,
    smiValue: 3_00_000,
    forecastAccuracyPct: 84.2,
    criticalSparesTotal: 6,
    criticalSparesAvailable: 5,
    criticalSparesAvailabilityPct: 83.3,
  },
  forecasts: [
    {
      materialCode: 'MAT-1001',
      plant: 'Plant-01',
      method: 'Holt-Winters',
      history: [
        { month: '2026-07', qty: 10 },
        { month: '2026-08', qty: 12 },
        { month: '2026-09', qty: 11 },
      ],
      future: [
        { month: '2026-10', qty: 12 },
        { month: '2026-11', qty: 13 },
        { month: '2026-12', qty: 12 },
      ],
      h3: 37,
      h6: 72,
      h12: 145,
    },
  ],
  alerts: [
    {
      kind: 'UNDERSTOCK',
      materialCode: 'MAT-1003',
      description: 'Pump seal kit',
      category: 'Mechanical',
      plant: 'Plant-02',
      currentStock: 2,
      reorderPoint: 8,
      safetyStock: 4,
      lastConsumption: 3,
      materialType: 'ZSPN',
      criticalSpare: true,
    },
  ],
  recommendations: [
    {
      materialCode: 'MAT-1003',
      plant: 'Plant-02',
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
  ],
};

vi.mock('./lib/analysis', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/analysis')>();
  return { ...actual, fetchAnalysis: vi.fn().mockResolvedValue(bundle) };
});

// Import after the mock is registered.
const { default: App } = await import('./App');

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the KPI tiles from the bundle once loaded', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Gross inventory value')).toBeInTheDocument());
    expect(screen.getByText('₹1.24 Cr')).toBeInTheDocument();
    expect(screen.getByText('Days on hand')).toBeInTheDocument();
    expect(screen.getByText('Critical-spares availability')).toBeInTheDocument();
    expect(screen.getByText('84.2%')).toBeInTheDocument();
  });

  it('renders the understock alert and the PR recommendation row', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByText('MAT-1003').length).toBeGreaterThan(0));
    // The advisory PR banner and table caption both mention advisory/lead time.
    expect(screen.getAllByText(/advisory/i).length).toBeGreaterThan(0);
  });

  it('surfaces the snapshot date in the header', async () => {
    render(<App />);
    // Assert against the app's own date formatting rather than a hardcoded
    // string — the abbreviation ("Sep" vs "Sept") is locale/ICU dependent.
    const expected = `Snapshot ${formatDate('2026-09-01')}`;
    await waitFor(() =>
      expect(
        screen.getByText((_, el) => el?.tagName === 'SPAN' && el.textContent === expected),
      ).toBeInTheDocument(),
    );
  });
});
