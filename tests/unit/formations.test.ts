import { describe, expect, it } from 'vitest';
import { FORMATIONS, buildFormations, mulberry32 } from '../../src/scripts/particles/formations';

const initials = {
  cells: [
    [10, 5],
    [11, 5],
    [12, 6],
  ] as [number, number][],
  w: 60,
  h: 28,
};

describe('mulberry32', () => {
  it('is deterministic and stays in [0, 1)', () => {
    const a = mulberry32(42),
      b = mulberry32(42);
    const xs = Array.from({ length: 1000 }, () => a());
    expect(xs).toEqual(Array.from({ length: 1000 }, () => b()));
    xs.forEach((x) => expect(x >= 0 && x < 1).toBe(true));
  });
});

describe('buildFormations', () => {
  const N = 3000;
  const f = buildFormations(N, initials);

  it('gives every particle a position in all six formations', () => {
    expect(f.P).toHaveLength(FORMATIONS);
    f.P.forEach((p) => {
      expect(p).toHaveLength(N * 3);
      expect(p.every(Number.isFinite)).toBe(true);
    });
    expect(f.rnd).toHaveLength(N);
    expect(f.mask).toHaveLength(N);
  });

  it('draws the same picture on every visit', () => {
    const again = buildFormations(N, initials);
    expect(again.P[2]).toEqual(f.P[2]);
    expect(again.mask).toEqual(f.mask);
  });

  it('marks the initials pixels in bit 5 of the highlight mask', () => {
    const lit = [...f.mask].filter((m) => m & 32).length;
    const per = Math.max(1, Math.floor((N * 0.86) / initials.cells.length));
    expect(lit).toBe(Math.min(N, per * initials.cells.length));
  });
});
