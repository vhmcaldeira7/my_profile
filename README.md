# my_profile

Victor Caldeira's personal portfolio: a single page about delivering software with teams and AI agents, in Portuguese, English and Spanish. It is a static Astro site. The page is complete as plain HTML and CSS; a particle field, scroll-driven motion and animated figures are layered on top when the device and the visitor's motion preference allow it.

**Live:** https://victorcaldeira.com/ ([EN](https://victorcaldeira.com/en/) · [ES](https://victorcaldeira.com/es/))

## Stack

- [Astro](https://astro.build) 7, `output: 'static'`, TypeScript on the `strictest` preset
- [three.js](https://threejs.org) for the particle field, with custom GLSL shaders
- [GSAP](https://gsap.com) + ScrollTrigger for the scroll choreography and figure timelines, [Lenis](https://lenis.darkroom.engineering) for smooth scrolling
- Fonts self-hosted from [Fontsource](https://fontsource.org) (Bricolage Grotesque, Geist, Geist Mono), so the site makes no third-party requests
- Vitest, Playwright, axe-core and Lighthouse CI for tests
- ESLint (typescript-eslint, eslint-plugin-astro), Prettier and `astro check` for linting and type checks
- GitHub Actions builds and tests every PR and deploys to GitHub Pages

## Architecture

```
src/
├── pages/                 # one route per locale: / (pt), /en/, /es/
├── layouts/Layout.astro   # <html lang>, head (canonical, hreflang), skip link, canvas, nav, footer, boot script
├── components/            # one component per section, scoped styles
│   ├── Hero, Offers, Cases, Career, Skills, Voices, Contact, Nav, Footer, HomePage
│   └── cases/             # Esteira (flow), Desafios (LATAM map), Security (certs), Infra
├── i18n/                  # pt.json (reference), en.json, es.json, typed t() and route helpers
├── data/skills.ts         # the 43 terms of the "Experience with" sphere
├── styles/                # tokens (dark + light), base, shared case-figure primitives, pointer fx
└── scripts/               # progressive enhancement, one module per behaviour
    ├── main.ts            # boot: what starts when, and under which conditions
    ├── scroll.ts          # GSAP + ScrollTrigger + Lenis orchestration
    ├── particles/         # scene (three.js), formations (seeded, pure), shaders
    ├── figures/           # flow, latam, certs, infra; flow-layout.ts holds the pure geometry
    ├── orbit/             # the skills sphere; fibonacci.ts holds the pure sphere math
    └── format.ts, pointer-fx.ts, copy-button.ts, progress.ts, state.ts
tests/
├── unit/                  # Vitest: pure modules and dictionary completeness
└── e2e/                   # Playwright + axe against the built preview
docs/adr/                  # architecture decisions
```

Layers share state only through `scripts/state.ts`, which is also exposed as `window.__state`. The scroll layer writes formation progress there and the particle layer reads it. Neither imports the other.

## Run, test, build

Node 22 (Astro 7 needs at least 22.23.4; see `.nvmrc`).

```sh
npm ci
npm run dev              # http://localhost:4321/
npm run build            # static output in dist/
npm run preview          # serve dist/ locally

npm run lint             # ESLint
npm run format:check     # Prettier
npm run check            # astro check (TypeScript + templates)
npm test                 # Vitest unit tests
npm run test:e2e         # Playwright + axe (build first; starts its own preview server)
npm run test:lighthouse  # Lighthouse CI (build first)
```

The first Playwright run needs `npx playwright install chromium`.

## Quality gates

Every PR and every push to `main` runs `.github/workflows/ci.yml`:

| Job        | What it checks                                                                                                                                                                                                                                                                                                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| quality    | ESLint, Prettier, `astro check`, Vitest, `astro build`                                                                                                                                                                                                                                                                                                                                  |
| e2e        | `/`, `/en/`, `/es/` at 1440×900 and 390×844: no console errors, no horizontal overflow, 43 sphere chips with 12 starred, language links and canonicals, hreflang alternates, no serious or critical axe violations; plus reduced motion (static figures), no JavaScript (content and the terms list), the copy button, the language hash, the legacy `?lang=` redirect and the 404 page |
| lighthouse | Median of 3 runs per route, mobile emulation                                                                                                                                                                                                                                                                                                                                            |

Lighthouse minimum scores:

| Category       | Minimum | Last local run |
| -------------- | ------- | -------------- |
| Performance    | 0.85    | 0.96–0.99      |
| Accessibility  | 0.95    | 1.00           |
| Best practices | 0.95    | 1.00           |
| SEO            | 0.95    | 1.00           |

Performance is held at 0.85 rather than higher on purpose. CI runners are noisy, and the page is built around a WebGL scene. Headless Chrome renders WebGL in software, and the boot code skips the particle field on software renderers, so Lighthouse measures the page without the 3D scene. The scene is a separate lazy chunk (~140 kB gzip) that loads after `load`, on idle, and only on hardware WebGL2.

`deploy.yml` runs only after a CI run on a push to `main` succeeds. It checks out the commit CI tested, builds it and publishes `dist/` with `actions/deploy-pages`. A manual run is accepted from `main` only. Only the deploy job gets `pages: write` and `id-token: write`. Every action is pinned to a commit SHA, and CI builds `dist/` once and shares it with the e2e and Lighthouse jobs.

## Internationalisation

- Each language is a real route: PT at `/`, EN at `/en/`, ES at `/es/`. The switcher in the nav links to the matching route; with JavaScript, it also keeps the current section (`#hash`). The prototype's `/?lang=en|es` links redirect to the route, and unknown paths get a 404 page linking to all three. Each page sets `<html lang>`, a canonical URL and `hreflang` alternates, including `x-default`.
- The copy lives in `src/i18n/{pt,en,es}.json` with identical keys. PT is the reference. `useTranslations(locale)` returns a `t()` typed to the PT keys. A unit test fails when EN or ES is missing a PT key or has an extra one.
- Labels the scripts draw at runtime, such as the flow figure's steps and the copy button's states, are rendered into `data-*` attributes from the route's dictionary.
- Proper names, the sphere's terms and the recommendation quotes are not translated. The quotes stay in the language they were written in, marked with `lang`.

## Decisions

See [`docs/adr/`](docs/adr):

1. [Static site with Astro](docs/adr/0001-astro-static.md)
2. [Route-based i18n](docs/adr/0002-route-based-i18n.md)
3. [Animation as progressive enhancement](docs/adr/0003-motion-progressive-enhancement.md)
4. [Testing strategy](docs/adr/0004-testing-strategy.md)
