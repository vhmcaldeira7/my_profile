/** Number formatting shared by the animated figures. Pure, so the counters can be unit-tested. */

/** Splits a counter like "100+" into its number and the text that follows it. */
export function parseCounter(text: string): { n: number; suffix: string } {
  return { n: parseInt(text, 10), suffix: text.replace(/^\d+/, '') };
}

/** A counter frame: the rounded value followed by the original suffix ("37+"). */
export function formatCounter(value: number, suffix: string): string {
  return Math.round(value) + suffix;
}

/** The budget readout while it counts up: progress 0..1 of a total in millions of reais. */
export function formatBudget(progress: number, millions: number): string {
  return `R$ ${Math.round(progress * millions)} M`;
}

/** A cost-cut readout: the share cut (0..1) scaled by the animation progress, with a typographic minus. */
export function formatCut(cut: number, progress: number): string {
  return `−${Math.round(cut * 100 * progress)}%`;
}

/**
 * Order in which the rack slats switch off: row by row across the racks (top slat of every rack first),
 * so the three racks drain together. `perRack` slats per rack, `count` slats in total.
 */
export function drainOrder(count: number, perRack: number): number[] {
  return Array.from({ length: count }, (_, i) => i).sort((a, b) => (a % perRack) - (b % perRack) || a - b);
}
