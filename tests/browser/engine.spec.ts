import type { Route } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import type { components } from '../../src/api/schema.ts';
import en from '../../src/locales/en.json' with { type: 'json' };

const engineOrigin = 'http://127.0.0.1:4999';
const appOrigin = 'http://127.0.0.1:4173';

const info: components['schemas']['InfoDocument'] = {
  api_versions: ['v1'],
  engine_version: '4.5.6',
  locales: [{ tag: 'en', name: 'English' }],
  schema_version: 2,
  sec_identity_configured: false,
};

const corsHeaders = {
  'Access-Control-Allow-Origin': appOrigin,
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, Accept-Language',
  'Access-Control-Allow-Methods': 'GET',
  Vary: 'Origin',
};

test.describe('analysis engine section', () => {
  test('shows /v1/info from the engine named in the URL fragment', async ({
    page,
  }) => {
    const requests: Record<string, string>[] = [];
    await page.route(`${engineOrigin}/**`, async (route: Route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }
      requests.push(await request.allHeaders());
      await route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Language': 'en',
        },
        body: JSON.stringify(info),
      });
    });

    await page.goto(`/#engine=${engineOrigin}&token=test-token`);

    await expect(
      page.getByRole('heading', { name: en.engine.heading }),
    ).toBeVisible();
    const list = page.locator('dl');
    await expect(list).toContainText('4.5.6');
    await expect(list).toContainText('v1');
    await expect(list).toContainText(en.engine.secIdentity.notConfigured);
    await expect(list).toContainText('English');
    await expect(list).toHaveAttribute('lang', 'en');
    expect(requests).toHaveLength(1);
    expect(requests[0]?.authorization).toBe('Bearer test-token');
    expect(requests[0]?.['accept-language']).toBe('en');
    expect(new URL(page.url()).hash).toBe('');
  });

  test('says no engine is connected when there is no fragment, and makes no request', async ({
    page,
  }) => {
    const requests: string[] = [];
    await page.route(`${engineOrigin}/**`, (route) => {
      requests.push(route.request().url());
      return route.abort();
    });

    await page.goto('/');

    await expect(page.getByText(en.engine.noEngine)).toBeVisible();
    expect(requests).toEqual([]);
  });
});
