import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const routes = [
  { locale: 'pt', path: '', lang: 'pt-BR', contact: 'Contato' },
  { locale: 'en', path: 'en/', lang: 'en', contact: 'Contact' },
  { locale: 'es', path: 'es/', lang: 'es', contact: 'Contacto' },
] as const;

/** Reads the page the way a visitor does: wakes the motion layer, then walks down to the footer. */
async function readThrough(page: Page) {
  await page.mouse.wheel(0, 200);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(400);
}

for (const route of routes) {
  test.describe(`/${route.path}`, () => {
    test('loads with no console errors and no horizontal overflow', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(route.path, { waitUntil: 'load' });
      await expect(page.locator('html')).toHaveAttribute('lang', route.lang);
      await readThrough(page);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBe(clientWidth);
      expect(errors).toEqual([]);
    });

    test('renders the skills sphere with 43 chips, 12 starred', async ({ page }) => {
      await page.goto(route.path);
      await page.locator('#metodo').scrollIntoViewIfNeeded();
      await expect(page.locator('#metodo')).toHaveClass(/is-live/);
      await expect(page.locator('.orbit__tags li')).toHaveCount(43);
      await expect(page.locator('.orbit__tags li[data-big]')).toHaveCount(12);
    });

    test('links each language to its route and marks the current one', async ({ page }) => {
      await page.goto(route.path);
      const links = page.locator('.lang a');
      await expect(links).toHaveCount(3);
      await expect(links.nth(0)).toHaveAttribute('href', '/my_profile/');
      await expect(links.nth(1)).toHaveAttribute('href', '/my_profile/en/');
      await expect(links.nth(2)).toHaveAttribute('href', '/my_profile/es/');
      await expect(page.locator('.lang a[aria-current="page"]')).toHaveAttribute('data-locale', route.locale);
      await expect(page.locator('.nav__contact')).toHaveText(route.contact);
      for (const l of routes)
        await expect(page.locator(`link[rel="alternate"][hreflang="${l.lang}"]`)).toHaveAttribute(
          'href',
          `https://vhmcaldeira7.github.io/my_profile/${l.path}`,
        );
    });

    test('has no serious or critical accessibility violations', async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'load' });
      await readThrough(page);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      const { violations } = await new AxeBuilder({ page }).analyze();
      const blocking = violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
      expect(blocking).toEqual([]);
    });
  });
}

test('switching language follows the link to the matching route', async ({ page }) => {
  await page.goto('');
  await page.locator('.lang a[data-locale="es"]').click();
  await expect(page).toHaveURL(/\/my_profile\/es\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});
