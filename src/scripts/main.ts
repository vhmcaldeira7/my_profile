/**
 * Boot. The page is complete without this script; everything here is progressive enhancement:
 * the language-switch helper, the copy button and the static figures right away, the pointer fx and the scroll layer
 * on first use, the particle field after load on idle (hardware WebGL2 only), the skills sphere as its section nears.
 * With prefers-reduced-motion the motion layers wait until the preference changes, as in the prototype.
 *
 * Every module hands back a disposer; they are collected here and run when the page is torn down (pagehide).
 * Real failures are logged with console.error; the no-WebGL path is a deliberate, silent fallback.
 */
import { initCopyButton } from './copy-button';
import { initCerts } from './figures/certs';
import { initFlow } from './figures/flow';
import { initInfra } from './figures/infra';
import { initLatam } from './figures/latam';
import { initLangSwitch, redirectLegacyLang } from './lang-switch';
import { initOrbit } from './orbit/orbit';
import { initPointerFx } from './pointer-fx';
import { initProgressFallback } from './progress';
import { loadScroll, type Playable } from './scroll';
import { reduceMotion } from './state';

const $ = (id: string) => document.getElementById(id);
const disposers: (() => void)[] = [];
const guard = (name: string, run: () => void) => {
  try {
    run();
  } catch (error) {
    console.error(`${name}: failed to start`, error);
  }
};
addEventListener('pagehide', (e) => {
  if (e.persisted) return;
  disposers.splice(0).forEach((dispose) => guard('teardown', dispose));
});

if (!redirectLegacyLang()) {
  guard('lang-switch', () => disposers.push(initLangSwitch()));
  guard('copy', () => {
    const copy = $('copy');
    if (copy instanceof HTMLButtonElement)
      disposers.push(initCopyButton(copy, document.querySelector('.contact__link'), $('copy-status')));
  });
  guard('progress', () => disposers.push(initProgressFallback(document.querySelector<HTMLElement>('.progress'))));

  const figures: Playable[] = [];
  const figure = <T extends Playable & { destroy?: () => void }>(id: string, init: (el: HTMLElement) => T) =>
    guard(id, () => {
      const el = $(id);
      if (!el) return;
      const f = init(el);
      figures.push(f);
      if (f.destroy) disposers.push(() => f.destroy?.());
    });
  figure('flow-esteira', initFlow);
  figure('latam', initLatam);
  figure('certs', initCerts);
  figure('infra', initInfra);

  const noWebgl = () => document.documentElement.classList.add('no-webgl');
  const hardware = (name: string) => !!name && !/swiftshader|llvmpipe|software/i.test(name);
  const rendererName = (g: WebGL2RenderingContext | null) => {
    if (!g) return '';
    const info = g.getExtension('WEBGL_debug_renderer_info');
    return String(g.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : g.RENDERER));
  };

  const startScroll = (onAnchor: boolean) =>
    void loadScroll(figures, onAnchor).then((dispose) => {
      if (dispose && !disposers.includes(dispose)) disposers.push(dispose);
    });

  const boot = () => {
    const start = () => {
      guard('pointer-fx', () => disposers.push(initPointerFx()));
      const events = ['scroll', 'wheel', 'touchstart', 'pointermove', 'keydown'] as const;
      const firstUse = () => {
        events.forEach((e) => removeEventListener(e, firstUse));
        startScroll(false);
      };
      if (scrollY > 0 || location.hash) startScroll(!!location.hash);
      else events.forEach((e) => addEventListener(e, firstUse, { passive: true }));
      const canvas = $('signal');
      let gl: WebGL2RenderingContext | null = null;
      if (canvas instanceof HTMLCanvasElement) {
        try {
          gl = canvas.getContext('webgl2', {
            alpha: true,
            antialias: false,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: true,
          });
        } catch {
          gl = null; // no WebGL2 here: the graceful path below
        }
      }
      // software renderers and missing WebGL2 are expected: hide the canvas without noise
      if (!(canvas instanceof HTMLCanvasElement) || !gl || !hardware(rendererName(gl))) return noWebgl();
      const context = gl;
      import('./particles/scene')
        .then((m) => disposers.push(m.startParticles(canvas, context)))
        .catch((error: unknown) => {
          console.error('particles: the scene failed to load', error);
          noWebgl();
        });
    };
    const idle = () =>
      requestAnimationFrame(() =>
        setTimeout(() => ('requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 2500 }) : start())),
      );
    if (document.readyState === 'complete') idle();
    else addEventListener('load', idle, { once: true });
  };
  if (reduceMotion.matches) reduceMotion.addEventListener('change', boot, { once: true });
  else boot();

  // the sphere comes alive once its section nears the viewport
  const how = $('metodo');
  if (how)
    new IntersectionObserver(
      (entries, io) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        guard('orbit', () => disposers.push(initOrbit(how, reduceMotion)));
      },
      { rootMargin: '300px 0px' },
    ).observe(how);
}
