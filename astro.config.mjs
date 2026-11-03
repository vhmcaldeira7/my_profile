// @ts-check
import { defineConfig } from 'astro/config';

// Served by GitHub Pages on the custom domain, at its root. Code reads the base from import.meta.env.BASE_URL.
export default defineConfig({
  site: 'https://victorcaldeira.com',
  base: '/',
  trailingSlash: 'always',
  output: 'static',
  // Scoped styles keep the selector specificity of a plain class, so the cascade matches a single global sheet.
  scopedStyleStrategy: 'where',
  // Keep the whitespace between inline elements as written: it shapes line breaks exactly like the prototype.
  compressHTML: false,
  vite: {
    // three.js is one lazily imported chunk (~550 kB raw, ~140 kB gzip), loaded after idle on hardware WebGL2 only.
    build: { chunkSizeWarningLimit: 600 },
  },
});
