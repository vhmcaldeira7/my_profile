/**
 * Boot. The page is complete without this script; everything here is progressive enhancement:
 * the copy button and the static figures right away, the pointer fx and the scroll layer on first use,
 * the particle field after load on idle (hardware WebGL2 only), the skills sphere as its section nears.
 * With prefers-reduced-motion the motion layers wait until the preference changes, as in the prototype.
 */
import { initCopyButton } from './copy-button';
import { initCerts } from './figures/certs';
import { initFlow } from './figures/flow';
import { initInfra } from './figures/infra';
import { initLatam } from './figures/latam';
import { initOrbit } from './orbit/orbit';
import { initPointerFx } from './pointer-fx';
import { initProgressFallback } from './progress';
import { loadScroll, type Playable } from './scroll';
import { reduceMotion } from './state';

const $ = (id: string) => document.getElementById(id);

const copy = $('copy');
if (copy instanceof HTMLButtonElement) initCopyButton(copy, document.querySelector('.contact__link'));
initProgressFallback(document.querySelector<HTMLElement>('.progress'));

const figures: Playable[] = [];
const figure = <T extends Playable>(id: string, init: (el: HTMLElement) => T) => {
  const el = $(id);
  if (el) figures.push(init(el));
};
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

const boot = () => {
  const start = () => {
    try {
      initPointerFx();
    } catch {
      /* decorative only */
    }
    const events = ['scroll', 'wheel', 'touchstart', 'pointermove', 'keydown'] as const;
    const firstUse = () => {
      events.forEach((e) => removeEventListener(e, firstUse));
      void loadScroll(figures, false);
    };
    if (scrollY > 0 || location.hash) void loadScroll(figures, !!location.hash);
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
        gl = null;
      }
    }
    if (canvas instanceof HTMLCanvasElement && gl && hardware(rendererName(gl))) {
      const context = gl;
      import('./particles/scene').then((m) => m.startParticles(canvas, context)).catch(noWebgl);
    } else noWebgl();
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
      try {
        initOrbit(how, reduceMotion);
      } catch {
        /* the flat list stays */
      }
    },
    { rootMargin: '300px 0px' },
  ).observe(how);
