import { describe, it, expect } from 'vitest';
import { computeStci, sigmoid, ramp, gCIN, gBWD, gEIL, STCI_WEIGHTS, type StciInputs } from '../src/lib/stci';
const base: StciInputs = { srh500: 100, streamwiseFrac500: 0.65, cape03: 65, mllclM: 1100, sfc850TdDep: 5.25, thetaVGrad: 2.5, hasEffectiveInflow: true, bwdMs: 20, mlcin: -10 };
describe('STCI', () => {
  it('weights sum to 1', () => { expect(Object.values(STCI_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1); });
  it('sigmoid midpoint is 0.5', () => { expect(sigmoid(100, 100, 0.035)).toBe(0.5); });
  it('ramps clamp and invert', () => { expect(ramp(600, 600, 1600, true)).toBe(1); expect(ramp(2000, 600, 1600, true)).toBe(0); expect(ramp(10, 0, 5)).toBe(1); });
  it('all sub-indices at midpoint → 5.0', () => { expect(computeStci(base).score).toBeCloseTo(5); });
  it('gates', () => {
    expect(gEIL(false)).toBe(0); expect(gBWD(12.4)).toBe(0); expect(gBWD(12.5)).toBe(1);
    expect(gCIN(-50)).toBe(1); expect(gCIN(-100)).toBeCloseTo(0.5); expect(gCIN(-150)).toBe(0);
    expect(computeStci({ ...base, bwdMs: 10 }).score).toBe(0);
    expect(computeStci({ ...base, mlcin: -100 }).score).toBeCloseTo(2.5);
  });
  it('bounded 0–10', () => {
    const hi = computeStci({ ...base, srh500: 1000, streamwiseFrac500: 1, cape03: 300, mllclM: 300, sfc850TdDep: 0, thetaVGrad: 9 });
    expect(hi.score).toBeLessThanOrEqual(10); expect(hi.score).toBeGreaterThan(9.5);
  });
  it('rejects NaN', () => { expect(() => computeStci({ ...base, cape03: NaN })).toThrow(RangeError); });
});
