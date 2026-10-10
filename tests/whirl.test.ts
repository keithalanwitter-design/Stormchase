import { describe, it, expect } from 'vitest';
import { computeWhirl, shearTerm, capeTerm, lclTerm, cinTerm, srhTerm, modeMultiplier, boundaryMultiplier, categorize, type WhirlInputs } from '../src/lib/whirl';

const base: WhirlInputs = { srh500: 150, effShearKt: 40, mlcape: 1500, mllclM: 1000, mlcin: -100, mode: 'mixed', boundary: false };

describe('WHIRL v0.1 terms', () => {
  it('SRH term normalizes by 75 and floors at 0', () => { expect(srhTerm(150)).toBe(2); expect(srhTerm(-20)).toBe(0); });
  it('shear term: 0 below 25 kt, /40, capped 1.5', () => {
    expect(shearTerm(24.9)).toBe(0); expect(shearTerm(25)).toBeCloseTo(0.625); expect(shearTerm(40)).toBe(1); expect(shearTerm(80)).toBe(1.5);
  });
  it('CAPE term capped at 1.25', () => { expect(capeTerm(750)).toBe(0.5); expect(capeTerm(5000)).toBe(1.25); expect(capeTerm(-5)).toBe(0); });
  it('LCL term clamps 0–1', () => { expect(lclTerm(500)).toBe(1); expect(lclTerm(1500)).toBe(0.5); expect(lclTerm(2500)).toBe(0); });
  it('CIN term clamps 0–1', () => { expect(cinTerm(0)).toBe(1); expect(cinTerm(-175)).toBe(0.5); expect(cinTerm(-300)).toBe(0); });
  it('multipliers', () => {
    expect(modeMultiplier('linear')).toBe(0.5); expect(modeMultiplier('mixed')).toBe(1); expect(modeMultiplier('discrete')).toBe(1.25);
    expect(boundaryMultiplier(true)).toBe(1.2); expect(boundaryMultiplier(false)).toBe(1);
  });
});

describe('computeWhirl', () => {
  it('computes the documented product', () => {
    // 2 × 1 × 1 × 1 × (150/150=1) × 1 × 1 = 2
    const r = computeWhirl(base);
    expect(r.score).toBeCloseTo(2); expect(r.category).toBe('chaseable'); expect(r.version).toMatch(/v0\.1/);
  });
  it('discrete + boundary high-end case', () => {
    const r = computeWhirl({ ...base, srh500: 300, mode: 'discrete', boundary: true, mlcin: -20 });
    // 4 × 1 × 1 × 1 × 1 × 1.25 × 1.2 = 6
    expect(r.score).toBeCloseTo(6); expect(r.category).toBe('high-end');
  });
  it('weak shear zeroes the score (CAPE alone cannot drive it)', () => {
    expect(computeWhirl({ ...base, effShearKt: 20, mlcape: 6000 }).score).toBe(0);
  });
  it('rejects non-finite input', () => { expect(() => computeWhirl({ ...base, srh500: NaN })).toThrow(RangeError); });
  it('categorize thresholds', () => { expect(categorize(0.99)).toBe('low'); expect(categorize(1)).toBe('chaseable'); expect(categorize(3)).toBe('high-end'); });
});
