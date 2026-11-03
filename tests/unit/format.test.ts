import { describe, expect, it } from 'vitest';
import { drainOrder, formatBudget, formatCounter, formatCut, parseCounter } from '../../src/scripts/format';

describe('counters', () => {
  it('splits the number from its suffix and formats frames', () => {
    expect(parseCounter('100+')).toEqual({ n: 100, suffix: '+' });
    expect(parseCounter('7')).toEqual({ n: 7, suffix: '' });
    expect(formatCounter(36.6, '+')).toBe('37+');
  });
});

describe('figure readouts', () => {
  it('counts the budget up to R$ 15 M', () => {
    expect(formatBudget(0, 15)).toBe('R$ 0 M');
    expect(formatBudget(0.5, 15)).toBe('R$ 8 M');
    expect(formatBudget(1, 15)).toBe('R$ 15 M');
  });

  it('formats cost cuts with a typographic minus', () => {
    expect(formatCut(0.6, 1)).toBe('−60%');
    expect(formatCut(0.4, 0.5)).toBe('−20%');
    expect(formatCut(0.5, 0)).toBe('−0%');
  });
});

describe('drainOrder', () => {
  it('switches off the top slat of every rack before the next row', () => {
    expect(drainOrder(24, 8).slice(0, 6)).toEqual([0, 8, 16, 1, 9, 17]);
    expect([...drainOrder(24, 8)].sort((a, b) => a - b)).toEqual(Array.from({ length: 24 }, (_, i) => i));
  });
});
