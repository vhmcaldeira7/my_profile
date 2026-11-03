/** Pointer fx: click burst, the ripple's click point for the particles, a cursor ring and a hover swarm on buttons. */
import { state } from './state';

const CONTROL = 'a, button, summary, [role="button"]';

export function initPointerFx(): void {
  document.addEventListener('click', (e) => {
    const c = (e.target as Element | null)?.closest(CONTROL);
    if (!c) return;
    let x = e.clientX,
      y = e.clientY;
    if (!e.detail) {
      const r = c.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
    }
    state.pulse = { x, y, t: performance.now() };
    burst(x, y);
  });
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) cursorRing();
}

function burst(x: number, y: number): void {
  const box = document.body.appendChild(document.createElement('div'));
  box.className = 'fx-burst';
  for (let i = 0; i < 14; i++) {
    const p = box.appendChild(document.createElement('i'));
    const a = Math.random() * Math.PI * 2,
      d = 30 + Math.random() * 60,
      dx = Math.cos(a) * d,
      dy = Math.sin(a) * d;
    p.style.width = p.style.height = 3 + Math.floor(Math.random() * 3) + 'px';
    p.animate(
      [
        { transform: `translate(${x}px, ${y}px) scale(1)` },
        { transform: `translate(${x + dx}px, ${y + dy}px) scale(1)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${x + dx * 1.1}px, ${y + dy + 14 + Math.random() * 22}px) scale(0)`, opacity: 0 },
      ],
      { duration: 500 + Math.random() * 300, easing: 'cubic-bezier(.2,.7,.3,1)' },
    ).onfinish = () => {
      p.remove();
      if (!box.childElementCount) box.remove();
    };
  }
}

interface Swarm {
  box: HTMLDivElement;
  ps: [HTMLElement, number, number, number, number][];
  on: boolean;
  e: number;
  v: number;
  drift: number;
}

function cursorRing(): void {
  const root = document.documentElement;
  const ring = document.body.appendChild(document.createElement('div'));
  ring.className = 'cursor';
  ring.dataset['mode'] = 'off';
  ring.setAttribute('aria-hidden', 'true');
  const label = ring.appendChild(document.createElement('span'));
  const SIZE: Record<string, number> = { link: 54, label: 72 };
  let px = 0,
    py = 0,
    rx = 0,
    ry = 0,
    rw = 34,
    rh = 34,
    raf = 0,
    last = 0,
    down = false,
    mode = 'off',
    lock: Element | null = null;
  const swarms = new Map<Element, Swarm>();
  const spawn = (el: Element) => {
    const box = document.body.appendChild(document.createElement('div'));
    const ps: Swarm['ps'] = [];
    box.className = 'fx-swarm';
    for (let i = 0; i < 18; i++) {
      const p = box.appendChild(document.createElement('i'));
      p.style.width = p.style.height = 2 + Math.floor(Math.random() * 3) + 'px';
      ps.push([
        p,
        Math.random() * 7,
        (0.5 + Math.random()) * (i % 4 ? 1 : -1),
        8 + Math.random() * 14,
        Math.random() * 7,
      ]);
    }
    swarms.set(el, { box, ps, on: true, e: 0, v: 0, drift: 0 });
  };
  const setLock = (el: Element | null) => {
    if (el === lock) return;
    if (el && !swarms.has(el)) spawn(el);
    swarms.forEach((w, k) => (w.on = k === el));
    lock = el;
    kick();
  };
  const tick = (now: number) => {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    const k = mode === 'off' ? 1 : 1 - Math.exp(-dt * 22);
    last = now;
    let tx = px,
      ty = py,
      tw = (SIZE[mode] || 34) * (down ? 0.85 : 1),
      th = tw;
    if (lock) {
      const r = lock.getBoundingClientRect(),
        pad = down ? 2 : 12;
      tx = r.left + r.width / 2;
      ty = r.top + r.height / 2;
      tw = r.width + pad;
      th = r.height + pad;
    }
    rx += (tx - rx) * k;
    ry += (ty - ry) * k;
    rw += (tw - rw) * k;
    rh += (th - rh) * k;
    ring.style.cssText = `translate:${rx - rw / 2}px ${ry - rh / 2}px;width:${rw}px;height:${rh}px`;
    const t = now / 1000;
    swarms.forEach((w, el) => {
      w.e = Math.min(1, w.e + dt * 4);
      w.v = w.on ? Math.min(1, w.v + dt * 4) : w.v - dt * 2.5;
      w.drift = w.on ? w.drift * Math.exp(-dt * 10) : w.drift + dt * 70;
      if (!w.on && w.v <= 0) {
        w.box.remove();
        swarms.delete(el);
        return;
      }
      const r = el.getBoundingClientRect(),
        ex = r.width > r.height * 1.5 ? 0.5 : 1,
        grow = 1 - (1 - w.e) ** 3;
      for (const [p, a0, speed, d, f] of w.ps) {
        const a = a0 + t * speed,
          c = Math.cos(a),
          sn = Math.sin(a),
          o = d * grow + w.drift + 3 * Math.sin(t * 2.3 + f);
        p.style.transform = `translate(${r.left + r.width / 2 + Math.sign(c) * Math.abs(c) ** ex * (r.width / 2 + o)}px, ${r.top + r.height / 2 + Math.sign(sn) * Math.abs(sn) ** ex * (r.height / 2 + o)}px) scale(${w.v})`;
        p.style.opacity = String(w.v * (0.7 + 0.3 * Math.sin(t * 5 + f * 3)));
      }
    });
    raf =
      swarms.size || Math.abs(tx - rx) + Math.abs(ty - ry) + Math.abs(tw - rw) + Math.abs(th - rh) > 0.2
        ? requestAnimationFrame(tick)
        : 0;
  };
  const kick = () => {
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };
  const over = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const t = e.target as Element,
      l = t.closest<HTMLElement>('[data-cursor-label]'),
      m = t.closest('.btn, .magnet');
    mode = t.closest('dialog, input, textarea, [contenteditable]')
      ? 'off'
      : m
        ? 'lock'
        : t.closest(CONTROL)
          ? 'link'
          : l
            ? 'label'
            : '';
    setLock(mode === 'lock' ? m : null);
    if (l) label.textContent = l.dataset['cursorLabel'] ?? '';
    ring.dataset['mode'] = mode;
    kick();
  };
  document.addEventListener('pointerover', over);
  document.addEventListener('pointerout', (e) => {
    if (!e.relatedTarget) {
      setLock(null);
      ring.dataset['mode'] = mode = 'off';
    }
  });
  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      px = e.clientX;
      py = e.clientY;
      if (!root.classList.contains('has-cursor')) {
        root.classList.add('has-cursor');
        rx = px;
        ry = py;
        over(e);
      }
      kick();
    },
    { passive: true },
  );
  addEventListener('pointerdown', () => {
    down = true;
    kick();
  });
  addEventListener('pointerup', () => {
    down = false;
    kick();
  });
  addEventListener(
    'scroll',
    () => {
      if (lock) kick();
    },
    { passive: true },
  );
}
