import { describe, it, expect } from 'vitest';
import { computeStp } from '../src/lib/stp';
import { PRESETS, scoreEnvironment, narrate } from '../src/lib/scenario';
import { synthProfile, skewT, helicity, bunkersRight, pressureAt } from '../src/lib/sounding';

describe('STP', () => {
  it('unity case', () => { expect(computeStp({ mlcape: 1500, esrh: 150, ebwdMs: 20, mllclM: 1000, mlcin: 0 })).toBeCloseTo(1); });
  it('gates', () => {
    expect(computeStp({ mlcape: 1500, esrh: 150, ebwdMs: 12, mllclM: 900, mlcin: 0 })).toBe(0);
    expect(computeStp({ mlcape: 1500, esrh: 150, ebwdMs: 40, mllclM: 900, mlcin: 0 })).toBeCloseTo(1.5);
    expect(computeStp({ mlcape: 1500, esrh: 150, ebwdMs: 20, mllclM: 2100, mlcin: 0 })).toBe(0);
    expect(computeStp({ mlcape: 1500, esrh: 150, ebwdMs: 20, mllclM: 900, mlcin: -125 })).toBeCloseTo(0.5);
  });
});

describe('presets + narrative', () => {
  const by = (id: string) => PRESETS.find((p) => p.id === id)!.env;
  it('Classic Plains outranks the hail bust on every index', () => {
    const a = scoreEnvironment(by('plains')), b = scoreEnvironment(by('hail'));
    expect(a.whirl.score).toBeGreaterThan(b.whirl.score); expect(a.stci.score).toBeGreaterThan(b.stci.score); expect(a.stp).toBeGreaterThan(b.stp);
  });
  it('hail bust is low-odds and narrated as a CAPE trap', () => {
    expect(scoreEnvironment(by('hail')).whirl.category).toBe('low');
    expect(narrate(by('hail')).join(' ')).toMatch(/chasing CAPE/);
  });
  it('HSLC narrative flags the low-CAPE regime', () => { expect(narrate(by('hslc')).join(' ')).toMatch(/low-CAPE/); });
  it('weak shear narrative', () => { expect(narrate({ ...by('plains'), effShearKt: 20 }).join(' ')).toMatch(/under 25 kt/); });
  it('first line always has a verdict with all three scores', () => { for (const p of PRESETS) expect(narrate(p.env)[0]).toMatch(/WHIRL .*STCI .*STP/); });
});

describe('synthetic sounding', () => {
  const prof = synthProfile(PRESETS[0].env);
  it('pressure decreases with height; Td ≤ T', () => {
    for (let i = 1; i < prof.length; i++) expect(prof[i].p).toBeLessThan(prof[i - 1].p);
    for (const l of prof) expect(l.td).toBeLessThanOrEqual(l.t);
    expect(pressureAt(0)).toBe(1000);
  });
  it('skew-T: higher pressure is lower on screen; warmer is right', () => {
    expect(skewT(0, 900, 100, 100).y).toBeGreaterThan(skewT(0, 500, 100, 100).y);
    expect(skewT(10, 700, 100, 100).x).toBeGreaterThan(skewT(0, 700, 100, 100).x);
  });
  it('stronger SRH500 input → more 0–1 km helicity in the synthetic profile', () => {
    const weak = synthProfile({ ...PRESETS[0].env, srh500: 50 });
    const hi = helicity(prof, 1000, bunkersRight(prof)), lo = helicity(weak, 1000, bunkersRight(weak));
    expect(hi).toBeGreaterThan(lo);
  });
});
