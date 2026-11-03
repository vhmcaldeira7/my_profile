/**
 * The six particle formations, generated from a fixed seed so every visit draws the same picture.
 * Pure apart from the initials raster, which the caller passes in (it needs a 2D canvas).
 */

/** hero, esteira, desafios, security, infra, initials */
export const FORMATIONS = 6;

/** Encoded formations: x >= 100 means a static particle at (x - 200, y, z). */
const STATIC = 200;

export interface InitialsRaster {
  /** Lit cells as [column, row]. */
  cells: [number, number][];
  w: number;
  h: number;
}

export interface Formations {
  P: Float32Array[];
  mask: Float32Array;
  rnd: Float32Array;
  initSub: number;
  initDarkAlpha: number;
  INIT_H: number;
  IH: number;
}

/** Small, fast, seedable PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type V3 = [number, number, number];
type Tilt = (x: number, y: number, z: number) => V3;

export function buildFormations(N: number, initials: InitialsRaster): Formations {
  const R = mulberry32(20261027);
  const gauss = () => {
    let u = 0;
    while (!u) u = R();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R());
  };
  const P = Array.from({ length: FORMATIONS }, () => new Float32Array(N * 3));
  const bits = new Uint16Array(N);
  const rnd = new Float32Array(N);
  for (let i = 0; i < N; i++) rnd[i] = R();
  const perm = () => {
    const a = new Uint32Array(N);
    for (let i = 0; i < N; i++) a[i] = i;
    for (let i = N - 1; i > 0; i--) {
      const j = (R() * (i + 1)) | 0;
      const t = a[i] as number;
      a[i] = a[j] as number;
      a[j] = t;
    }
    return a;
  };
  const at = (pm: Uint32Array, j: number) => pm[j] as number;
  const put = (f: number, i: number, x: number, y: number, z: number) => {
    const o = i * 3,
      F = P[f] as Float32Array;
    F[o] = x;
    F[o + 1] = y;
    F[o + 2] = z;
  };
  const tiltOf =
    (ax: number, ay: number): Tilt =>
    (x, y, z) => {
      const cx = Math.cos(ax),
        sx = Math.sin(ax),
        cy = Math.cos(ay),
        sy = Math.sin(ay);
      const y1 = y * cx - z * sx,
        z1 = y * sx + z * cx;
      return [x * cy + z1 * sy, y1, -x * sy + z1 * cy];
    };
  const cluster = (f: number, i: number, c: V3, s: number, T?: Tilt) => {
    const p: V3 = T
      ? T(c[0] + gauss() * s, c[1] + gauss() * s, c[2] + gauss() * s)
      : [c[0] + gauss() * s, c[1] + gauss() * s, c[2] + gauss() * s];
    put(f, i, p[0], p[1], p[2]);
  };
  const along = (f: number, i: number, a: V3, b: V3, s: number, T?: Tilt) => {
    const t = R();
    const p: V3 = [
      a[0] + (b[0] - a[0]) * t + gauss() * s,
      a[1] + (b[1] - a[1]) * t + gauss() * s,
      a[2] + (b[2] - a[2]) * t + gauss() * s,
    ];
    const q = T ? T(...p) : p;
    put(f, i, q[0], q[1], q[2]);
  };
  const share = (frac: number) => Math.round(frac * N);

  // F0 hero: the orchestrator. A core and three waves of agents around it: scout, executor, verifier, joined by spokes
  {
    const pm = perm(),
      T = tiltOf(0.55, -0.25);
    const rings = [
      { r: 0.46, n: 5, s: 0.07 },
      { r: 0.82, n: 8, s: 0.06 },
      { r: 1.18, n: 13, s: 0.05 },
    ];
    const C: V3[][] = rings.map((rg, k) =>
      Array.from({ length: rg.n }, (_, m): V3 => {
        const a = (m / rg.n) * Math.PI * 2 + k * 0.4;
        return [Math.cos(a) * rg.r, Math.sin(a) * rg.r, 0];
      }),
    );
    let j = 0;
    const core = share(0.09);
    for (let m = 0; m < core; m++, j++) {
      cluster(0, at(pm, j), [0, 0, 0], 0.09, T);
      bits[at(pm, j)] = (bits[at(pm, j)] as number) | 1;
    }
    const cl = [share(0.11), share(0.15), share(0.17)];
    rings.forEach((rg, k) => {
      for (let m = 0; m < (cl[k] as number); m++, j++) cluster(0, at(pm, j), (C[k] as V3[])[m % rg.n] as V3, rg.s, T);
    });
    const ringN = share(0.05);
    rings.forEach((rg) => {
      for (let m = 0; m < ringN; m++, j++) {
        const a = R() * Math.PI * 2,
          r = rg.r + gauss() * 0.008;
        const p = T(Math.cos(a) * r, Math.sin(a) * r, gauss() * 0.01);
        put(0, at(pm, j), p[0], p[1], p[2]);
      }
    });
    const nearest = (c: V3, pool: V3[]) => {
      let b = pool[0] as V3,
        bd = 1e9;
      for (const q of pool) {
        const d = (q[0] - c[0]) ** 2 + (q[1] - c[1]) ** 2;
        if (d < bd) {
          bd = d;
          b = q;
        }
      }
      return b;
    };
    const C0 = C[0] as V3[],
      C1 = C[1] as V3[],
      C2 = C[2] as V3[];
    const spokes: [V3, V3][] = [];
    C0.forEach((c) => spokes.push([[0, 0, 0], c]));
    C1.forEach((c) => spokes.push([nearest(c, C0), c]));
    C2.forEach((c) => spokes.push([nearest(c, C1), c]));
    const sp = share(0.2);
    for (let m = 0; m < sp; m++, j++) {
      const e = spokes[m % spokes.length] as [V3, V3];
      along(0, at(pm, j), e[0], e[1], 0.01, T);
    }
    for (; j < N; j++) {
      const a = R() * Math.PI * 2,
        y = R() * 2 - 1,
        r = Math.sqrt(1 - y * y) * (1.3 + Math.abs(gauss()) * 0.15);
      put(0, at(pm, j), Math.cos(a) * r, y * 1.35, Math.sin(a) * r);
    }
    for (let k = 0; k < 40; k++) {
      const i = at(pm, (core + (k / 40) * (N - core)) | 0);
      bits[i] = (bits[i] as number) | 1;
    }
  }
  // F1 esteira: a pipeline. Packets flow through scout and executor and cross the verifier gate; what passed is proof
  {
    const pm = perm();
    let j = 0;
    const mov = share(0.34);
    for (; j < mov; j++) put(1, at(pm, j), 0, R(), R() * 2 - 1);
    const n1 = share(0.15),
      n2 = share(0.2),
      n3 = share(0.16),
      n4 = share(0.07);
    for (let m = 0; m < n1; m++, j++) cluster(1, at(pm, j), [STATIC - 0.95, 0, 0], 0.11);
    for (let m = 0; m < n2; m++, j++) cluster(1, at(pm, j), [STATIC + 0, 0, 0], 0.13);
    for (let m = 0; m < n3; m++, j++) {
      put(1, at(pm, j), STATIC + 0.95 + gauss() * 0.015, (R() * 2 - 1) * 0.5, gauss() * 0.03);
      bits[at(pm, j)] = (bits[at(pm, j)] as number) | 2;
    }
    for (let m = 0; m < n4; m++, j++)
      put(1, at(pm, j), STATIC + (R() * 2 - 1) * 1.75, gauss() * 0.006, gauss() * 0.006);
    for (; j < N; j++) cluster(1, at(pm, j), [STATIC + 0, 0, 0], 0.3);
  }
  // F2 desafios: seven countries around one hub; two spokes are lit, the acquisitions that crossed a border
  {
    const pm = perm(),
      T = tiltOf(0.3, 0.15);
    let j = 0;
    const hub: V3 = [0.45, -0.05, 0];
    const reg: V3[] = [
      [-1.1, 0.85, 0],
      [-0.6, 0.35, 0],
      [-0.7, -0.15, 0],
      [-0.45, -0.8, 0],
      [-0.05, -0.75, 0],
      [0.2, -0.6, 0.05],
    ];
    const hn = share(0.12),
      rn = share(0.07),
      en = share(0.04);
    for (let m = 0; m < hn; m++, j++) {
      cluster(2, at(pm, j), hub, 0.09, T);
      bits[at(pm, j)] = (bits[at(pm, j)] as number) | 4;
    }
    reg.forEach((c) => {
      for (let m = 0; m < rn; m++, j++) cluster(2, at(pm, j), c, 0.07, T);
    });
    reg.forEach((c, k) => {
      for (let m = 0; m < en; m++, j++) {
        along(2, at(pm, j), hub, c, 0.01, T);
        if (k === 3 || k === 5) bits[at(pm, j)] = (bits[at(pm, j)] as number) | 4;
      }
    });
    for (; j < N; j++) {
      const p = T(gauss() * 0.75 - 0.3, gauss() * 0.6, gauss() * 0.08);
      put(2, at(pm, j), p[0], p[1], p[2]);
    }
  }
  // F3 security: a radar. A core, a crosshair and three rings hold still (x >= 100); one sweep turns with time (x >= 300: x - 400 is its radius);
  // threats are encoded as (angle, phase, seed): they fly in from outside and are turned away at the outer ring. The tilt happens in the shader
  {
    const pm = perm(),
      BEAM = 400;
    let j = 0;
    const RINGS = [0.42, 0.72, 1.0],
      rn = [share(0.09), share(0.12), share(0.17)];
    const core = share(0.14),
      cross = share(0.05),
      beam = share(0.08),
      thr = share(0.22);
    for (let m = 0; m < core; m++, j++) cluster(3, at(pm, j), [STATIC, 0, 0], 0.11);
    RINGS.forEach((r, k) => {
      for (let m = 0; m < (rn[k] as number); m++, j++) {
        const a = R() * Math.PI * 2,
          q = r + gauss() * 0.007;
        put(3, at(pm, j), STATIC + Math.cos(a) * q, Math.sin(a) * q, gauss() * 0.01);
      }
    });
    for (let m = 0; m < cross; m++, j++) {
      const t = R() * 2 - 1;
      if (m % 2) put(3, at(pm, j), STATIC + t, gauss() * 0.004, gauss() * 0.01);
      else put(3, at(pm, j), STATIC + gauss() * 0.004, t, gauss() * 0.01);
    }
    for (let m = 0; m < beam; m++, j++) put(3, at(pm, j), BEAM + R(), gauss() * 0.006, gauss() * 0.01);
    for (let m = 0; m < thr; m++, j++) put(3, at(pm, j), R() * Math.PI * 2, R(), R());
    for (; j < N; j++) {
      const a = R() * Math.PI * 2,
        r = 1.2 + Math.abs(gauss()) * 0.3;
      put(3, at(pm, j), STATIC + Math.cos(a) * r, Math.sin(a) * r, gauss() * 0.15);
    }
  }
  // F4 infra: four racks of stacked servers hold still on the left and a cloud volume floats on the right (x >= 100);
  // workloads are encoded as (lane, phase, seed): they lift off the rack tops and arc into the cloud, lit as they arrive. The path lives in the shader
  {
    const pm = perm();
    let j = 0;
    const RX = [-1.6, -1.3, -1.0, -0.7],
      SL = 8,
      Y0 = -0.85,
      DY = 0.17;
    const rack = share(0.3),
      cloud = share(0.46),
      stream = share(0.14),
      perSlat = Math.max(1, Math.floor(rack / (RX.length * SL)));
    RX.forEach((rx) => {
      for (let s = 0; s < SL; s++)
        for (let m = 0; m < perSlat; m++, j++)
          put(4, at(pm, j), STATIC + rx + (R() - 0.5) * 0.22, Y0 + s * DY + gauss() * 0.007, gauss() * 0.02);
    });
    const BL: V3[] = [
      [0.3, 0.0, 0.4],
      [0.72, 0.15, 0.5],
      [1.15, -0.02, 0.38],
      [0.58, 0.45, 0.34],
      [0.97, 0.42, 0.3],
    ];
    for (let m = 0; m < cloud; m++, j++) {
      const b = BL[(R() * BL.length) | 0] as V3,
        p: V3 = [b[0] + gauss() * b[2] * 0.45, b[1] + gauss() * b[2] * 0.45, gauss() * b[2] * 0.4];
      if (p[1] < -0.32) p[1] = -0.32 + (p[1] + 0.32) * 0.15;
      put(4, at(pm, j), STATIC + p[0], p[1], p[2]);
      if (R() < 0.1) bits[at(pm, j)] = (bits[at(pm, j)] as number) | 16;
    }
    for (let m = 0; m < stream; m++, j++) put(4, at(pm, j), (R() * RX.length) | 0, R(), R());
    for (; j < N; j++) put(4, at(pm, j), STATIC + gauss() * 1.5 - 0.1, gauss() * 0.9, gauss() * 0.15);
  }
  // F5 initials: VC as square pixels, surplus particles in a faint halo
  const INIT_H = 1.5;
  const { cells, w: IW, h: IH } = initials;
  const pm = perm(),
    cell = INIT_H / IH,
    per = Math.max(1, Math.floor((N * 0.86) / Math.max(1, cells.length)));
  const cols = Math.ceil(Math.sqrt(per)),
    rows = Math.ceil(per / cols);
  let j = 0;
  for (const [c, r] of cells) {
    for (let q = 0; q < per && j < N; q++, j++) {
      const gy = Math.floor(q / cols),
        inRow = gy === rows - 1 ? per - cols * (rows - 1) : cols,
        gx = q - gy * cols,
        i = at(pm, j);
      put(
        5,
        i,
        (c - (IW - 1) / 2) * cell + ((gx + 0.5) / inRow - 0.5) * cell * 0.9,
        ((IH - 1) / 2 - r) * cell + ((gy + 0.5) / rows - 0.5) * cell * 0.9,
        (R() - 0.5) * 0.02,
      );
      bits[i] = (bits[i] as number) | 32;
    }
  }
  for (; j < N; j++) {
    const a = R() * Math.PI * 2,
      rad = 1.25 + Math.abs(gauss()) * 0.35;
    put(5, at(pm, j), Math.cos(a) * rad * 1.1, Math.sin(a) * rad * 0.7, gauss() * 0.15);
  }
  const sub = Math.min(cols, rows),
    overlap = per * (1.3 / sub) ** 2;
  return { P, mask: Float32Array.from(bits), rnd, initSub: sub, initDarkAlpha: Math.min(1, 1.1 / overlap), INIT_H, IH };
}
