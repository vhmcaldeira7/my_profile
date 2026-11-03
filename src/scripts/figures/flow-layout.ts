/**
 * Geometry of the esteira flow figure, kept free of the DOM so it can be unit-tested.
 * The DOM layer (flow.ts) turns this description into SVG and measures what only a browser can (path lengths, text boxes).
 */
import type { FlowLabels } from '../../i18n';

export type Lane = 'h' | 'a';
/** step: plain human step; gate: human approval; agent; auto: automation; dual: a gate with an agent beside it. */
export type StepKind = 'step' | 'gate' | 'agent' | 'auto' | 'dual';

export interface FlowStep {
  lane: Lane;
  kind: StepKind;
}

export const FLOW_STEPS: readonly FlowStep[] = [
  { lane: 'h', kind: 'step' },
  { lane: 'a', kind: 'agent' },
  { lane: 'h', kind: 'gate' },
  { lane: 'a', kind: 'agent' },
  { lane: 'h', kind: 'gate' },
  { lane: 'h', kind: 'step' },
  { lane: 'h', kind: 'gate' },
  { lane: 'a', kind: 'agent' },
  { lane: 'a', kind: 'agent' },
  { lane: 'a', kind: 'agent' },
  { lane: 'h', kind: 'gate' },
  { lane: 'h', kind: 'dual' },
  { lane: 'a', kind: 'auto' },
  { lane: 'a', kind: 'auto' },
];

/** First and last step index of each stage, in the order of `FlowLabels.stages`. */
export const FLOW_STAGES: readonly (readonly [number, number])[] = [
  [0, 2],
  [3, 4],
  [5, 6],
  [7, 11],
  [12, 12],
  [13, 13],
];

/** Steps wrapped by the "atomic PRs" frame. */
export const FLOW_PR = [7, 11] as const;

/** Below this stage width the figure turns vertical. */
export const VERTICAL_BELOW = 600;

export interface Point {
  x: number;
  y: number;
}

export type Attrs = Record<string, string | number>;

/** One SVG element to create; `lines` makes it a <text> with one <tspan> per line, `lineHeight` apart. */
export interface ShapeSpec {
  tag: 'path' | 'line' | 'rect' | 'text';
  attrs: Attrs;
  lines?: readonly string[];
  lineHeight?: number;
  /** Vertical stage rules start after their label; the DOM layer moves x1 once the label is measured. */
  afterLabel?: number;
}

export interface FlowLayout {
  vertical: boolean;
  width: number;
  height: number;
  points: Point[];
  /** Background: stage brackets or rules, lane guides and lane names. */
  back: ShapeSpec[];
  /** The atomic-PR frame and its tab. */
  pr: ShapeSpec[];
  /** Step labels, then the loop label (always last). */
  labels: ShapeSpec[];
  /** The travelled path: lanes joined by S-curves, then the loop back to the start. */
  path: string;
  arrow: string;
}

/** Width of the SVG canvas: horizontal never narrower than 1000 units (it scales down), vertical never wider than 420. */
export function canvasWidth(stageWidth: number): { vertical: boolean; width: number } {
  const w = Math.round(stageWidth);
  const vertical = w < VERTICAL_BELOW;
  return { vertical, width: vertical ? Math.min(w, 420) : Math.max(w, 1000) };
}

const text = (
  lines: readonly string[],
  x: number,
  y: number,
  cls: string,
  anchor: string,
  lineHeight: number,
): ShapeSpec => ({
  tag: 'text',
  attrs: { x, y, class: cls, 'text-anchor': anchor },
  lines,
  lineHeight,
});

export function flowLayout(stageWidth: number, labels: FlowLabels): FlowLayout {
  const { vertical, width: W } = canvasWidth(stageWidth);
  return vertical ? verticalLayout(W, labels) : horizontalLayout(W, labels);
}

function horizontalLayout(W: number, T: FlowLabels): FlowLayout {
  const n = FLOW_STEPS.length;
  const x0 = 82,
    x1 = W - 28,
    pitch = (x1 - x0) / (n - 1),
    yH = 100,
    yA = 182,
    yL = 266,
    H = 282;
  const slot = (i: number) => x0 + i * pitch;
  const small = pitch < 80;
  const points = FLOW_STEPS.map((s, i) => ({ x: slot(i), y: s.lane === 'h' ? yH : yA }));
  const back: ShapeSpec[] = [];
  FLOW_STAGES.forEach(([a, b], j) => {
    const xa = slot(a) - pitch * 0.42,
      xb = slot(b) + pitch * 0.42;
    back.push({ tag: 'path', attrs: { d: `M${xa} 27 v-5 H${xb} v5`, class: 'fl-br' } });
    back.push(text([T.stages[j] ?? ''], (xa + xb) / 2, 13, 'fl-stage', 'middle', 0));
  });
  [yH, yA].forEach((y) =>
    back.push({ tag: 'line', attrs: { x1: x0 - 8, y1: y, x2: x1 + 8, y2: y, class: 'fl-guide' } }),
  );
  back.push(text([T.human], x0 - 20, yH + 3.5, 'fl-lane', 'end', 0));
  back.push(text([T.agent], x0 - 20, yA + 3.5, 'fl-lane', 'end', 0));

  const px0 = slot(FLOW_PR[0]) - pitch * 0.45,
    px1 = slot(FLOW_PR[1]) + pitch * 0.45;
  const pr: ShapeSpec[] = [
    { tag: 'rect', attrs: { x: px0, y: yH - 14, width: px1 - px0, height: yA - yH + 28, rx: 2, class: 'fl-pr' } },
    text([T.pr], px0, yH - 20, 'fl-pr-t', 'start', 0),
  ];

  // labels alternate near/far inside a run of same-lane neighbours so nothing collides
  const labels: ShapeSpec[] = [];
  let prevLane = '',
    prevFar = true;
  FLOW_STEPS.forEach((s, i) => {
    const far = s.lane === prevLane && !prevFar;
    prevLane = s.lane;
    prevFar = far;
    const lines = T.steps[i] ?? [],
      p = points[i] as Point;
    const y = s.lane === 'h' ? p.y - (far ? 46 : 20) - (lines.length - 1) * 12.5 : p.y + (far ? 54 : 28);
    labels.push(text(lines, p.x, y, 'fl-lbl' + (small ? ' fl-lbl--s' : ''), 'middle', 12.5));
  });

  // S-curves between lanes, straight runs inside one, then the loop under everything back to the start
  let d = '';
  points.forEach((p, i) => {
    if (!i) {
      d = `M${p.x} ${p.y}`;
      return;
    }
    const q = points[i - 1] as Point;
    d += q.y === p.y ? ` L${p.x} ${p.y}` : ` C${q.x + pitch / 2} ${q.y} ${p.x - pitch / 2} ${p.y} ${p.x} ${p.y}`;
  });
  const last = points[n - 1] as Point,
    first = points[0] as Point;
  d += ` L${last.x} ${yL - 10} q0 10 -10 10 H${first.x + 10} q-10 0 -10 -10 V${first.y + 20}`;
  labels.push(text([T.loop], (first.x + last.x) / 2, yL + 3.5, 'fl-loop-t', 'middle', 0));
  const arrow = `M${first.x - 4.5} ${first.y + 20} l4.5 -7 l4.5 7 z`;
  return { vertical: false, width: W, height: H, points, back, pr, labels, path: d, arrow };
}

function verticalLayout(W: number, T: FlowLabels): FlowLayout {
  const xH = Math.round(W * 0.4),
    xA = Math.round(W * 0.6),
    pitch = 54,
    head = 28,
    small = W < 340;
  const points: Point[] = [];
  const back: ShapeSpec[] = [];
  let y = 12;
  FLOW_STAGES.forEach(([a, b], j) => {
    back.push(text([T.stages[j] ?? ''], 0, y + 10, 'fl-stage', 'start', 0));
    back.push({
      tag: 'line',
      attrs: { x1: 0, y1: y + 6.5, x2: W, y2: y + 6.5, class: 'fl-guide', 'data-after': '' },
      afterLabel: back.length - 1,
    });
    y += head;
    for (let i = a; i <= b; i++) {
      points[i] = { x: (FLOW_STEPS[i] as FlowStep).lane === 'h' ? xH : xA, y: y + pitch / 2 };
      y += pitch;
    }
  });
  const yB = y + 10,
    H = yB + 26;
  const first = points[0] as Point,
    last = points[points.length - 1] as Point;
  [xH, xA].forEach((x) =>
    back.push({ tag: 'line', attrs: { x1: x, y1: first.y - 18, x2: x, y2: last.y + 18, class: 'fl-guide' } }),
  );
  back.push(text([T.human], xH, first.y - 26, 'fl-lane', 'middle', 0));
  back.push(text([T.agent], xA, first.y - 26, 'fl-lane', 'middle', 0));

  const py0 = (points[FLOW_PR[0]] as Point).y - 16,
    py1 = (points[FLOW_PR[1]] as Point).y + 16;
  const pr: ShapeSpec[] = [
    { tag: 'rect', attrs: { x: xH - 15, y: py0, width: xA - xH + 30, height: py1 - py0, rx: 2, class: 'fl-pr' } },
    text([T.pr], xH - 22, py0 + 4, 'fl-pr-t', 'end', 0),
  ];

  const labels: ShapeSpec[] = FLOW_STEPS.map((s, i) => {
    const p = points[i] as Point,
      lines = T.steps[i] ?? [],
      h = s.lane === 'h';
    return text(
      lines,
      h ? p.x - 17 : p.x + 17,
      p.y + 4 - (lines.length - 1) * 6.25,
      'fl-lbl' + (small ? ' fl-lbl--s' : ''),
      h ? 'end' : 'start',
      12.5,
    );
  });

  let d = '';
  points.forEach((p, i) => {
    if (!i) {
      d = `M${p.x} ${p.y}`;
      return;
    }
    const q = points[i - 1] as Point;
    d += q.x === p.x ? ` L${p.x} ${p.y}` : ` C${q.x} ${q.y + pitch / 2} ${p.x} ${p.y - pitch / 2} ${p.x} ${p.y}`;
  });
  const xR = W - 4;
  d += ` L${last.x} ${yB - 10} q0 10 10 10 H${xR - 10} q10 0 10 -10 V${first.y + 10} q0 -10 -10 -10 H${first.x + 20}`;
  labels.push(text([T.loop], (last.x + xR) / 2, yB + 16, 'fl-loop-t', 'middle', 0));
  const arrow = `M${first.x + 20} ${first.y - 4.5} l-7 4.5 l7 4.5 z`;
  return { vertical: true, width: W, height: H, points, back, pr, labels, path: d, arrow };
}

/** Path prefixes that end on each step, so the DOM layer can measure how far along the path every node sits. */
export function pathPrefixes(d: string, steps: number): string[] {
  const segs = d.split(/(?= [LCqHV])/);
  const out: string[] = [];
  let acc = '';
  segs.forEach((seg, i) => {
    acc += seg;
    if (i < steps) out.push(acc);
  });
  return out;
}

/** CSS modifier of a node: gates and duals share the diamond, agents and automations the square, plain steps the circle. */
export function nodeKind(kind: StepKind): 'gate' | 'a' | 'x' | 'h' {
  if (kind === 'gate' || kind === 'dual') return 'gate';
  if (kind === 'agent') return 'a';
  if (kind === 'auto') return 'x';
  return 'h';
}
