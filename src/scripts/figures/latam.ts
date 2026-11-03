/** The latam map: seven countries light up north to south, then each acquisition rides its arc into the hub. */
import { formatCounter, parseCounter } from '../format';
import type { Gsap } from '../motion-types';

export interface LatamFigure {
  play(gsap: Gsap): () => void;
  destroy(): void;
}

export function initLatam(fig: HTMLElement): LatamFigure {
  const stage = fig.querySelector<HTMLElement>('.latam__stage');
  const svg = stage?.querySelector('svg');
  if (!stage || !svg) throw new Error('latam: missing stage');
  const countries = [...svg.querySelectorAll<SVGPathElement>('.lm-c--on')].map(
    (c) => [c, svg.querySelector(`.lm-name[data-for="${c.id}"]`)] as const,
  );
  const origins = [...svg.querySelectorAll('.lm-int, .lm-org')];
  const arcs = [...svg.querySelectorAll<SVGPathElement>('.lm-arc-t')].map((t, k) => ({
    t,
    len: t.getTotalLength(),
    pkt: svg.querySelector(`.lm-pkt[data-arc="${t.dataset['arc']}"]`),
    marks: [origins[k], ...svg.querySelectorAll(`.lm-tag[data-arc="${t.dataset['arc']}"]`)],
  }));
  const hub = [svg.querySelector('.lm-hub'), svg.querySelector('.lm-hub-t')];
  const ring = svg.querySelector('.lm-ring');
  const counters = [...(fig.closest('.panel')?.querySelectorAll<HTMLElement>('.gains strong') ?? [])].map((el) => ({
    el,
    text: el.textContent ?? '',
    ...parseCounter(el.textContent ?? ''),
  }));
  const P: Record<string, number> = { c: 0, a0: 0, a1: 0, a2: 0 };
  let tl: ReturnType<Gsap['timeline']> | null = null;
  arcs.forEach((a) => {
    a.t.style.strokeDasharray = `${a.len} ${a.len}`;
  });

  const render = () => {
    countries.forEach(([c, l], i) => {
      const on = (P['c'] ?? 0) >= i + 0.5;
      c.classList.toggle('is-on', on);
      l?.classList.toggle('is-on', on);
    });
    let landed = false;
    arcs.forEach((a, k) => {
      const v = P['a' + k] ?? 0,
        q = a.t.getPointAtLength(a.len * v);
      a.t.style.strokeDashoffset = String(a.len * (1 - v));
      a.marks.forEach((m) => m?.classList.toggle('is-on', v > 0));
      a.pkt?.setAttribute('transform', `translate(${q.x} ${q.y})`);
      a.pkt?.classList.toggle('is-on', v > 0.02 && v < 0.98);
      if (v >= 0.98) landed = true;
    });
    hub.forEach((h) => h?.classList.toggle('is-on', landed));
  };
  const setStatic = () => {
    P['c'] = countries.length;
    P['a0'] = P['a1'] = P['a2'] = 1;
    render();
  };

  // the countries light one by one, then each arc draws while a packet rides it and the hub rings on arrival
  const play = (gsap: Gsap) => {
    tl?.kill();
    fig.classList.add('is-live');
    P['c'] = P['a0'] = P['a1'] = P['a2'] = 0;
    const timeline = gsap.timeline({ repeat: -1, repeatDelay: 2, paused: true, onUpdate: render });
    timeline.to(P, { c: countries.length, duration: countries.length * 0.32, ease: 'none' });
    arcs.forEach((_, k) => {
      timeline.to(P, { ['a' + k]: 1, duration: 1.1, ease: 'power1.inOut' }, '+=0.2');
      timeline.fromTo(
        ring,
        { attr: { r: 7 }, opacity: 0.9 },
        { attr: { r: 24 }, opacity: 0, duration: 0.7, ease: 'power2.out' },
      );
    });
    timeline.to({}, { duration: 1.2 });
    tl = timeline;
    render();
    const count = counters.map((c) => {
      const o = { v: 0 };
      return gsap.to(o, {
        v: c.n,
        duration: 1.6,
        ease: 'power2.out',
        paused: true,
        onUpdate: () => {
          c.el.textContent = formatCounter(o.v, c.suffix);
        },
      });
    });
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        timeline.play();
        count.forEach((t) => t.play());
      } else timeline.pause();
    });
    io.observe(fig);
    return () => {
      io.disconnect();
      timeline.kill();
      tl = null;
      count.forEach((t) => t.kill());
      counters.forEach((c) => {
        c.el.textContent = c.text;
      });
      fig.classList.remove('is-live');
      setStatic();
    };
  };

  const fit = () => fig.classList.toggle('latam--s', stage.clientWidth < 460);
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(stage);
  setStatic();
  return {
    play,
    destroy() {
      ro.disconnect();
      tl?.kill();
    },
  };
}
