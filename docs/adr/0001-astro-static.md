# 1. Static site with Astro

- Status: accepted
- Date: 2026-11-02

## Context

The portfolio began as a single HTML file, about 2,000 lines of markup, CSS and inline scripts, and that file worked. It has no server-side data, no forms and no sign-in. Hosting is GitHub Pages, which only serves static files. The repository is meant to be read, so its structure matters as much as the output.

## Decision

Use Astro with `output: 'static'` and TypeScript on the `strictest` preset.

- Each section is an `.astro` component with scoped styles. `scopedStyleStrategy: 'where'` keeps the specificity of a plain class, so the cascade behaves like the original single stylesheet.
- Client behaviour lives in plain TypeScript modules under `src/scripts/`, bundled by Vite and loaded from one `<script>` in the layout. There is no UI framework runtime.
- `site` and `base` target `https://vhmcaldeira7.github.io/my_profile/`.
- `compressHTML` is off, so the whitespace between inline elements stays as written and line breaks match the prototype pixel for pixel.

## Consequences

- The output is plain HTML and CSS per route. JavaScript only enhances, and it ships no component runtime.
- Components give the prototype a reviewable structure without changing a pixel. A section-by-section pixel comparison against the prototype shows 0 px of difference.
- Styles for nodes that scripts create at runtime, such as the flow figure's SVG and the pointer effects, have to be global or reached through `:global()`.
