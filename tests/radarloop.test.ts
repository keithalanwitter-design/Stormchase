import { describe, it, expect } from 'vitest';
import { nextReadyFrame, RADAR_SPEEDS, RADAR_MAX_FRAMES } from '../src/lib/live';
describe('radar loop', () => {
  it('skips unloaded frames and wraps', () => {
    const ready = new Set([0, 2, 5]);
    expect(nextReadyFrame(0, 6, (i) => ready.has(i))).toBe(2);
    expect(nextReadyFrame(2, 6, (i) => ready.has(i))).toBe(5);
    expect(nextReadyFrame(5, 6, (i) => ready.has(i))).toBe(0);
    expect(nextReadyFrame(3, 6, () => false)).toBe(3);
  });
  it('defaults to a slower, rate-limit-friendly loop', () => { expect(RADAR_SPEEDS.normal).toBe(700); expect(RADAR_MAX_FRAMES).toBeLessThanOrEqual(10); });
});
