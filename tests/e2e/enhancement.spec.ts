import { expect, test } from '@playwright/test';

const routes = [
  { path: '', canonical: 'https://vhmcaldeira7.github.io/my_profile/' },
  { path: 'en/', canonical: 'https://vhmcaldeira7.github.io/my_profile/en/' },
  { path: 'es/', canonical: 'https://vhmcaldeira7.github.io/my_profile/es/' },
] as const;

for (const r of routes)
  test(`/${r.path} declares its own canonical URL`, async ({ page }) => {
    await page.goto(r.path);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', r.canonical);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', r.canonical);
  });

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('renders every figure in its final static state', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.goto('');
    await page.mouse.wheel(0, 400);
    await expect(page.locator('#flow-esteira .flow__stage svg')).toHaveCount(1);
    await expect(page.locator('#flow-esteira .fn')).toHaveCount(14);
    await expect(page.locator('#flow-esteira .fn--gate.is-on')).toHaveCount(5);
    await expect(page.locator('#latam .lm-c--on.is-on')).toHaveCount(7);
    await expect(page.locator('#certs .cert.is-on')).toHaveCount(4);
    await expect(page.locator('#infra .infra__n')).toHaveText('R$ 15 M');
    await expect(page.locator('#infra .meter__n')).toHaveText(['−60%', '−40%', '−50%']);
    // no timeline runs and the particle canvas stays hidden
    await expect(page.locator('.flow.is-live, .latam.is-live, .certs.is-live, .infra.is-live')).toHaveCount(0);
    await expect(page.locator('#signal')).toBeHidden();
    expect(await page.evaluate(() => window.__state.F.length)).toBe(0);
    expect(errors).toEqual([]);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('shows the content and the sphere terms as a plain list', async ({ page }) => {
    await page.goto('en/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#caso-esteira .panel__title')).toBeVisible();
    await expect(page.locator('#latam .latam__stage svg')).toBeVisible();
    const chips = page.locator('#orbit ul.orbit__tags > li');
    await expect(chips).toHaveCount(43);
    await expect(chips.first()).toBeVisible();
    await expect(page.locator('#metodo')).not.toHaveClass(/is-live/);
    await expect(page.locator('.contact__link a')).toBeVisible();
  });
});

test('the copy button confirms and announces the copy, then resets', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('');
  const button = page.locator('#copy');
  await button.scrollIntoViewIfNeeded();
  await expect(button).toHaveText('Copiar o link');
  await button.click();
  await expect(button).toHaveText('Copiado');
  await expect(button).toHaveAttribute('data-state', 'copied');
  await expect(page.locator('#copy-status')).toHaveText('Copiado');
  await expect(page.locator('#copy-status')).toHaveAttribute('aria-live', 'polite');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'https://www.linkedin.com/in/victor-hugo-caldeira/',
  );
  await expect(button).toHaveText('Copiar o link', { timeout: 4000 });
  await expect(page.locator('#copy-status')).toHaveText('');
});

test('switching language keeps the current section', async ({ page }) => {
  await page.goto('#trajetoria');
  await page.locator('.lang a[data-locale="en"]').click();
  await expect(page).toHaveURL(/\/my_profile\/en\/#trajetoria$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

for (const l of ['en', 'es'] as const)
  test(`legacy /?lang=${l} redirects to /${l}/`, async ({ page }) => {
    await page.goto(`?lang=${l}`);
    await expect(page).toHaveURL(new RegExp(`/my_profile/${l}/$`));
    await expect(page.locator('html')).toHaveAttribute('lang', l);
  });

test('unknown paths get the 404 page with links to the three routes', async ({ page }) => {
  const res = await page.goto('no-such-page/');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Victor Caldeira');
  await expect(page.locator('main a')).toHaveCount(3);
  for (const [i, href] of ['/my_profile/', '/my_profile/en/', '/my_profile/es/'].entries())
    await expect(page.locator('main a').nth(i)).toHaveAttribute('href', href);
});
