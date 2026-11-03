/**
 * Scroll orchestration: GSAP + ScrollTrigger + Lenis, loaded on first interaction.
 * Pins the case panels on desktop, pans the career track on tall viewports, feeds the particle formations
 * and starts the figure timelines. Everything is undone by gsap.matchMedia when its conditions stop matching.
 */
import type { Gsap } from './motion-types';
import { finePointer, state } from './state';

/** A figure that can start its timeline once GSAP is available; returns its stop function. */
export interface Playable {
  play(gsap: Gsap): () => void;
}

const $ = (id: string) => document.getElementById(id);

export async function startScroll(figures: Playable[], onAnchor: boolean): Promise<void> {
  const fine = finePointer();
  const [{ gsap }, { ScrollTrigger }, lenisModule] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
    fine ? import('lenis') : Promise.resolve(null),
  ]);
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  // a refresh measures by jumping the page to the top and back; html's smooth scroll-behavior would turn those jumps into animations and skew every start
  const root = document.documentElement;
  ScrollTrigger.addEventListener('refreshInit', () => {
    root.style.scrollBehavior = 'auto';
  });
  ScrollTrigger.addEventListener('refresh', () => {
    root.style.scrollBehavior = '';
  });
  if (fine) gsap.ticker.lagSmoothing(0);

  const setup = (ctx: gsap.Context) => {
    const { desk, pan, motion } = ctx.conditions as Record<'desk' | 'pan' | 'motion', boolean>;
    state.F = [];
    state.D = [];
    state.pan = null;
    if (!motion) return;
    const formation = (el: Element | null) => {
      const o = { v: 0 };
      gsap.to(o, { v: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 75%', end: 'top 25%', scrub: 1 } });
      state.F.push(o);
    };
    const dim = (el: Element | null) => {
      const a = { v: 0 },
        b = { v: 0 };
      gsap.to(a, { v: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 70%', end: 'top 35%', scrub: 1 } });
      gsap.to(b, {
        v: 1,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'bottom 65%', end: 'bottom 30%', scrub: 1 },
      });
      state.D.push(() => a.v - b.v);
    };
    dim($('ofertas'));
    const panels = gsap.utils.toArray<HTMLElement>('.panel');
    if (desk) {
      const last = panels[panels.length - 1] as HTMLElement;
      panels.forEach((p, i) => {
        if (i === panels.length - 1 || p.offsetHeight > innerHeight + 2) return;
        ScrollTrigger.create({
          trigger: p,
          start: 'top top',
          endTrigger: last,
          end: 'top top',
          pin: true,
          pinSpacing: false,
        });
        gsap.to(p, {
          scale: 0.94,
          opacity: 0,
          ease: 'none',
          scrollTrigger: { trigger: panels[i + 1] as HTMLElement, start: 'top bottom', end: 'top top', scrub: true },
        });
      });
    }
    panels.forEach(formation);
    const xp = $('trajetoria');
    dim(xp);
    if (pan && xp) {
      xp.classList.add('is-pan');
      const track = xp.querySelector<HTMLElement>('.career__track');
      const dist = () => Math.max(0, (track?.scrollWidth ?? 0) - document.documentElement.clientWidth);
      state.pan = gsap.to(track, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: {
          trigger: xp,
          start: 'top top',
          end: () => '+=' + dist(),
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    }
    dim($('metodo'));
    dim($('vozes'));
    formation($('contato'));
    const off = figures.map((f) => f.play(gsap));
    if (fine && lenisModule) {
      const lenis = new lenisModule.default({ lerp: 0.1 });
      const raf = (time: number) => lenis.raf(time * 1000);
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(raf);
      state.lenis = lenis;
      off.push(() => {
        gsap.ticker.remove(raf);
        lenis.destroy();
        state.lenis = null;
      });
      document.querySelectorAll<HTMLElement>('.btn, .magnet').forEach((b) => {
        const xTo = gsap.quickTo(b, 'x', { duration: 0.45, ease: 'power3' });
        const yTo = gsap.quickTo(b, 'y', { duration: 0.45, ease: 'power3' });
        const move = (e: PointerEvent) => {
          const r = b.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * 0.3);
          yTo((e.clientY - r.top - r.height / 2) * 0.4);
        };
        const leave = () => {
          xTo(0);
          yTo(0);
        };
        b.addEventListener('pointermove', move);
        b.addEventListener('pointerleave', leave);
        off.push(() => {
          b.removeEventListener('pointermove', move);
          b.removeEventListener('pointerleave', leave);
        });
      });
    }
    return () => {
      xp?.classList.remove('is-pan');
      off.forEach((f) => f());
    };
  };
  const conds = {
    desk: '(min-width: 900px) and (min-height: 640px)',
    pan: '(min-width: 900px) and (min-height: 720px)',
    motion: '(prefers-reduced-motion: no-preference)',
  };
  gsap.matchMedia().add(conds, setup);
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  void document.fonts.ready.then(() => ScrollTrigger.refresh());
  // the skills sphere changes height when it comes alive; re-measure the triggers below it
  let howH = 0,
    howT = 0;
  const how = $('metodo');
  if (how)
    new ResizeObserver(([e]) => {
      const h = Math.round(e?.contentRect.height ?? 0);
      if (howH && h !== howH) {
        clearTimeout(howT);
        howT = window.setTimeout(() => ScrollTrigger.refresh(), 150);
      }
      howH = h;
    }).observe(how);
  const anchor = onAnchor ? document.getElementById(location.hash.slice(1)) : null;
  if (anchor) {
    const lenis = state.lenis as { scrollTo(t: Element, o: { immediate: boolean }): void } | null;
    if (lenis) lenis.scrollTo(anchor, { immediate: true });
    else anchor.scrollIntoView({ behavior: 'instant' });
  }
}

let loading: Promise<void> | null = null;
/** Loads and starts the scroll layer once; later calls share the same promise. */
export const loadScroll = (figures: Playable[], onAnchor: boolean): Promise<void> =>
  (loading ??= startScroll(figures, onAnchor).catch(() => {}));
