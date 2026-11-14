import { readFileSync } from 'node:fs';
import { expect, test } from './fixtures.ts';
import { engineUrl, mockEngine } from './engine-mock.ts';
import en from '../../src/locales/en.json' with { type: 'json' };

const arXB = JSON.parse(
  readFileSync('tests/fixtures/locales/ar-XB.json', 'utf8'),
) as typeof en;
const tauriConf = JSON.parse(
  readFileSync('src-tauri/tauri.conf.json', 'utf8'),
) as { app: { security: { csp: string } } };

test.describe('English', () => {
  test('sets the title, lang and dir from the catalog', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(en.app.name);
    await expect(page.getByText(en.app.name, { exact: true })).toBeVisible();
    await expect(page.getByText(en.app.preReleaseNotice)).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute(
      'dir',
      en.meta.direction,
    );
  });

  test('serves the content security policy from tauri.conf.json', async ({
    page,
  }) => {
    const response = await page.goto('/');
    expect(response?.headers()['content-security-policy']).toBe(
      tauriConf.app.security.csp,
    );
  });
});

test.describe('right-to-left pseudo-locale', () => {
  test('follows the ar-XB catalog, lang and dir', async ({ page }) => {
    // Not Playwright's locale option: WebKit on macOS drops a private-use region such as XB.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'language', {
        get: () => 'ar-XB',
        configurable: true,
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['ar-XB'],
        configurable: true,
      });
    });
    await mockEngine(page);
    await page.goto(engineUrl);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar-XB');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page).toHaveTitle(arXB.app.name);
    await expect(page.getByText(arXB.app.name, { exact: true })).toBeVisible();
    await expect(page.getByText(arXB.app.preReleaseNotice)).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: arXB.nav.label }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      arXB.nav.watchlists,
    );
  });
});
