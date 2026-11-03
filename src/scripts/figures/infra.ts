/**
 * The infra figure: the budget counts up while the racks drain into the cloud, then the three bills shrink in order;
 * the workload stream keeps flowing while the figure is on screen.
 */
import { drainOrder, formatBudget, formatCut } from '../format';
import type { Gsap } from '../motion-types';

export interface InfraFigure {
  play(gsap: Gsap): () => void;
}

const SLATS_PER_RACK = 8;

export function initInfra(fig: HTMLElement): InfraFigure {
  const svg = fig.querySelector('.infra__stage svg');
  const budget = fig.querySelector<HTMLElement>('.infra__n');
  if (!svg || !budget) throw new Error('infra: missing stage');
  const slats = [...svg.querySelectorAll('.in-slat')];
  const nodes = [...svg.querySelectorAll('.in-node')];
  const cloud = svg.querySelector('.in-cloud');
  const paths = [...svg.querySelectorAll<SVGPathElement>('.in-path')].map((t) => ({
    t,
    len: t.getTotalLength(),
    pk: [...svg.querySelectorAll(`.in-pkt[data-path="${t.dataset['path']}"]`)],
  }));
  const meters = [...fig.querySelectorAll<HTMLElement>('.meter')].map((li) => ({
    li,
    cut: parseFloat(li.dataset['cut'] ?? '0'),
    n: li.querySelector('.meter__n'),
  }));
  const budgetText = budget.textContent ?? '';
  const budgetN = parseInt(budget.dataset['n'] ?? '0', 10);
  const P: Record<string, number> = { m: 0, s: 0, c0: 0, c1: 0, c2: 0, b: 0 };
  paths.forEach((p) => {
    p.t.style.strokeDasharray = `${p.len} ${p.len}`;
  });
  const order = drainOrder(slats.length, SLATS_PER_RACK);
  const v = (k: string) => P[k] ?? 0;

  const render = () => {
    const m = v('m');
    order.forEach((k, i) => slats[k]?.classList.toggle('is-off', m >= (i + 0.5) / slats.length));
    cloud?.classList.toggle('is-on', m >= 0.18);
    nodes.forEach((d, i) => d.classList.toggle('is-on', m >= 0.22 + ((i + 0.5) / nodes.length) * 0.78));
    paths.forEach((p) => {
      p.t.style.strokeDashoffset = String(p.len * (1 - Math.min(1, m * 1.8)));
      p.pk.forEach((k, q) => {
        const u = (v('s') + q / p.pk.length) % 1,
          pt = p.t.getPointAtLength(p.len * u);
        k.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
        k.classList.toggle('is-on', m > 0.04 && u > 0.03 && u < 0.97);
      });
    });
    meters.forEach((mt, i) => {
      const c = v('c' + i);
      mt.li.style.setProperty('--fill', String(1 - mt.cut * c));
      if (mt.n) mt.n.textContent = formatCut(mt.cut, c);
    });
    budget.textContent = formatBudget(v('b'), budgetN);
  };
  const setStatic = () => {
    P['m'] = P['c0'] = P['c1'] = P['c2'] = P['b'] = 1;
    P['s'] = 0;
    render();
    budget.textContent = budgetText;
  };
  const play = (gsap: Gsap) => {
    fig.classList.add('is-live');
    P['m'] = P['s'] = P['c0'] = P['c1'] = P['c2'] = P['b'] = 0;
    const stream = gsap.to(P, { s: 1, duration: 2.8, ease: 'none', repeat: -1, paused: true, onUpdate: render });
    const tl = gsap.timeline({ paused: true, onUpdate: render });
    tl.to(P, { b: 1, duration: 1.4, ease: 'power2.out' }, 0);
    tl.to(P, { m: 1, duration: 3.2, ease: 'none' }, 0.2);
    meters.forEach((_, i) => tl.to(P, { ['c' + i]: 1, duration: 0.8, ease: 'power2.out' }, i ? '-=0.4' : '-=0.9'));
    render();
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        tl.play();
        stream.play();
      } else {
        tl.pause();
        stream.pause();
      }
    });
    io.observe(fig);
    return () => {
      io.disconnect();
      tl.kill();
      stream.kill();
      fig.classList.remove('is-live');
      setStatic();
    };
  };
  setStatic();
  return { play };
}
