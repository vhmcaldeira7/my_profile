/** The signal: one THREE.Points behind the whole page, six formations morphed on the GPU as the reader scrolls. */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ColorManagement,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector4,
  WebGLRenderer,
} from 'three';
import { state } from '../state';
import { FORMATIONS, buildFormations, type InitialsRaster } from './formations';
import { FRAG, VERT } from './shaders';

/** The initials, rasterised from the display face: each lit cell becomes a small square cluster. */
function rasterInitials(): InitialsRaster {
  const c = document.createElement('canvas'),
    W = 120,
    H = 56;
  c.width = W;
  c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return { cells: [], w: W / 2, h: H / 2 };
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '650 condensed 54px "Bricolage Grotesque Variable", "Bricolage Grotesque", "Arial Narrow", sans-serif';
  g.fillText('VC', W / 2, H / 2 + 2);
  const d = g.getImageData(0, 0, W, H).data,
    cells: [number, number][] = [];
  const step = 2;
  for (let y = 0; y < H; y += step)
    for (let x = 0; x < W; x += step) {
      let s = 0;
      for (let yy = 0; yy < step; yy++) for (let xx = 0; xx < step; xx++) s += d[((y + yy) * W + x + xx) * 4] ?? 0;
      if (s / (step * step) > 110) cells.push([x / step, y / step]);
    }
  return { cells, w: W / step, h: H / step };
}

interface Layout {
  x: number[];
  y: number[];
  s: number[];
  a: number[];
}

// where each formation sits: x/y as fractions of the half viewport, s as a fraction of min(halfW, halfH)
const LAYOUT: { desk: Layout; mob: Layout } = {
  desk: {
    x: [0.48, 0.5, 0.5, 0.5, 0.5, 0],
    y: [0, 0, 0, 0, 0, 0],
    s: [0.6, 0.5, 0.52, 0.5, 0.5, 0.4],
    a: [1, 1, 1, 1, 1, 1],
  },
  mob: {
    x: [0, 0, 0, 0, 0, 0],
    y: [0.08, 0, 0, 0, 0, 0],
    s: [0.78, 0.66, 0.7, 0.66, 0.68, 0.62],
    a: [0.5, 0.4, 0.4, 0.4, 0.4, 1],
  },
};

const at = (arr: number[], i: number) => arr[i] ?? 0;

export function startParticles(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext): () => void {
  const renderer = new WebGLRenderer({ canvas, context: gl });
  ColorManagement.enabled = false;
  const coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 768;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  const low =
    (nav.hardwareConcurrency || 8) <= 4 || !!nav.connection?.saveData || (!!nav.deviceMemory && nav.deviceMemory <= 2);
  const N = low ? 3000 : coarse ? 7000 : 20000;
  const baseSize = low ? 3.4 : coarse ? 2.6 : 2.2;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.z = 6;
  const halfH = Math.tan(((35 / 2) * Math.PI) / 180) * 6;

  const { P, mask, rnd, initSub, initDarkAlpha, INIT_H, IH } = buildFormations(N, rasterInitials());
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(P[0] as Float32Array, 3));
  for (let k = 1; k < FORMATIONS; k++) geo.setAttribute('position' + k, new BufferAttribute(P[k] as Float32Array, 3));
  geo.setAttribute('aRandom', new BufferAttribute(rnd, 1));
  geo.setAttribute('aHighlight', new BufferAttribute(mask, 1));
  const U = {
    uFrom: { value: 0 },
    uTo: { value: 1 },
    uMix: { value: 0 },
    uTime: { value: 0 },
    uPointSize: { value: baseSize },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uDrift: { value: 1 },
    uDark: { value: 1 },
    uAlpha: { value: 0.6 },
    uInitAlpha: { value: 0.6 },
    uInitSize: { value: 3 },
    uColorBase: { value: new Color() },
    uColorAccent: { value: new Color() },
    uMouse: { value: new Vector2() },
    uHalf: { value: new Vector2() },
    uPointer: { value: new Vector2() },
    uField: { value: new Vector2() },
    uPulse: { value: new Vector4(0, 0, 0, 0) },
  };
  const mat = new ShaderMaterial({
    uniforms: U,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  // particle colours come from the CSS tokens, so they follow the colour scheme
  let dark = true;
  const mqLight = matchMedia('(prefers-color-scheme: light)');
  const readTheme = () => {
    const cs = getComputedStyle(document.documentElement);
    U.uColorBase.value.set(cs.getPropertyValue('--particle').trim());
    U.uColorAccent.value.set(cs.getPropertyValue('--particle-accent').trim());
    const forced = document.documentElement.dataset['theme'];
    dark = forced ? forced === 'dark' : !mqLight.matches;
    U.uDark.value = dark ? 1 : 0;
    mat.blending = dark ? AdditiveBlending : NormalBlending;
    mat.needsUpdate = true;
  };
  readTheme();
  mqLight.addEventListener('change', readTheme);
  const themeObserver = new MutationObserver(readTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  let vw = 0,
    vh = 0;
  const resize = () => {
    const w = innerWidth,
      h = innerHeight;
    if (coarse && w === vw && Math.abs(h - vh) < 120) return;
    vw = w;
    vh = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    U.uPointSize.value = baseSize * Math.min(1.35, Math.max(0.8, h / 900));
  };
  resize();
  addEventListener('resize', resize);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const fine = matchMedia('(pointer: fine)').matches;
  const ptr = { x: 0, y: 0, tx: 0, ty: 0, moved: -1e9, field: 0 };
  const onMove = (e: PointerEvent) => {
    mouse.tx = (e.clientX / vw) * 2 - 1;
    mouse.ty = -((e.clientY / vh) * 2 - 1);
    ptr.tx = e.clientX;
    ptr.ty = e.clientY;
    ptr.moved = performance.now();
  };
  const onOut = (e: PointerEvent) => {
    if (!e.relatedTarget) ptr.moved = -1e9;
  };
  addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerout', onOut);

  const mqMobile = matchMedia('(max-width: 767px)');
  const contact = document.getElementById('contato');
  const contactInner = contact?.querySelector('.contact__inner');
  // initials slot: the band between the nav and the contact heading
  const initialsSlot = (L: Layout, unit: number, pxPerUnit: number) => {
    if (!contact || !contactInner) return;
    const sr = contact.getBoundingClientRect(),
      ir = contactInner.getBoundingClientRect();
    const top = Math.max(sr.top, 80),
      bottom = ir.top - 24;
    const hpx = Math.min(vh * 0.42, Math.max(96, (bottom - top) * 0.9));
    const cy = bottom - top >= hpx ? (top + bottom) / 2 : bottom - hpx / 2;
    L.y[5] = 1 - (2 * cy) / vh;
    L.s[5] = hpx / pxPerUnit / INIT_H / unit;
  };
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  let time = 0,
    last = performance.now(),
    dimS = 0,
    raf = 0,
    firstFrame = true;
  const MAXF = FORMATIONS - 1;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    let p = 0;
    for (const f of state.F) p += f.v;
    p = Math.max(0, Math.min(MAXF, p));
    let dim = 0;
    for (const d of state.D) dim += d();
    dim = Math.max(0, Math.min(1, dim));
    dimS += (dim - dimS) * (1 - Math.exp(-dt * 4));
    const from = Math.min(Math.floor(p), MAXF),
      to = Math.min(from + 1, MAXF),
      m = p - from;
    const e = m * m * (3 - 2 * m);
    const L = mqMobile.matches ? LAYOUT.mob : LAYOUT.desk;
    const halfW = halfH * camera.aspect,
      unit = Math.min(halfH, halfW);
    const pxPerUnit = vh / (2 * halfH);
    if (to === MAXF) initialsSlot(L, unit, pxPerUnit);
    const scale = lerp(at(L.s, from), at(L.s, to), e) * unit * (1 - 0.07 * dimS);
    const x = lerp(at(L.x, from), at(L.x, to), e) * halfW;
    points.position.set(x, lerp(at(L.y, from), at(L.y, to), e) * halfH, 0);
    points.scale.setScalar(scale);
    time += dt;
    mouse.x += (mouse.tx - mouse.x) * (1 - Math.exp(-dt * 3));
    mouse.y += (mouse.ty - mouse.y) * (1 - Math.exp(-dt * 3));
    points.rotation.y = mouse.x * 0.12;
    points.rotation.x = -mouse.y * 0.08;
    U.uFrom.value = from;
    U.uTo.value = to;
    U.uMix.value = m;
    U.uTime.value = time;
    U.uMouse.value.set(mouse.x, mouse.y);
    ptr.field += ((fine && now - ptr.moved < 1500 ? 1 : 0) - ptr.field) * (1 - Math.exp(-dt * 3));
    const pk = ptr.field < 0.01 ? 1 : 1 - Math.exp(-dt * 12);
    ptr.x += (ptr.tx - ptr.x) * pk;
    ptr.y += (ptr.ty - ptr.y) * pk;
    const Rf = 0.15 * Math.min(vw, vh);
    U.uHalf.value.set(vw / 2, vh / 2);
    U.uPointer.value.set(ptr.x - vw / 2, vh / 2 - ptr.y);
    U.uField.value.set(ptr.field * Rf * 0.3, Rf);
    const pl = state.pulse,
      age = pl ? Math.min(1, Math.max(0, now - pl.t) / 1200) : 1;
    if (pl) U.uPulse.value.set(pl.x - vw / 2, vh / 2 - pl.y, age * 0.7 * Math.max(vw, vh), 1 - age * age);
    U.uAlpha.value = (dark ? 0.62 : 0.78) * lerp(at(L.a, from), at(L.a, to), e) * (1 - 0.55 * dimS);
    U.uInitAlpha.value = dark ? initDarkAlpha : 1;
    U.uInitSize.value = (((INIT_H / IH) * at(L.s, 5) * unit * pxPerUnit) / initSub) * 1.3;
    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      canvas.classList.add('is-ready');
    }
  };
  // reduced motion switched on mid-visit stops the loop (CSS hides the canvas); a hidden tab gets no frames from the browser itself
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const sync = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    if (!mqReduce.matches) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
  mqReduce.addEventListener('change', sync);
  sync();

  return () => {
    cancelAnimationFrame(raf);
    mqReduce.removeEventListener('change', sync);
    mqLight.removeEventListener('change', readTheme);
    themeObserver.disconnect();
    removeEventListener('resize', resize);
    removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerout', onOut);
    geo.dispose();
    mat.dispose();
    renderer.dispose();
    canvas.classList.remove('is-ready');
  };
}
