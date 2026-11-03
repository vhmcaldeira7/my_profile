import { describe, expect, it } from 'vitest';
import { chips } from '../../src/data/skills';
import { assignSlots, fibonacciPoint, gcd, perspective, rotate } from '../../src/scripts/orbit/fibonacci';

describe('fibonacciPoint', () => {
  it('puts every point on the unit sphere, from the top pole down', () => {
    const n = 43;
    const pts = Array.from({ length: n }, (_, i) => fibonacciPoint(i, n));
    pts.forEach((p) => expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(1, 10));
    const ys = pts.map((p) => p.y);
    expect([...ys].sort((a, b) => b - a)).toEqual(ys);
    expect(ys[0]).toBeCloseTo(1 - 1 / n, 10);
  });
});

describe('assignSlots', () => {
  const starred = chips.map((c) => !!c.star);
  const slots = assignSlots(starred);

  it('uses every slot exactly once', () => {
    expect(slots).toHaveLength(starred.length);
    expect([...slots].sort((a, b) => a - b)).toEqual(starred.map((_, i) => i));
  });

  it('spreads the 12 starred chips on evenly spaced slots', () => {
    const at = slots.flatMap((item, slot) => (starred[item] ? [slot] : []));
    expect(at).toEqual(Array.from({ length: 12 }, (_, j) => Math.floor(((j + 0.5) * 43) / 12)));
    const gaps = at.slice(1).map((s, i) => s - (at[i] as number));
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);
  });

  it('never puts two neighbours of the plain list on adjacent slots', () => {
    const slotOf = new Map(slots.map((item, slot) => [item, slot]));
    const plain = starred.flatMap((s, i) => (s ? [] : [i]));
    plain.slice(1).forEach((item, k) => {
      expect(Math.abs((slotOf.get(item) as number) - (slotOf.get(plain[k] as number) as number))).toBeGreaterThan(1);
    });
  });

  it('handles lists with no starred items or only starred items', () => {
    expect([...assignSlots([false, false, false])].sort()).toEqual([0, 1, 2]);
    expect(assignSlots([true, true])).toEqual([0, 1]);
  });
});

describe('sphere helpers', () => {
  it('gcd', () => {
    expect(gcd(12, 18)).toBe(6);
    expect(gcd(11, 31)).toBe(1);
  });

  it('rotate keeps points on the sphere', () => {
    const pts = [fibonacciPoint(3, 10), fibonacciPoint(7, 10)];
    rotate(pts, 0.4, -0.2);
    pts.forEach((p) => expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(1, 10));
  });

  it('perspective is 1 at the centre plane and grows toward the viewer', () => {
    expect(perspective(0, 4)).toBeCloseTo(0.75);
    expect(perspective(1, 4)).toBe(1);
    expect(perspective(-1, 4)).toBeCloseTo(0.6);
  });
});
