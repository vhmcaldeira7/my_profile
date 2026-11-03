/** Sphere math for the skills orbit. Pure functions, unit-tested. */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Point `i` of `n` evenly spread on the unit sphere (Fibonacci lattice), from the top pole down. */
export function fibonacciPoint(i: number, n: number): Vec3 {
  const y = 1 - ((i + 0.5) / n) * 2,
    r = Math.sqrt(1 - y * y);
  return { x: Math.cos(GOLDEN_ANGLE * i) * r, y, z: Math.sin(GOLDEN_ANGLE * i) * r };
}

export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/**
 * Assigns every item to a lattice slot. Starred items sit on evenly spaced slots so they ring the whole sphere;
 * the rest fill the gaps with a stride coprime with their count, so neighbours in the list never bunch together.
 * Returns, for each slot, the index of the item placed there.
 */
export function assignSlots(starred: readonly boolean[]): number[] {
  const n = starred.length;
  const big = starred.flatMap((s, i) => (s ? [i] : []));
  const rest = starred.flatMap((s, i) => (s ? [] : [i]));
  const slots: (number | null)[] = new Array<number | null>(n).fill(null);
  big.forEach((item, j) => {
    slots[Math.floor(((j + 0.5) * n) / big.length)] = item;
  });
  let stride = Math.max(1, Math.round(rest.length * 0.382));
  while (rest.length > 1 && gcd(stride, rest.length) !== 1) stride++;
  const open = slots.flatMap((v, i) => (v === null ? [i] : []));
  rest.forEach((item, j) => {
    slots[open[(j * stride) % rest.length] as number] = item;
  });
  return slots as number[];
}

/** Turns every point by `a` around the vertical axis, then by `b` around the horizontal one (in place). */
export function rotate(points: Iterable<Vec3>, a: number, b: number): void {
  const ca = Math.cos(a),
    sa = Math.sin(a),
    cb = Math.cos(b),
    sb = Math.sin(b);
  for (const p of points) {
    const x = p.x * ca + p.z * sa,
      z = p.z * ca - p.x * sa;
    p.x = x;
    p.z = z * cb - p.y * sb;
    p.y = p.y * cb + z * sb;
  }
}

/** Perspective scale of a point at depth z (-1 back .. 1 front) for a camera at distance `d`. */
export const perspective = (z: number, d: number): number => (d - 1) / (d - z);
