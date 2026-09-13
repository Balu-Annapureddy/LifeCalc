import { describe, it, expect } from 'vitest';
import { registry } from '../engine/registry';

describe('Calculator Registry Suite', () => {
  it('registers all core initial calculators', () => {
    const all = registry.getAll();
    expect(all.length).toBeGreaterThanOrEqual(10);
    const ids = all.map(c => c.id);
    expect(ids).toContain('emi');
    expect(ids).toContain('sip');
    expect(ids).toContain('ctc-to-take-home');
    expect(ids).toContain('compound-interest');
    expect(ids).toContain('cagr');
    expect(ids).toContain('gst');
    expect(ids).toContain('cgpa');
    expect(ids).toContain('attendance');
    expect(ids).toContain('can-i-afford-this');
    expect(ids).toContain('age');
    expect(ids).toContain('fuel-cost');
  });

  it('fetches by slug and category correctly', () => {
    const emi = registry.getBySlug('emi');
    expect(emi?.name).toBe('EMI Calculator');

    const moneyCalcs = registry.getByCategory('money');
    expect(moneyCalcs.length).toBeGreaterThanOrEqual(5);
  });

  it('provides relevant related calculators', () => {
    const related = registry.getRelated('emi');
    expect(related.length).toBeGreaterThan(0);
    expect(related.some(r => r.id === 'sip')).toBe(true);
  });

  it('searches calculators with ranking and typo tolerance', () => {
    const carResults = registry.search('loan');
    expect(carResults.length).toBeGreaterThan(0);
    expect(carResults[0].id).toBe('emi');

    const attendanceResults = registry.search('bunk 75 percent');
    expect(attendanceResults.some(r => r.id === 'attendance')).toBe(true);
  });
});
