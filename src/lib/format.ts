/** Format an INR amount for compact display in the dashboard (e.g. 12.4 Cr, 3.1 L). */
export function formatInr(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(value / 1e5).toFixed(2)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

/** Round to a fixed number of decimals, dropping trailing zeros; em-dash for non-finite. */
export function formatNum(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/** Percentage with one decimal, e.g. 87.8%. */
export function formatPct(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(1)}%`;
}

/** Short month label from an ISO YYYY-MM key, e.g. "Oct '25". */
export function formatMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  const d = new Date(Date.UTC(y, m - 1, 1));
  return `${d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })} '${String(y).slice(2)}`;
}

/** A day-month-year date from an ISO date string, e.g. "10 Dec 2026". */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
