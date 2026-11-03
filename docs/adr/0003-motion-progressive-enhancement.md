# 3. Animation as progressive enhancement, with reduced-motion parity

- Status: accepted
- Date: 2026-11-02

## Context

The page's identity is its motion: a three.js point cloud that morphs through six formations as the reader scrolls, pinned case panels, a career pan and four animated figures. It must not cost the content anything, whether on slow devices, on software-rendered WebGL or for visitors who ask for less motion.

## Decision

Split behaviour into typed modules. Each one has an `init` that returns a disposer, or a `play(gsap)` that returns a `stop`. `main.ts` starts every module inside its own guard, so one failure is logged with `console.error` and the rest still start. It collects the disposers and runs them on `pagehide`. The scroll layer's disposer reverts its `gsap.matchMedia`, which also stops the figure timelines. Load the modules in layers, following the prototype's gates:

1. **Immediately:** the language-switch helper, the copy button, the progress-bar fallback and the static state of every figure.
2. **On first interaction** (scroll, wheel, touch, pointer, key): GSAP, ScrollTrigger and Lenis, imported dynamically. `gsap.matchMedia` owns the pinning, the pan and the timelines, and undoes them when its conditions stop matching.
3. **After `load`, on idle:** the particle scene, as its own chunk, only on hardware WebGL2. Software renderers get the `no-webgl` class instead.
4. **As the section nears:** the skills sphere.

Pure logic is kept out of the DOM modules so it can be unit-tested: Fibonacci slot assignment, the flow geometry, number formatting and the seeded formations.

With `prefers-reduced-motion: reduce`, layers 2 and 3 wait until the preference changes. The canvas is hidden in CSS, the figures stay in their final static state, and the sphere only turns when dragged. This matches the prototype.

## Consequences

- With reduced motion, visitors get every word and every figure in its final static state.
- With JavaScript off, visitors get every word, the LATAM map, the certifications rail, the infrastructure figure in its final markup state, and the sphere's 43 terms as a plain wrapped list. They do not get the esteira flow diagram, because its SVG is drawn by script; its caption and the step-by-step list for screen readers remain. The copy button does nothing, but the LinkedIn link next to it still works.
- The libraries come from npm and are pinned in `package-lock.json`. No CDN code runs.
- Layers coordinate through a small shared state object (`scripts/state.ts`, also `window.__state`) rather than imports, so each one can be removed on its own.
