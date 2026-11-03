# 4. Testing strategy

- Status: accepted
- Date: 2026-11-02

## Context

A portfolio is tested by eye, but this one is also a showcase of how its owner ships software. Each claim, from "works in three languages" to "no layout overflow on a phone", should have a check that fails when it breaks.

## Decision

Use four layers, each checking what it can see best:

| Layer      | Tool                                | Checks                                                                                                                                                                                                                                   |
| ---------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static     | ESLint, Prettier, `astro check`     | types, templates, style                                                                                                                                                                                                                  |
| Unit       | Vitest                              | pure modules (sphere math, flow geometry, formatting, seeded formations) and dictionary completeness                                                                                                                                     |
| End to end | Playwright + `@axe-core/playwright` | the built preview under `/my_profile/`, on `/`, `/en/` and `/es/`, at 1440×900 and 390×844: console errors, horizontal overflow, the sphere's 43 chips (12 starred), language links, hreflang, and no serious or critical axe violations |
| Budget     | Lighthouse CI                       | median of 3 runs per route; minimum scores in the README                                                                                                                                                                                 |

All of them run in CI on every PR. A PR is done when CI is green.

## Consequences

- Visual fidelity is not part of CI. It was proven once, during the migration, with a section-by-section pixel diff against the prototype (Playwright + pixelmatch, 78 comparisons, 0 px), plus a manual check with motion in a GPU browser.
- Headless browsers render WebGL in software, so CI never exercises the particle scene. Its pure parts are unit-tested, and the rendered scene still needs a manual check.
