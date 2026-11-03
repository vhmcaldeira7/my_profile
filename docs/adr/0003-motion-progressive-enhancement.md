# 3. Animation as progressive enhancement, with reduced-motion parity

- Status: accepted
- Date: 2026-11-02

## Context

The page's identity is its motion: a three.js point cloud that morphs through six formations as the reader scrolls, pinned case panels, a career pan and four animated figures. It must not cost the content anything, whether on slow devices, on software-rendered WebGL or for visitors who ask for less motion.

## Decision

Split behaviour into typed modules, each with an `init` that returns `destroy` or a `play(gsap)` that returns `stop`. Load them in layers, following the prototype's gates:

1. **Immediately:** the copy button, the progress-bar fallback and the static state of every figure.
2. **On first interaction** (scroll, wheel, touch, pointer, key): GSAP, ScrollTrigger and Lenis, imported dynamically. `gsap.matchMedia` owns the pinning, the pan and the timelines, and undoes them when its conditions stop matching.
3. **After `load`, on idle:** the particle scene, as its own chunk, only on hardware WebGL2. Software renderers get the `no-webgl` class instead.
4. **As the section nears:** the skills sphere.

Pure logic is kept out of the DOM modules so it can be unit-tested: Fibonacci slot assignment, the flow geometry, number formatting and the seeded formations.

With `prefers-reduced-motion: reduce`, layers 2 and 3 wait until the preference changes. The canvas is hidden in CSS, the figures stay in their final static state, and the sphere only turns when dragged. This matches the prototype.

## Consequences

- With JavaScript off, or with reduced motion, visitors still get every word and a meaningful static figure.
- The libraries come from npm and are pinned in `package-lock.json`. No CDN code runs.
- Layers coordinate through a small shared state object (`scripts/state.ts`, also `window.__state`) rather than imports, so each one can be removed on its own.
