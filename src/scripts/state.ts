/**
 * Shared state: the scroll layer writes here, the particle layer and the pointer layer read it. No layer imports another.
 * Exposed on window.__state so automation (and a curious reader in devtools) can reach Lenis and the formation progress.
 */
export interface Lenisish {
  destroy(): void;
}

export interface SharedState {
  /** Formation tweens: their summed progress picks which particle formation shows. */
  F: { v: number }[];
  /** Dimmers: functions whose sum (0..1) fades the particles behind text-heavy sections. */
  D: (() => number)[];
  pan: unknown;
  /** Last click, for the particle ripple. */
  pulse: { x: number; y: number; t: number } | null;
  lenis: Lenisish | null;
}

declare global {
  interface Window {
    __state: SharedState;
  }
}

export const state: SharedState = { F: [], D: [], pan: null, pulse: null, lenis: null };
window.__state = state;

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
export const finePointer = (): boolean => matchMedia('(pointer: fine)').matches;
