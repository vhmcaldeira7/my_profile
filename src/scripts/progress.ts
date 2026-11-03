/** Scroll progress bar fallback where CSS scroll-driven animations are unsupported. */
export function initProgressFallback(bar: HTMLElement | null): () => void {
  if (!bar || CSS.supports('animation-timeline: scroll()')) return () => {};
  let queued = 0;
  const paint = () => {
    queued = 0;
    const p = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight);
    bar.style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`;
  };
  const onScroll = () => {
    queued ||= requestAnimationFrame(paint);
  };
  addEventListener('scroll', onScroll, { passive: true });
  paint();
  return () => {
    removeEventListener('scroll', onScroll);
    cancelAnimationFrame(queued);
  };
}
