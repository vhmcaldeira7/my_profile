/** The esteira flow: SVG built from flow-layout, two lanes, horizontal on desktop and vertical on narrow stages. */
import type { FlowLabels } from '../../i18n';
import type { Gsap } from '../motion-types';
import { FLOW_PR, FLOW_STEPS, flowLayout, nodeKind, pathPrefixes, type Attrs, type ShapeSpec } from './flow-layout';

const NS = 'http://www.w3.org/2000/svg';

interface FlowNode extends SVGGElement {
  label: SVGTextElement;
}

export interface FlowFigure {
  /** Starts the looping packet timeline; returns the function that stops it and restores the static figure. */
  play(gsap: Gsap): () => void;
  destroy(): void;
}

const inert: FlowFigure = { play: () => () => {}, destroy: () => {} };

/** Labels rendered by the page from the route's dictionary; null when missing or malformed. */
function readLabels(fig: HTMLElement): FlowLabels | null {
  try {
    const parsed = JSON.parse(fig.dataset['labels'] ?? '') as Partial<FlowLabels> | null;
    return parsed && Array.isArray(parsed.steps) && Array.isArray(parsed.stages) ? (parsed as FlowLabels) : null;
  } catch {
    return null;
  }
}

export function initFlow(fig: HTMLElement): FlowFigure {
  const stage = fig.querySelector<HTMLElement>('.flow__stage');
  const labels = readLabels(fig);
  if (!stage || !labels) {
    console.error('flow: missing stage or labels; the figure stays empty');
    return inert;
  }

  const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs, parent: Element): SVGElementTagNameMap[K] => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, String(attrs[k]));
    parent.append(n);
    return n;
  };
  const shape = (s: ShapeSpec, parent: Element): SVGElement => {
    const n = el(s.tag, s.attrs, parent);
    s.lines?.forEach((line, i) => {
      const sp = document.createElementNS(NS, 'tspan');
      sp.setAttribute('x', String(s.attrs['x']));
      sp.setAttribute('dy', String(i ? s.lineHeight : 0));
      sp.textContent = line;
      n.append(sp);
    });
    return n;
  };

  let path: SVGPathElement, trail: SVGPathElement, pkt: SVGGElement;
  let nodes: FlowNode[] = [];
  let offs: number[] = [];
  let total = 0;
  let tl: ReturnType<Gsap['timeline']> | null = null;
  let io: IntersectionObserver | null = null;
  let gsapRef: Gsap | null = null;

  const build = () => {
    const stageWidth = stage.clientWidth;
    if (!Math.round(stageWidth)) return;
    const L = flowLayout(stageWidth, labels);
    fig.classList.toggle('flow--v', L.vertical);
    stage.replaceChildren();
    const svg = document.createElementNS(NS, 'svg');
    const gBack = el('g', {}, svg),
      gPr = el('g', {}, svg),
      gPath = el('g', {}, svg),
      gNodes = el('g', {}, svg),
      gLbl = el('g', {}, svg);
    const backEls = L.back.map((s) => shape(s, gBack));
    L.pr.forEach((s) => shape(s, gPr));
    const lblEls = L.labels.map((s) => shape(s, gLbl) as SVGTextElement);
    el('path', { d: L.arrow, class: 'fl-arrow' }, gPath);
    svg.setAttribute('viewBox', `0 0 ${L.width} ${L.height}`);
    svg.style.aspectRatio = `${L.width} / ${L.height}`;
    path = el('path', { d: L.path, class: 'fl-path' }, gPath);
    trail = el('path', { d: L.path, class: 'fl-trail' }, gPath);
    gPath.prepend(path);
    gPath.insertBefore(trail, path.nextSibling);
    stage.append(svg);
    // node offsets along the path, measured by growing the same d
    const probe = el('path', { d: 'M0 0' }, gPath);
    offs = pathPrefixes(L.path, L.points.length).map((d) => {
      probe.setAttribute('d', d);
      return probe.getTotalLength();
    });
    probe.remove();
    total = path.getTotalLength();
    nodes = FLOW_STEPS.map((s, i) => {
      const p = L.points[i] ?? { x: 0, y: 0 };
      const g = el(
        'g',
        { class: `fn fn--${nodeKind(s.kind)}`, transform: `translate(${p.x} ${p.y})` },
        gNodes,
      ) as FlowNode;
      if (s.kind === 'gate' || s.kind === 'dual') {
        el('circle', { r: 8, class: 'fl-ring' }, g);
        el('rect', { x: -6, y: -6, width: 12, height: 12, transform: 'rotate(45)', class: 'fn-shape' }, g);
        if (s.kind === 'dual') el('rect', { x: 4, y: 3, width: 7, height: 7, rx: 1.5, class: 'fn-badge' }, g);
      } else if (s.kind === 'step') el('circle', { r: 7 }, g);
      else el('rect', { x: -6.5, y: -6.5, width: 13, height: 13, rx: 2, class: 'fn-shape' }, g);
      g.label = lblEls[i] as SVGTextElement;
      return g;
    });
    // the vertical stage rules start after their label
    L.back.forEach((s, i) => {
      if (s.afterLabel === undefined) return;
      const b = (backEls[s.afterLabel] as SVGGraphicsElement).getBBox();
      backEls[i]?.setAttribute('x1', String(b.x + b.width + 8));
    });
    // the loop label masks the line behind it
    gLbl.querySelectorAll<SVGTextElement>('.fl-loop-t').forEach((t) => {
      const b = t.getBBox();
      const m = el(
        'rect',
        { x: b.x - 6, y: b.y - 2, width: b.width + 12, height: b.height + 4, class: 'fl-mask' },
        gPath,
      );
      gPath.insertBefore(m, trail.nextSibling);
    });
    pkt = el('g', { class: 'fl-pkt' }, svg);
    for (let k = 0; k < 3; k++) el('rect', { x: -4, y: -4, width: 8, height: 8, rx: 1.5 }, pkt);
    trail.style.strokeDasharray = `110 ${total + 110}`;
    setStatic();
  };

  const isGate = (g: Element) => /gate/.test(g.getAttribute('class') ?? '');
  const setStatic = () => {
    nodes.forEach((g) => {
      const on = isGate(g);
      g.classList.toggle('is-on', on);
      g.label.classList.toggle('is-on', on);
    });
    const p = path.getPointAtLength(0);
    pkt.querySelectorAll('rect').forEach((r) => r.setAttribute('transform', `translate(${p.x} ${p.y})`));
  };
  const render = (v: number) => {
    const s = v * total;
    trail.style.strokeDashoffset = String(110 - s);
    let cur = -1;
    nodes.forEach((g, i) => {
      const on = s >= (offs[i] ?? 0) - 1;
      g.classList.toggle('is-on', on);
      g.label.classList.toggle('is-on', on);
      if (on) cur = i;
    });
    const inPr = cur >= FLOW_PR[0] && cur < FLOW_PR[1] + 1 && s < (offs[FLOW_PR[1]] ?? 0) + 8;
    pkt.querySelectorAll('rect').forEach((r, k) => {
      const q = path.getPointAtLength(Math.max(0, s - k * (inPr ? 12 : 0)));
      r.setAttribute('transform', `translate(${q.x} ${q.y})`);
    });
  };

  // GSAP timeline: the packet walks node to node, pauses at every gate while the gate rings, then rides the loop back
  const play = (gsap: Gsap) => {
    gsapRef = gsap;
    if (!nodes.length) return () => {};
    tl?.kill();
    fig.classList.add('is-live');
    const prox = { v: 0 };
    const timeline = gsap.timeline({ repeat: -1, repeatDelay: 0.5, paused: true, onUpdate: () => render(prox.v) });
    const speed = 150;
    for (let i = 1; i <= nodes.length; i++) {
      const to = i < nodes.length ? (offs[i] ?? 0) : total;
      const from = i === 1 ? 0 : (offs[i - 1] ?? 0);
      timeline.to(prox, { v: to / total, duration: (to - from) / speed, ease: 'none' });
      const node = nodes[i];
      if (node && isGate(node)) {
        const ring = node.querySelector('.fl-ring');
        timeline.fromTo(
          ring,
          { attr: { r: 8 }, opacity: 0.9 },
          { attr: { r: 22 }, opacity: 0, duration: 0.7, ease: 'power2.out' },
        );
      }
    }
    tl = timeline;
    render(0);
    io?.disconnect();
    io = new IntersectionObserver(([e]) => (e?.isIntersecting ? timeline.play() : timeline.pause()));
    io.observe(fig);
    return () => {
      io?.disconnect();
      io = null;
      timeline.kill();
      tl = null;
      gsapRef = null;
      fig.classList.remove('is-live');
      setStatic();
    };
  };

  build();
  // rebuild in place and, if the timeline was running, restart it at the same progress
  const rebuild = () => {
    const pr = tl ? tl.progress() : -1;
    build();
    if (pr >= 0 && gsapRef) {
      play(gsapRef);
      tl?.progress(pr);
    }
  };
  let w = stage.clientWidth,
    rt = 0;
  const ro = new ResizeObserver(() => {
    const nw = stage.clientWidth;
    if (Math.abs(nw - w) < 8) return;
    w = nw;
    clearTimeout(rt);
    rt = window.setTimeout(rebuild, 120);
  });
  ro.observe(stage);
  void document.fonts.ready.then(rebuild);

  return {
    play,
    destroy() {
      ro.disconnect();
      clearTimeout(rt);
      io?.disconnect();
      tl?.kill();
      stage.replaceChildren();
    },
  };
}
