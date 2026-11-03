// @ts-check
import { defineConfig } from 'astro/config';

// Served by GitHub Pages as a project site, so every URL lives under /my_profile/.
export default defineConfig({
  site: 'https://vhmcaldeira7.github.io',
  base: '/my_profile/',
  trailingSlash: 'always',
  output: 'static',
  // Scoped styles keep the selector specificity of a plain class, so the cascade matches a single global sheet.
  scopedStyleStrategy: 'where',
});
