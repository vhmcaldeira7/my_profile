/** The certs timeline: the rail draws once and lights the four marks in order; the SOC ring then pulses while on screen. */
import type { Gsap } from '../motion-types';

export interface CertsFigure {
  play(gsap: Gsap): () => void;
}

export function initCerts(fig: HTMLElement): CertsFigure {
  const track = fig.querySelector<HTMLElement>('.certs__track');
  if (!track) throw new Error('certs: missing track');
  const items = [...track.querySelectorAll('.cert')];
  const ring = track.querySelector('.cert__ring');
  const P = { d: 0 };
  const render = () => {
    track.style.setProperty('--draw', String(P.d));
    items.forEach((li, i) => li.classList.toggle('is-on', P.d >= (i + 0.5) / items.length));
  };
  const setStatic = (gsap?: Gsap) => {
    P.d = 1;
    render();
    gsap?.set(ring, { opacity: 0, attr: { r: 8 } });
  };
  const play = (gsap: Gsap) => {
    fig.classList.add('is-live');
    P.d = 0;
    const pulse = gsap.fromTo(
      ring,
      { attr: { r: 8 }, opacity: 0.9 },
      { attr: { r: 19 }, opacity: 0, duration: 1.3, ease: 'power2.out', repeat: -1, repeatDelay: 1.4, paused: true },
    );
    const draw = gsap.to(P, {
      d: 1,
      duration: items.length * 0.55,
      ease: 'none',
      paused: true,
      onUpdate: render,
      onComplete: () => void pulse.play(),
    });
    render();
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        if (draw.progress() < 1) draw.play();
        else pulse.play();
      } else {
        draw.pause();
        pulse.pause();
      }
    });
    io.observe(fig);
    return () => {
      io.disconnect();
      draw.kill();
      pulse.kill();
      fig.classList.remove('is-live');
      setStatic(gsap);
    };
  };
  setStatic();
  return { play };
}
