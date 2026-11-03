/**
 * Lighthouse CI against the built site (mobile emulation, Lighthouse defaults), median of 3 runs per route.
 * Thresholds are documented in the README; see "Quality gates".
 */
const base = 'http://127.0.0.1:4322/my_profile/';

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview -- --host 127.0.0.1 --port 4322',
      startServerReadyPattern: 'Local',
      url: [base, `${base}en/`, `${base}es/`],
      numberOfRuns: 3,
      settings: { chromeFlags: '--no-sandbox' },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.85, aggregationMethod: 'median-run' }],
        'categories:accessibility': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
        'categories:best-practices': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
        'categories:seo': ['error', { minScore: 0.95, aggregationMethod: 'median-run' }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
