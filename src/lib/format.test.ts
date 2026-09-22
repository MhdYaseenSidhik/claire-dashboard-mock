import { describe, it, expect } from 'vitest';
import { formatInr } from './format';

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
