import { describe, it, expect } from 'vitest';
import { formatInr, formatNum, formatPct, formatMonth, formatDate } from './format';

describe('formatInr', () => {
  it('renders crores', () => {
    expect(formatInr(124_00_000)).toBe('₹1.24 Cr');
  });
  it('renders lakhs', () => {
    expect(formatInr(3_10_000)).toBe('₹3.10 L');
  });
  it('renders small values with grouping', () => {
    expect(formatInr(4500)).toBe('₹4,500');
  });
  it('handles non-finite input', () => {
    expect(formatInr(NaN)).toBe('—');
  });
});

describe('formatNum', () => {
  it('rounds to the requested decimals', () => {
    expect(formatNum(46.5, 1)).toBe('46.5');
    expect(formatNum(210)).toBe('210');
  });
  it('handles non-finite input', () => {
    expect(formatNum(Infinity)).toBe('—');
  });
});

describe('formatPct', () => {
  it('shows one decimal with a percent sign', () => {
    expect(formatPct(87.8)).toBe('87.8%');
  });
});

describe('formatMonth', () => {
  it('renders a short month + two-digit year from an ISO key', () => {
    expect(formatMonth('2026-10')).toBe("Oct '26");
  });
  it('returns the raw key when unparseable', () => {
    expect(formatMonth('nope')).toBe('nope');
  });
});

describe('formatDate', () => {
  it('renders a day-month-year date', () => {
    expect(formatDate('2026-12-10')).toBe('10 Dec 2026');
  });
});
