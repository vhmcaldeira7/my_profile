import { describe, expect, it } from 'vitest';
import { dictionaries } from '../../src/i18n';
import {
  FLOW_PR,
  FLOW_STAGES,
  FLOW_STEPS,
  canvasWidth,
  flowLayout,
  nodeKind,
  pathPrefixes,
} from '../../src/scripts/figures/flow-layout';

const labels = dictionaries.pt.flow;

describe('canvasWidth', () => {
  it('turns vertical under 600px and clamps each orientation', () => {
    expect(canvasWidth(599.4)).toEqual({ vertical: true, width: 420 });
    expect(canvasWidth(358)).toEqual({ vertical: true, width: 358 });
    expect(canvasWidth(600)).toEqual({ vertical: false, width: 1000 });
    expect(canvasWidth(1180)).toEqual({ vertical: false, width: 1180 });
  });
});

describe('flowLayout', () => {
  it('stages cover every step once, in order', () => {
    const covered = FLOW_STAGES.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, k) => a + k));
    expect(covered).toEqual(FLOW_STEPS.map((_, i) => i));
    expect(labels.stages).toHaveLength(FLOW_STAGES.length);
  });

  it('horizontal: human steps on the upper lane, agents on the lower one, evenly pitched', () => {
    const L = flowLayout(1180, labels);
    expect(L.vertical).toBe(false);
    expect(L.height).toBe(282);
    L.points.forEach((p, i) => expect(p.y).toBe(FLOW_STEPS[i]?.lane === 'h' ? 100 : 182));
    const pitch = (L.points[1]?.x ?? 0) - (L.points[0]?.x ?? 0);
    expect(pitch).toBeCloseTo((1180 - 28 - 82) / 13);
    expect(L.points.at(-1)?.x).toBeCloseTo(1180 - 28);
  });

  it('vertical: lanes at 40% and 60% of the width, 54 units per step', () => {
    const L = flowLayout(358, labels);
    expect(L.vertical).toBe(true);
    L.points.forEach((p, i) =>
      expect(p.x).toBe(FLOW_STEPS[i]?.lane === 'h' ? Math.round(358 * 0.4) : Math.round(358 * 0.6)),
    );
    expect((L.points[2]?.y ?? 0) - (L.points[1]?.y ?? 0)).toBe(54);
  });

  it('labels every step, then the loop, in the language given', () => {
    const en = flowLayout(1180, dictionaries.en.flow);
    expect(en.labels).toHaveLength(FLOW_STEPS.length + 1);
    expect(en.labels[0]?.lines).toEqual(dictionaries.en.flow.steps[0]);
    expect(en.labels.at(-1)?.lines).toEqual([dictionaries.en.flow.loop]);
  });

  it('frames the atomic-PR steps', () => {
    const L = flowLayout(1180, labels);
    const frame = L.pr[0]?.attrs;
    const x = Number(frame?.['x']),
      w = Number(frame?.['width']);
    expect(x).toBeLessThan(L.points[FLOW_PR[0]]?.x ?? 0);
    expect(x + w).toBeGreaterThan(L.points[FLOW_PR[1]]?.x ?? 0);
  });

  it('alternates near and far labels inside a run of same-lane steps', () => {
    const L = flowLayout(1180, labels);
    const y = (i: number) => Number(L.labels[i]?.attrs['y']);
    // steps 7, 8, 9 are three agents in a row: near, far, near
    expect(y(8)).toBeGreaterThan(y(7));
    expect(y(9)).toBe(y(7));
  });
});

describe('pathPrefixes', () => {
  it('returns one growing prefix per step, each ending on that step', () => {
    const L = flowLayout(1180, labels);
    const pre = pathPrefixes(L.path, L.points.length);
    expect(pre).toHaveLength(FLOW_STEPS.length);
    pre.forEach((d, i) => {
      const p = L.points[i];
      expect(d.endsWith(`${p?.x} ${p?.y}`)).toBe(true);
      if (i) expect(d.startsWith(pre[i - 1] as string)).toBe(true);
    });
  });
});

describe('nodeKind', () => {
  it('maps step kinds to their shape modifier', () => {
    expect(['step', 'gate', 'agent', 'auto', 'dual'].map((k) => nodeKind(k as never))).toEqual([
      'h',
      'gate',
      'a',
      'x',
      'gate',
    ]);
  });
});
