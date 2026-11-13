import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { engineUrl, mockEngine } from './engine-mock.ts';
import { coreId } from '../fixtures/api/data.ts';
import { failure, ok } from '../fixtures/api/server.ts';
import en from '../../src/locales/en.json' with { type: 'json' };

// Intl separates times and ranges with narrow spaces; compare with plain ones.
const plain = (text: string) =>
  text.replace(new RegExp('[\u00a0\u2009\u202f]', 'g'), ' ').trim();

async function cells(row: Locator): Promise<string[]> {
  return (await row.locator('th, td').allInnerTexts()).map((text) =>
    plain(text),
  );
}

const rows = (page: Page) => page.locator('tbody tr');

async function open(page: Page, handler?: Parameters<typeof mockEngine>[1]) {
  const engine = await mockEngine(page, handler);
  await page.goto(engineUrl);
  return engine;
}

test.describe('shell and navigation', () => {
  test('starts on Watchlists with a persistent navigation and breadcrumb', async ({
    page,
  }) => {
    await open(page);
    const nav = page.getByRole('navigation', { name: en.nav.label });
    await expect(nav.getByRole('link')).toHaveText([
      en.nav.watchlists,
      en.nav.refreshes,
      en.nav.runs,
      en.nav.about,
    ]);
    await expect(
      nav.getByRole('link', { name: en.nav.watchlists }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(page.getByText(en.app.preReleaseNotice)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      en.nav.watchlists,
    );
    const crumb = page.getByRole('navigation', { name: en.breadcrumb.label });
    await expect(crumb).toHaveText(en.nav.watchlists);
    expect(new URL(page.url()).hash).toBe('');
  });

  test('moves between screens and shows the breadcrumb of each', async ({
    page,
  }) => {
    await open(page);
    const nav = page.getByRole('navigation', { name: en.nav.label });
    for (const label of [en.nav.refreshes, en.nav.runs, en.nav.about]) {
      await nav.getByRole('link', { name: label }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(label);
      await expect(nav.getByRole('link', { name: label })).toHaveAttribute(
        'aria-current',
        'page',
      );
      await expect(
        page.getByRole('navigation', { name: en.breadcrumb.label }),
      ).toHaveText(label);
    }
  });

  test('shows the About screen with /v1/info from the engine in the fragment', async ({
    page,
  }) => {
    const engine = await open(page);
    await page
      .getByRole('navigation', { name: en.nav.label })
      .getByRole('link', { name: en.nav.about })
      .click();
    await expect(
      page.getByRole('heading', { name: en.engine.heading }),
    ).toBeVisible();
    const list = page.locator('dl');
    await expect(list).toContainText('4.5.6');
    await expect(list).toContainText('v1');
    await expect(list).toContainText(en.engine.secIdentity.notConfigured);
    await expect(list).toContainText('English');
    await expect(page.locator('dd').last()).toHaveAttribute('lang', 'en');
    const [request] = engine.requests.filter(
      (r) => r.url.pathname === '/v1/info',
    );
    expect(request?.headers.authorization).toBe('Bearer test-token');
    expect(request?.headers['accept-language']).toBe('en');
  });

  test('says no engine is connected on every screen, keeps the navigation, and makes no request', async ({
    page,
  }) => {
    const requests: string[] = [];
    await page.route('http://127.0.0.1:4999/**', (route) => {
      requests.push(route.request().url());
      return route.abort();
    });
    await page.goto('/');
    await expect(page.getByRole('status')).toHaveText(en.engine.noEngine);
    const nav = page.getByRole('navigation', { name: en.nav.label });
    for (const label of [en.nav.refreshes, en.nav.runs, en.nav.about]) {
      await nav.getByRole('link', { name: label }).click();
      await expect(page.getByRole('status')).toHaveText(en.engine.noEngine);
    }
    expect(requests).toEqual([]);
  });
});

test.describe('watchlists', () => {
  test('lists each watchlist with its entry count and times', async ({
    page,
  }) => {
    await open(page);
    await expect(page.locator('thead th')).toHaveText([
      en.watchlists.columns.name,
      en.watchlists.columns.entries,
      en.watchlists.columns.created,
      en.watchlists.columns.updated,
    ]);
    await expect
      .poll(() => cells(rows(page).nth(0)))
      .toEqual(['Core', '3', 'Oct 30, 2026, 1:00 PM', 'Nov 2, 2026, 10:00 AM']);
    await expect
      .poll(() => cells(rows(page).nth(1)))
      .toEqual(['Dividends', '1', 'Nov 1, 2026, 11:00 AM', en.common.noValue]);
  });

  test('shows the entries of one watchlist and its refreshes', async ({
    page,
  }) => {
    const engine = await open(page);
    await page.getByRole('link', { name: 'Core' }).click();
    const crumb = page.getByRole('navigation', { name: en.breadcrumb.label });
    await expect(crumb).toContainText(en.nav.watchlists);
    await expect(crumb).toContainText('Core');
    await expect(
      crumb.getByRole('link', { name: en.nav.watchlists }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Core');
    const summary = en.watchlist.summary
      .split(' | ')[1]
      ?.replace('{count}', '3')
      .replace('{date}', 'Oct 30, 2026, 1:00 PM');
    await expect(page.getByText(summary ?? '')).toBeVisible();

    const entries = page.locator('table').first().locator('tbody tr');
    await expect
      .poll(() => cells(entries.nth(0)))
      .toEqual(['1', 'ACME', 'Momentum', en.watchlist.latestData]);
    await expect
      .poll(() => cells(entries.nth(1)))
      .toEqual(['2', 'ACME', 'Graham Number', 'Jun 30, 2025']);
    // The made-up strategy needs no GUI code.
    await expect
      .poll(() => cells(entries.nth(2)))
      .toEqual(['3', 'ZED', 'Quality Screen', 'Oct 30, 2026, 2:02 PM']);
    await expect(entries.nth(2).locator('[data-term-id]')).toHaveAttribute(
      'data-term-id',
      'strategy-quality-screen',
    );

    await expect(
      page.getByRole('heading', { name: en.watchlist.refreshesHeading }),
    ).toBeVisible();
    const refreshRows = page.locator('table').nth(1).locator('tbody tr');
    await expect(refreshRows).toHaveCount(1);
    await expect
      .poll(() => cells(refreshRows.nth(0)))
      .toEqual([
        'Oct 30, 2026, 1:58 – 2:02 PM',
        'Core (as it was)',
        '12',
        '9',
        '2',
        '0',
        '1',
      ]);
    expect(
      engine
        .paths('/v1/refreshes')
        .map((url) => url.searchParams.get('watchlist_id')),
    ).toEqual([coreId]);
  });

  test('shows the empty states of a watchlist with no entries', async ({
    page,
  }) => {
    await open(page);
    await page.getByRole('link', { name: 'Empty' }).click();
    await expect(page.getByText(en.watchlist.noEntries)).toBeVisible();
    await expect(page.getByText(en.watchlist.noRefreshes)).toBeVisible();
  });

  test('shows the empty state when there are no watchlists', async ({
    page,
  }) => {
    await open(page, (url) =>
      url.pathname === '/v1/watchlists'
        ? ok({ schema_version: 1, items: [] })
        : undefined,
    );
    await expect(page.getByText(en.watchlists.empty)).toBeVisible();
  });
});

test.describe('refreshes', () => {
  test('lists refreshes with outcome columns headed by term names', async ({
    page,
  }) => {
    await open(page);
    await page
      .getByRole('navigation', { name: en.nav.label })
      .getByRole('link', { name: en.nav.refreshes })
      .click();
    const heads = page.locator('thead th');
    await expect(heads).toHaveText([
      en.refreshes.columns.completed,
      en.refreshes.columns.watchlist,
      en.refreshes.columns.runs,
      'Completed',
      'Unavailable',
      'Not Applicable',
      'Failed',
    ]);
    await expect(heads.nth(3).locator('[data-term-id]')).toHaveAttribute(
      'data-term-id',
      'outcome-completed',
    );
    await expect(heads.nth(3).locator('[data-term-id]')).toHaveAttribute(
      'lang',
      'en',
    );
    await expect
      .poll(() => cells(rows(page).nth(0)))
      .toEqual([
        'Oct 30, 2026, 1:58 – 2:02 PM',
        'Core (as it was)',
        '12',
        '9',
        '2',
        '0',
        '1',
      ]);
    // Under a minute apart: the last completion time alone.
    await expect
      .poll(() => cells(rows(page).nth(1)))
      .toEqual([
        'Oct 29, 2026, 9:15 AM',
        en.refreshes.adHoc,
        '3',
        '3',
        '0',
        '0',
        '0',
      ]);
  });

  test('shows the empty state', async ({ page }) => {
    await open(page, (url) =>
      url.pathname === '/v1/refreshes'
        ? ok({ schema_version: 1, items: [], has_more: false })
        : undefined,
    );
    await page
      .getByRole('navigation', { name: en.nav.label })
      .getByRole('link', { name: en.nav.refreshes })
      .click();
    await expect(page.getByText(en.refreshes.empty)).toBeVisible();
  });
});

test.describe('saved runs', () => {
  async function openRuns(
    page: Page,
    handler?: Parameters<typeof mockEngine>[1],
  ) {
    const engine = await open(page, handler);
    await page
      .getByRole('navigation', { name: en.nav.label })
      .getByRole('link', { name: en.nav.runs })
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      en.nav.runs,
    );
    return engine;
  }

  test('lists runs with strategy and outcome term names', async ({ page }) => {
    await openRuns(page);
    await expect(page.locator('thead th')).toHaveText([
      en.runs.columns.completed,
      en.runs.columns.ticker,
      en.runs.columns.strategy,
      en.runs.columns.outcome,
    ]);
    await expect
      .poll(() => cells(rows(page).nth(0)))
      .toEqual(['Nov 2, 2026, 9:41 AM', 'MSFT', 'Graham Number', 'Completed']);
    await expect(
      rows(page).nth(0).locator('td').nth(1).locator('[data-term-id]'),
    ).toHaveAttribute('data-term-id', 'strategy-graham-number');
    await expect(
      rows(page).nth(0).locator('td').nth(1).locator('[data-term-id]'),
    ).toHaveAttribute('lang', 'en');
    await expect(
      rows(page).nth(0).locator('td').nth(2).locator('[data-term-id]'),
    ).toHaveAttribute('data-term-id', 'outcome-completed');
    // The made-up strategy needs no GUI code.
    await expect
      .poll(() => cells(rows(page).nth(2)))
      .toEqual(['Oct 29, 2026, 2:02 PM', 'ZED', 'Quality Screen', 'Completed']);
  });

  test('shows a method the engine does not list as served, with no term id', async ({
    page,
  }) => {
    await openRuns(page);
    const cell = rows(page).nth(3).locator('td').nth(1);
    await expect(cell).toHaveText('retired_method');
    await expect(cell.locator('[data-term-id]')).toHaveCount(0);
  });

  test('shows more runs a page at a time', async ({ page }) => {
    const engine = await openRuns(page);
    await expect(rows(page)).toHaveCount(50);
    const [first] = engine.paths('/v1/runs');
    expect(first?.searchParams.get('limit')).toBe('50');
    expect(first?.searchParams.get('offset')).toBe('0');
    await page.getByRole('button', { name: en.common.showMore }).click();
    await expect(rows(page)).toHaveCount(55);
    expect(engine.paths('/v1/runs').at(-1)?.searchParams.get('offset')).toBe(
      '50',
    );
    await expect(
      page.getByRole('button', { name: en.common.showMore }),
    ).toHaveCount(0);
  });

  test('filters by ticker, strategy and outcome and starts again at the first page', async ({
    page,
  }) => {
    const engine = await openRuns(page);
    await page.getByRole('button', { name: en.common.showMore }).click();
    await expect(rows(page)).toHaveCount(55);

    await expect(
      page.getByLabel(en.runs.filters.strategy).locator('option'),
    ).toHaveText([
      en.runs.filters.allStrategies,
      'Momentum',
      'Graham Number',
      'Quality Screen',
    ]);
    await expect(
      page.getByLabel(en.runs.filters.outcome).locator('option'),
    ).toHaveText([
      en.runs.filters.allOutcomes,
      'Completed',
      'Unavailable',
      'Not Applicable',
      'Failed',
    ]);

    await page.getByLabel(en.runs.filters.ticker).fill('  msft ');
    await page.getByLabel(en.runs.filters.ticker).press('Enter');
    await expect(rows(page)).toHaveCount(2);
    let last = engine.paths('/v1/runs').at(-1);
    expect(last?.searchParams.get('ticker')).toBe('msft');
    expect(last?.searchParams.get('offset')).toBe('0');
    expect(last?.searchParams.has('method_id')).toBe(false);

    await page
      .getByLabel(en.runs.filters.strategy)
      .selectOption('sma_crossover');
    await expect(rows(page)).toHaveCount(1);
    last = engine.paths('/v1/runs').at(-1);
    expect(last?.searchParams.get('method_id')).toBe('sma_crossover');
    expect(last?.searchParams.get('ticker')).toBe('msft');

    await page.getByLabel(en.runs.filters.outcome).selectOption('completed');
    await expect(page.getByText(en.runs.emptyFiltered)).toBeVisible();
    expect(engine.paths('/v1/runs').at(-1)?.searchParams.get('outcome')).toBe(
      'completed',
    );

    await page.getByRole('button', { name: en.runs.filters.clear }).click();
    await expect(rows(page)).toHaveCount(50);
    last = engine.paths('/v1/runs').at(-1);
    expect(last?.searchParams.has('ticker')).toBe(false);
    expect(last?.searchParams.has('method_id')).toBe(false);
    expect(last?.searchParams.has('outcome')).toBe(false);
    expect(last?.searchParams.get('offset')).toBe('0');
  });

  test('applies the ticker when the field loses focus, and sends no empty ticker', async ({
    page,
  }) => {
    const engine = await openRuns(page);
    await page.getByLabel(en.runs.filters.ticker).fill('zed');
    await page.getByLabel(en.runs.filters.strategy).focus();
    await expect(rows(page)).toHaveCount(1);
    expect(engine.paths('/v1/runs').at(-1)?.searchParams.get('ticker')).toBe(
      'zed',
    );
    await page.getByLabel(en.runs.filters.ticker).fill('   ');
    await page.getByLabel(en.runs.filters.ticker).press('Enter');
    await expect(rows(page)).toHaveCount(50);
    expect(engine.paths('/v1/runs').at(-1)?.searchParams.has('ticker')).toBe(
      false,
    );
  });

  test('shows the empty states with and without filters', async ({ page }) => {
    await openRuns(page, (url) =>
      url.pathname === '/v1/runs'
        ? ok({ schema_version: 2, items: [], has_more: false })
        : undefined,
    );
    await expect(page.getByText(en.runs.empty)).toBeVisible();
    await page.getByLabel(en.runs.filters.outcome).selectOption('failed');
    await expect(page.getByText(en.runs.emptyFiltered)).toBeVisible();
  });
});

test.describe('errors', () => {
  // The browser logs each failure response; these tests send them on purpose.
  test.use({ allowedHttpStatuses: [409, 500, 503] });

  test('shows a resource state with the API reason and its language', async ({
    page,
  }) => {
    await open(page, (url) =>
      url.pathname === `/v1/watchlists/${coreId}`
        ? failure(
            409,
            'stored_selection_unreadable',
            'An entry of this watchlist cannot be read.',
            'en-CA',
          )
        : undefined,
    );
    await page.getByRole('link', { name: 'Core' }).click();
    const message = page.getByText(
      'An entry of this watchlist cannot be read.',
    );
    await expect(message).toBeVisible();
    await expect(message).toHaveAttribute('lang', 'en-CA');
  });

  test('shows the database message for database_busy and reloads on Try again', async ({
    page,
  }) => {
    let busy = true;
    const engine = await open(page, (url) => {
      if (url.pathname === '/v1/watchlists' && busy)
        return failure(503, 'database_busy', 'Run the command to clear it.');
      return undefined;
    });
    await expect(page.getByRole('status')).toContainText(
      en.engine.state.databaseBusy,
    );
    await expect(page.getByText('Run the command')).toHaveCount(0);
    busy = false;
    await page.getByRole('button', { name: en.common.tryAgain }).click();
    await expect(rows(page)).toHaveCount(3);
    expect(engine.paths('/v1/watchlists')).toHaveLength(2);
  });

  test('shows another database code without a retry button', async ({
    page,
  }) => {
    await open(page, (url) =>
      url.pathname === '/v1/watchlists'
        ? failure(503, 'database_io_error', 'A message naming a path.')
        : undefined,
    );
    await expect(page.getByRole('status')).toHaveText(
      en.engine.state.databaseOther,
    );
    await expect(
      page.getByRole('button', { name: en.common.tryAgain }),
    ).toHaveCount(0);
  });

  test('shows one defect message for every other code', async ({ page }) => {
    await open(page, (url) =>
      url.pathname === '/v1/watchlists'
        ? failure(500, 'execution_error', 'A message with internal detail.')
        : undefined,
    );
    await expect(page.getByRole('status')).toHaveText(en.state.defect);
    await expect(page.getByText('internal detail')).toHaveCount(0);
  });
});

test.describe('right-to-left pseudo-locale shell', () => {
  test('puts the navigation on the inline-start side', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['ar-XB'],
        configurable: true,
      });
      Object.defineProperty(navigator, 'language', {
        get: () => 'ar-XB',
        configurable: true,
      });
    });
    await open(page);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const nav = await page.locator('.sidebar').boundingBox();
    const content = await page.locator('.content').boundingBox();
    expect(nav).not.toBeNull();
    expect(content).not.toBeNull();
    expect((nav?.x ?? 0) > (content?.x ?? 0)).toBe(true);
  });
});
