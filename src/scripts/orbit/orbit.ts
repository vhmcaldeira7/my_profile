/** The skills sphere: chips on a Fibonacci sphere, turning on their own and by drag. */
import { assignSlots, fibonacciPoint, perspective, rotate, type Vec3 } from './fibonacci';

const D = 4,
  AUTO = 0.0016;

export function initOrbit(how: HTMLElement, reduce: MediaQueryList): () => void {
  const orbit = how.querySelector<HTMLElement>('.orbit');
  if (!orbit) return () => {};
  const tags = [...orbit.querySelectorAll('li')];
  const N = tags.length;
  const order = assignSlots(tags.map((li) => li.hasAttribute('data-big')));
  const pos = new Map<HTMLLIElement, Vec3>(
    order.map((item, slot) => [tags[item] as HTMLLIElement, fibonacciPoint(slot, N)]),
  );

  let S = 0,
    R = 0;
  const home = new Map<HTMLLIElement, [number, number, number]>();
  const measure = () => {
    S = orbit.clientWidth;
    R = S * 0.55;
    for (const el of pos.keys())
      home.set(el, [
        el.offsetLeft + el.offsetWidth / 2 - S / 2,
        el.offsetTop + el.offsetHeight / 2 - S / 2,
        el.offsetWidth / 2,
      ]);
  };
  const done = new Map<HTMLLIElement, [string, string, number]>();
  const draw = () => {
    for (const [el, p] of pos) {
      const s = perspective(p.z, D),
        d = (p.z + 1) / 2,
        [hx, hy, hw] = home.get(el) ?? [0, 0, 0];
      const lim = S / 2 - hw * s,
        x = Math.max(-lim, Math.min(lim, p.x * R * s)),
        y = p.y * R * s;
      const t = `translate(${Math.round(x - hx)}px,${Math.round(y - hy)}px) scale(${s.toFixed(2)})`;
      const o = (0.2 + 0.8 * d).toFixed(2),
        z = Math.round(d * 4);
      let w = done.get(el);
      if (!w) done.set(el, (w = ['', '', -1]));
      if (w[0] !== t) el.style.transform = w[0] = t;
      if (w[1] !== o) el.style.opacity = w[1] = o;
      if (w[2] !== z) el.style.zIndex = String((w[2] = z));
    }
  };

  let seen = false,
    drag = 0,
    px = 0,
    py = 0,
    ax = 0,
    ay = 0,
    vx = 0,
    vy = 0,
    raf = 0,
    last = 0;
  const frame = (t: number) => {
    const k = last ? Math.min((t - last) / 16.7, 4) : 1;
    last = t;
    raf = 0;
    if (drag) {
      vx += (ax / k - vx) * 0.5;
      vy += (ay / k - vy) * 0.5;
      rotate(pos.values(), ax, ay);
      ax = ay = 0;
    } else {
      const e = 1 - 0.95 ** k;
      vx += ((reduce.matches ? 0 : AUTO) - vx) * e;
      vy -= vy * e;
      rotate(pos.values(), vx * k, vy * k);
    }
    draw();
    if (seen && (drag || Math.abs(vx) + Math.abs(vy) > 1e-5)) raf = requestAnimationFrame(frame);
    else last = 0;
  };
  const kick = () => {
    raf ||= requestAnimationFrame(frame);
  };
  const down = (e: PointerEvent) => {
    if (e.button) return;
    drag = 1;
    px = e.clientX;
    py = e.clientY;
    ax = ay = 0;
  };
  const move = (e: PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - px,
      dy = e.clientY - py;
    if (drag === 1) {
      if (Math.hypot(dx, dy) < 5) return;
      drag = 2;
      orbit.setPointerCapture(e.pointerId);
      orbit.classList.add('is-drag');
    }
    px = e.clientX;
    py = e.clientY;
    ax += dx / R;
    ay += dy / R;
    kick();
  };
  const up = () => {
    if (drag === 2 && reduce.matches) vx = vy = 0;
    drag = 0;
    orbit.classList.remove('is-drag');
  };
  orbit.addEventListener('pointerdown', down);
  orbit.addEventListener('pointermove', move);
  orbit.addEventListener('pointerup', up);
  orbit.addEventListener('pointercancel', up);
  measure();
  draw();
  how.classList.add('is-live');
  const ro = new ResizeObserver(() => {
    measure();
    draw();
  });
  ro.observe(orbit);
  const io = new IntersectionObserver(([e]) => {
    seen = !!e?.isIntersecting;
    kick();
  });
  io.observe(orbit);

  return () => {
    ro.disconnect();
    io.disconnect();
    cancelAnimationFrame(raf);
    orbit.removeEventListener('pointerdown', down);
    orbit.removeEventListener('pointermove', move);
    orbit.removeEventListener('pointerup', up);
    orbit.removeEventListener('pointercancel', up);
    how.classList.remove('is-live');
    for (const el of tags) el.removeAttribute('style');
  };
}
