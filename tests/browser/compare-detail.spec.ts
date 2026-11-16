import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { engineUrl, mockEngine, type Handler } from './engine-mock.ts';
import { instantText, plain, rangeText } from './expected-text.ts';
import {
  adHocRefreshId,
  coreComparison,
  coreRefreshId,
  retiredComparison,
  retiredRefreshId,
  runDetails,
} from '../fixtures/api/compare.ts';
import { refreshes } from '../fixtures/api/data.ts';
import { failure, ok } from '../fixtures/api/server.ts';
import en from '../../src/locales/en.json' with { type: 'json' };
import ar from '../fixtures/locales/ar-XB.json' with { type: 'json' };

const savedId = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const compareRunId = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

async function cells(row: Locator): Promise<string[]> {
  return (await row.locator('th, td').allInnerTexts()).map((text) =>
    plain(text),
  );
}

const rows = (page: Page) => page.locator('tbody tr');
const nav = (page: Page) =>
  page.getByRole('navigation', { name: en.nav.label });
const crumbs = (page: Page) =>
  page
    .getByRole('navigation', { name: en.breadcrumb.label })
    .locator('li')
    .allInnerTexts()
    .then((items) => items.map((text) => plain(text)));

// The refreshes list with the refresh of a strategy that is no longer declared.
const withRetired: Handler = (url) =>
  url.pathname === '/v1/refreshes'
    ? ok({
        schema_version: 1,
        has_more: false,
        items: [
          ...refreshes,
          {
            refresh_id: retiredRefreshId,
            watchlist_id: retiredComparison.watchlist_id,
            watchlist_name: retiredComparison.watchlist_name,
            first_completed_at: retiredComparison.first_completed_at,
            last_completed_at: retiredComparison.last_completed_at,
            run_count: retiredComparison.run_count,
            outcome_counts: retiredComparison.outcome_counts,
          },
        ],
      })
    : undefined;

async function open(page: Page, handler?: Handler) {
  const engine = await mockEngine(page, handler);
  await page.goto(engineUrl);
  return engine;
}

async function openRefreshes(page: Page, handler?: Handler) {
  const engine = await open(page, handler);
  await nav(page).getByRole('link', { name: en.nav.refreshes }).click();
  await expect(rows(page).first()).toBeVisible();
  return engine;
}

async function openComparison(page: Page, handler?: Handler, row = 0) {
  const engine = await openRefreshes(page, handler);
  await rows(page).nth(row).locator('th a').click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  return engine;
}

async function openRuns(page: Page, handler?: Handler) {
  const engine = await open(page, handler);
  await nav(page).getByRole('link', { name: en.nav.runs }).click();
  await expect(rows(page).first()).toBeVisible();
  return engine;
}

async function openRun(page: Page, row: number, handler?: Handler) {
  const engine = await openRuns(page, handler);
  await rows(page).nth(row).locator('th a').click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  return engine;
}

async function pretendRightToLeft(page: Page) {
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
}

const coreHeading = async (page: Page) =>
  en.compare.heading
    .replace('{watchlist}', 'Core (as it was)')
    .replace(
      '{time}',
      await rangeText(
        page,
        coreComparison.first_completed_at,
        coreComparison.last_completed_at,
      ),
    );

test.describe('refresh rows and saved runs link to the screens', () => {
  test('opens a refresh comparison from the completion time of a refresh row', async ({
    page,
  }) => {
    const engine = await openRefreshes(page);
    const link = rows(page).nth(0).locator('th a');
    await expect(link).toHaveAttribute('href', /./);
    await link.click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      await coreHeading(page),
    );
    expect(engine.paths(`/v1/refreshes/${coreRefreshId}/compare`)).toHaveLength(
      1,
    );
  });

  test('opens a refresh comparison from a watchlist’s refreshes', async ({
    page,
  }) => {
    await open(page);
    await page.getByRole('link', { name: 'Core' }).click();
    await page.locator('table').nth(1).locator('tbody th a').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      await coreHeading(page),
    );
  });

  test('shows how each saved run was saved, and links a refresh to its comparison', async ({
    page,
  }) => {
    await openRuns(page);
    await expect(page.locator('thead th').last()).toHaveText(
      en.runs.columns.savedBy,
    );
    // The direct analysis is plain text; the run a refresh saved links.
    const direct = rows(page).nth(0).locator('td').last();
    await expect(direct).toHaveText(en.runs.savedBy.direct);
    await expect(direct.locator('a')).toHaveCount(0);
    const saved = rows(page).nth(2).locator('td').last();
    await expect(saved.locator('a')).toHaveText(en.runs.savedBy.refresh);
    await saved.locator('a').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      await coreHeading(page),
    );
  });

  test('opens run detail from the completion time of a saved run', async ({
    page,
  }) => {
    await openRuns(page);
    await rows(page).nth(0).locator('th a').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      en.runDetail.title
        .replace('{name}', 'Microsoft Corp')
        .replace('{ticker}', 'MSFT')
        .replace('{strategy}', 'Graham Number'),
    );
  });
});

test.describe('comparison', () => {
  test('shows the heading, the counts and two header rows', async ({
    page,
  }) => {
    await openComparison(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      await coreHeading(page),
    );
    // The heading is plain text; the watchlist is reached through Watchlists
    // (D177).
    await expect(
      page.getByRole('heading', { level: 1 }).getByRole('link'),
    ).toHaveCount(0);
    const runs = en.compare.runCount
      .split(' | ')[1]!
      .replace('{runs}', String(coreComparison.run_count));
    // One pill per outcome, with its count inside (D176).
    await expect(page.locator('.counts li')).toHaveText([
      runs,
      'Completed 3',
      'Unavailable 1',
      'Not Applicable 1',
    ]);
    await expect(page.locator('.counts li .pill')).toHaveCount(3);
    const headers = page.locator('thead tr');
    await expect
      .poll(async () => cells(headers.nth(0)))
      .toEqual([
        en.compare.columns.ticker,
        'Momentum',
        'Graham Number',
        'Quality Screen',
      ]);
    await expect
      .poll(async () => cells(headers.nth(1)))
      .toEqual([
        'Trend',
        'RSI',
        'Max price',
        'Current price',
        'Margin',
        en.compare.columns.outcome,
        'Score',
        'Completeness',
        en.compare.columns.outcome,
      ]);
    // Each label keeps its term id, and each strategy name its own.
    await expect(
      headers.nth(1).locator('[data-term-id]').first(),
    ).toHaveAttribute('data-term-id', 'cell-trend');
    await expect(
      headers.nth(0).locator('[data-term-id]').nth(2),
    ).toHaveAttribute('data-term-id', 'strategy-quality-screen');
    await expect(page.getByText('Download')).toHaveCount(0);
    await expect(page.getByText('Refresh now')).toHaveCount(0);
  });

  test('shows values, a dash with its status, and "Not run"', async ({
    page,
  }) => {
    await openComparison(page);
    await expect
      .poll(() => cells(rows(page).nth(0)))
      .toEqual([
        'ACME',
        'Bullish',
        '58.2',
        'USD 23.10',
        'USD 61.20',
        '-62.3%',
        'Completed',
        '7.0',
        'Complete',
        'Completed',
      ]);
    // A null run is one cell that spans its group; a number cell with no value
    // shows its status; a group with no headline shows its term name.
    await expect
      .poll(() => cells(rows(page).nth(1)))
      .toEqual([
        'ZED',
        `— ${en.compare.notRun}`,
        '— Does not apply',
        '— Does not apply',
        '— Does not apply',
        'Not Applicable',
        'No result was stored',
        'Unavailable',
      ]);
    const notRun = rows(page).nth(1).locator('td').first();
    await expect(notRun).toHaveAttribute('colspan', '2');
    await expect(notRun.locator('a')).toHaveCount(0);
    // The reason code is shown on run detail only.
    await expect(page.getByText('Instrument kind does not apply')).toHaveCount(
      0,
    );
    const value = rows(page).nth(0).locator('td a').first();
    await expect(value).toHaveCSS('font-weight', '500');
    await expect(
      rows(page).nth(1).locator('td').nth(4).locator('[data-term-id]'),
    ).toHaveAttribute('data-term-id', 'outcome-not-applicable');
  });

  test('shows an outcome column only in a group with a run that did not complete', async ({
    page,
  }) => {
    await openComparison(page);
    // Momentum has a missing run but no run that is not completed.
    await expect(
      page.locator('thead tr').nth(0).locator('th').nth(1),
    ).toHaveAttribute('colspan', '2');
    await expect(
      page.locator('thead tr').nth(0).locator('th').nth(2),
    ).toHaveAttribute('colspan', '4');
    await expect(
      page.locator('thead tr').nth(0).locator('th').nth(3),
    ).toHaveAttribute('colspan', '3');
  });

  test('links every cell of a run to its detail and "Not run" to nothing', async ({
    page,
  }) => {
    const engine = await openComparison(page);
    const acme = rows(page).nth(0);
    await expect(acme.locator('td a')).toHaveCount(9);
    await acme.locator('td a').nth(1).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      en.runDetail.title
        .replace('{name}', 'Acme Corp')
        .replace('{ticker}', 'ACME')
        .replace('{strategy}', 'Momentum'),
    );
    expect(engine.paths(`/v1/runs/${compareRunId(1)}/overview`)).toHaveLength(
      1,
    );
  });

  test('shows a refresh of ad hoc entries and a strategy that is no longer declared', async ({
    page,
  }) => {
    await openComparison(page, withRetired, 1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      en.compare.heading
        .replace('{watchlist}', en.refreshes.adHoc)
        .replace(
          '{time}',
          await instantText(page, '2026-10-29T13:15:30+00:00'),
        ),
    );
    await expect(
      page.getByRole('heading', { level: 1 }).getByRole('link'),
    ).toHaveCount(0);
    await nav(page).getByRole('link', { name: en.nav.refreshes }).click();
    await rows(page).nth(2).locator('th a').click();
    const strategy = page.locator('thead tr').nth(0).locator('th').nth(2);
    await expect(strategy).toHaveText('retired_method');
    await expect(strategy.locator('[data-term-id]')).toHaveCount(0);
    await expect
      .poll(() => cells(rows(page).nth(0)))
      .toEqual([
        'OLD',
        'Bullish',
        '58.2',
        'Strategy no longer available',
        'Failed',
      ]);
    expect(adHocRefreshId).toBeTruthy();
  });

  test('shows the made-up strategy with no GUI code change', async ({
    page,
  }) => {
    await openComparison(page);
    await expect(page.getByText('Quality Screen').first()).toBeVisible();
    await expect(page.getByText('Completeness')).toBeVisible();
    await expect(page.getByText('Complete', { exact: true })).toBeVisible();
  });
});

test.describe('comparison layout', () => {
  async function stickyTicker(page: Page) {
    await page.setViewportSize({ width: 480, height: 700 });
    return page.evaluate(() => {
      const box = document.querySelector('.table-scroll')!;
      const cell = document.querySelector('tbody th.ticker')!;
      const rtl = getComputedStyle(box).direction === 'rtl';
      box.scrollLeft = rtl ? -150 : 150;
      const outer = box.getBoundingClientRect();
      const inner = cell.getBoundingClientRect();
      return {
        rtl,
        scrolled: Math.abs(box.scrollLeft),
        gap: rtl ? outer.right - inner.right : inner.left - outer.left,
      };
    });
  }

  test('keeps the ticker column at the inline start while the groups scroll', async ({
    page,
  }) => {
    await openComparison(page);
    const result = await stickyTicker(page);
    expect(result.rtl).toBe(false);
    expect(result.scrolled).toBeGreaterThan(0);
    expect(Math.abs(result.gap)).toBeLessThanOrEqual(1);
  });

  test('keeps the ticker column at the inline start in right-to-left', async ({
    page,
  }) => {
    await pretendRightToLeft(page);
    await open(page);
    await nav(page).getByRole('link', { name: ar.nav.refreshes }).click();
    await rows(page).nth(0).locator('th a').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('table.compare')).toBeVisible();
    const result = await stickyTicker(page);
    expect(result.rtl).toBe(true);
    expect(result.scrolled).toBeGreaterThan(0);
    expect(Math.abs(result.gap)).toBeLessThanOrEqual(1);
  });
});

test.describe('run detail', () => {
  // The document of a strategy that is no longer declared is refused on purpose.
  test.use({ allowedHttpStatuses: [409] });

  test('shows the header, the cards, the warnings and the limitations', async ({
    page,
  }) => {
    await openRun(page, 0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Microsoft Corp (MSFT) — Graham Number',
    );
    await expect(
      page.getByRole('heading', { level: 1 }).locator('[data-term-id]'),
    ).toHaveAttribute('data-term-id', 'strategy-graham-number');
    const meta = page.locator('.meta li');
    await expect(meta.nth(0).locator('[data-term-id]')).toHaveAttribute(
      'data-term-id',
      'outcome-completed',
    );
    await expect(meta.nth(1)).toHaveText(
      en.runDetail.saved.replace(
        '{date}',
        await instantText(page, '2026-11-02T14:41:00+00:00'),
      ),
    );
    await expect(meta.nth(2)).toContainText(
      en.runDetail.asOf.replace('{date}', 'Dec 31, 2025'),
    );
    await expect(meta.nth(3)).toContainText('fiscal year-end Dec 31, 2025');
    await expect(meta.nth(4)).toHaveText(en.runDetail.savedByDirect);

    const cards = page.locator('.cards li');
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0)).toContainText('Max price');
    await expect(cards.nth(0)).toContainText('USD 23.10');
    await expect(cards.nth(2)).toContainText('-62.3%');
    await expect(cards.nth(0).locator('[data-term-id]')).toHaveAttribute(
      'data-term-id',
      'cell-max_price',
    );
    await expect(cards.nth(0).locator('.value')).toHaveCSS('font-size', '20px');

    await expect(
      page.getByRole('heading', { name: en.runDetail.warnings }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('heading', { name: en.runDetail.warnings })
        .locator('xpath=following-sibling::ul[1]/li'),
    ).toHaveText(['The quote is older than a day.']);
    await expect(
      page
        .getByRole('heading', { name: en.runDetail.limitations })
        .locator('xpath=following-sibling::ul[1]'),
    ).toHaveAttribute('lang', 'en');
    await expect(
      page
        .getByRole('heading', { name: en.runDetail.limitations })
        .locator('xpath=following-sibling::ul[1]/li'),
    ).toHaveCount(2);
  });

  test('shows a dash with the status and the reason code of a cell with no value, and leaves empty lists out', async ({
    page,
  }) => {
    await openRun(page, 1);
    const cards = page.locator('.cards li');
    await expect(cards.nth(1)).toContainText('RSI');
    await expect(cards.nth(1)).toContainText('—');
    // The dash is body size in secondary colour, as a table cell shows it
    // (D178).
    const sizes = await cards.nth(1).evaluate((card) => {
      const empty = card.querySelector('.empty');
      const body = getComputedStyle(document.body).fontSize;
      return {
        body,
        empty: empty ? getComputedStyle(empty).fontSize : null,
      };
    });
    expect(sizes.empty).toBe(sizes.body);
    await expect(
      cards.nth(1).locator('[data-term-id="status-input-unavailable"]'),
    ).toHaveText('Input not available');
    await expect(
      cards.nth(1).locator('[data-term-id="reason-insufficient-history"]'),
    ).toHaveText('Not enough history');
    await expect(
      page.getByRole('heading', { name: en.runDetail.warnings }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: en.runDetail.limitations }),
    ).toHaveCount(0);
    // Without a company name the title is the ticker and the strategy.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'MSFT — Momentum',
    );
  });

  test('shows the made-up strategy with its term, and a run saved by a refresh', async ({
    page,
  }) => {
    await openRun(page, 2);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Zed Holdings (ZED) — Quality Screen',
    );
    await expect(
      page.getByRole('heading', { level: 1 }).locator('[data-term-id]'),
    ).toHaveAttribute('data-term-id', 'strategy-quality-screen');
    await expect(page.locator('.cards li')).toHaveCount(2);
    await page.getByRole('link', { name: en.runDetail.savedByRefresh }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      await coreHeading(page),
    );
  });

  test('shows the term name of a headline that is unavailable instead of cards', async ({
    page,
  }) => {
    await openComparison(page);
    // ZED's quality run has no headline.
    await rows(page).nth(1).locator('td a').nth(4).click();
    await expect(page.locator('.cards')).toHaveCount(0);
    await expect(
      page.locator('[data-term-id="headline-no-result"]'),
    ).toHaveText('No result was stored');
  });

  test('shows the overview when the full document fails, and one message where the document would be', async ({
    page,
  }) => {
    await openRun(page, 3);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'OLD — retired_method',
    );
    await expect(
      page.getByRole('heading', { level: 1 }).locator('[data-term-id]'),
    ).toHaveCount(0);
    await expect(page.locator('.meta')).not.toContainText(
      en.runDetail.asOf.replace('{date}', ''),
    );
    const reason = page.getByText('This run cannot be shown as a document.');
    await expect(reason).toHaveCount(1);
    await expect(reason).toHaveAttribute('lang', 'en');
    await expect(
      page.getByRole('heading', { name: en.runDetail.warnings }),
    ).toHaveCount(0);
    await page.getByRole('tab', { name: en.runDetail.tabs.json }).click();
    await expect(
      page.getByRole('tabpanel').getByText('This run cannot be shown'),
    ).toBeVisible();
    // The summary text is its own request and still works.
    await page.getByRole('tab', { name: en.runDetail.tabs.summary }).click();
    await expect(page.getByRole('tabpanel')).toContainText('in concise mode');
  });
});

test.describe('run detail views', () => {
  test.use({ allowedHttpStatuses: [503] });

  async function selectedTab(page: Page): Promise<string> {
    return (
      (await page
        .getByRole('tab', { selected: true })
        .evaluate((tab) => tab.textContent)) ?? ''
    ).trim();
  }

  test('requests each text the first time its tab opens and shows it read-only', async ({
    page,
  }) => {
    const engine = await openRun(page, 0);
    const path = `/v1/runs/${savedId(1)}/text`;
    const modes = () =>
      engine.paths(path).map((url) => url.searchParams.get('mode'));
    await expect(page.getByRole('tab')).toHaveText([
      en.runDetail.tabs.summary,
      en.runDetail.tabs.details,
      en.runDetail.tabs.diagnostics,
      en.runDetail.tabs.json,
    ]);
    await expect(
      page.getByRole('tab', { name: en.runDetail.tabs.summary }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toContainText('in concise mode');
    expect(modes()).toEqual(['concise']);
    const pre = page.getByRole('tabpanel').locator('pre');
    await expect(pre).toHaveAttribute('lang', 'en');
    await expect(pre).toHaveAttribute('dir', 'ltr');
    await expect(pre).toHaveCSS('white-space', 'pre');
    await expect(page.getByRole('tabpanel')).toHaveAttribute('tabindex', '0');
    await expect(page.getByRole('button', { name: /copy/i })).toHaveCount(0);

    await page.getByRole('tab', { name: en.runDetail.tabs.details }).click();
    await expect(page.getByRole('tabpanel')).toContainText('in details mode');
    await page.getByRole('tab', { name: en.runDetail.tabs.summary }).click();
    await expect(page.getByRole('tabpanel')).toContainText('in concise mode');
    // The result is kept: the summary is not requested again.
    expect(modes()).toEqual(['concise', 'details']);
    await page
      .getByRole('tab', { name: en.runDetail.tabs.diagnostics })
      .click();
    await expect(page.getByRole('tabpanel')).toContainText(
      'in diagnostics mode',
    );
    expect(modes()).toEqual(['concise', 'details', 'diagnostics']);
  });

  test('shows the stored document as JSON in served order, left to right', async ({
    page,
  }) => {
    await openRun(page, 0);
    await page.getByRole('tab', { name: en.runDetail.tabs.json }).click();
    const pre = page.getByRole('tabpanel').locator('pre');
    await expect(pre).toHaveAttribute('dir', 'ltr');
    const expected = JSON.stringify(runDetails[savedId(1)]?.document, null, 2);
    await expect.poll(() => pre.innerText()).toBe(expected);
  });

  test('moves between tabs with the arrow keys, Home and End, and activates them', async ({
    page,
  }) => {
    await openRun(page, 0);
    const summary = page.getByRole('tab', { name: en.runDetail.tabs.summary });
    await summary.focus();
    await page.keyboard.press('ArrowRight');
    await expect(
      page.getByRole('tab', { name: en.runDetail.tabs.details }),
    ).toBeFocused();
    expect(await selectedTab(page)).toBe(en.runDetail.tabs.details);
    await expect(page.getByRole('tabpanel')).toContainText('in details mode');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    expect(await selectedTab(page)).toBe(en.runDetail.tabs.json);
    // Past the last tab it wraps to the first, and back again.
    await page.keyboard.press('ArrowRight');
    expect(await selectedTab(page)).toBe(en.runDetail.tabs.summary);
    await page.keyboard.press('ArrowLeft');
    expect(await selectedTab(page)).toBe(en.runDetail.tabs.json);
    await page.keyboard.press('Home');
    expect(await selectedTab(page)).toBe(en.runDetail.tabs.summary);
    await page.keyboard.press('End');
    expect(await selectedTab(page)).toBe(en.runDetail.tabs.json);
    await expect(
      page.getByRole('tab', { name: en.runDetail.tabs.json }),
    ).toBeFocused();
  });

  test('mirrors the arrow keys in right-to-left', async ({ page }) => {
    await pretendRightToLeft(page);
    await open(page);
    await nav(page).getByRole('link', { name: ar.nav.runs }).click();
    await rows(page).nth(0).locator('th a').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const summary = page.getByRole('tab', { name: ar.runDetail.tabs.summary });
    await summary.focus();
    // The next tab lies to the left.
    await page.keyboard.press('ArrowLeft');
    await expect(
      page.getByRole('tab', { name: ar.runDetail.tabs.details }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.getByRole('tab', { name: ar.runDetail.tabs.details }),
    ).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(summary).toHaveAttribute('aria-selected', 'true');
    // Tabs are laid out right to left.
    const first = await summary.boundingBox();
    const second = await page
      .getByRole('tab', { name: ar.runDetail.tabs.details })
      .boundingBox();
    expect((first?.x ?? 0) > (second?.x ?? 0)).toBe(true);
    await page.keyboard.press('End');
    await expect(
      page.getByRole('tab', { name: ar.runDetail.tabs.json }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  test('shows a failed text request on its own tab and asks again on Try again', async ({
    page,
  }) => {
    let down = true;
    await openRun(page, 0, (url) =>
      url.pathname.endsWith('/text') &&
      url.searchParams.get('mode') === 'details' &&
      down
        ? failure(503, 'database_busy', 'busy')
        : undefined,
    );
    await page.getByRole('tab', { name: en.runDetail.tabs.details }).click();
    await expect(page.getByRole('status')).toContainText(
      en.engine.state.databaseBusy,
    );
    await page.getByRole('tab', { name: en.runDetail.tabs.summary }).click();
    await expect(page.getByRole('tabpanel')).toContainText('in concise mode');
    await page.getByRole('tab', { name: en.runDetail.tabs.details }).click();
    down = false;
    await page.getByRole('button', { name: en.common.tryAgain }).click();
    await expect(page.getByRole('tabpanel')).toContainText('in details mode');
  });
});

test.describe('breadcrumbs', () => {
  test('lists only Refreshes above the comparison, as a link', async ({
    page,
  }) => {
    await openComparison(page);
    expect(await crumbs(page)).toEqual([en.nav.refreshes]);
    await expect(
      page
        .getByRole('navigation', { name: en.breadcrumb.label })
        .locator('[aria-current]'),
    ).toHaveCount(0);
    await page
      .getByRole('navigation', { name: en.breadcrumb.label })
      .getByRole('link', { name: en.nav.refreshes })
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      en.nav.refreshes,
    );
  });

  test('goes through the refresh comparison for a run opened from a comparison', async ({
    page,
  }) => {
    await openComparison(page);
    await rows(page).nth(0).locator('td a').first().click();
    await expect(page.locator('.cards')).toBeVisible();
    expect(await crumbs(page)).toEqual([
      en.nav.refreshes,
      en.compare.refreshComparison,
    ]);
    await page
      .getByRole('navigation', { name: en.breadcrumb.label })
      .getByRole('link', { name: en.compare.refreshComparison })
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      await coreHeading(page),
    );
  });

  test('starts at Saved runs for a run opened from the list, even one a refresh saved', async ({
    page,
  }) => {
    await openRun(page, 2);
    expect(await crumbs(page)).toEqual([en.nav.runs]);
  });

  test('restores the Saved runs filters from the crumb and starts at the first page', async ({
    page,
  }) => {
    const engine = await openRuns(page);
    await page.getByLabel(en.runs.filters.ticker).fill('msft');
    await page.getByLabel(en.runs.filters.ticker).press('Enter');
    await expect(rows(page)).toHaveCount(2);
    await page.getByLabel(en.runs.filters.outcome).selectOption('unavailable');
    await expect(rows(page)).toHaveCount(1);

    await rows(page).nth(0).locator('th a').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'MSFT — Momentum',
    );
    await page
      .getByRole('navigation', { name: en.breadcrumb.label })
      .getByRole('link', { name: en.nav.runs })
      .click();
    await expect(page.getByLabel(en.runs.filters.ticker)).toHaveValue('msft');
    await expect(page.getByLabel(en.runs.filters.outcome)).toHaveValue(
      'unavailable',
    );
    await expect(rows(page)).toHaveCount(1);
    const last = engine.paths('/v1/runs').at(-1);
    expect(last?.searchParams.get('ticker')).toBe('msft');
    expect(last?.searchParams.get('outcome')).toBe('unavailable');
    expect(last?.searchParams.get('offset')).toBe('0');

    // The navigation item starts again with no filters.
    await nav(page).getByRole('link', { name: en.nav.refreshes }).click();
    await nav(page).getByRole('link', { name: en.nav.runs }).click();
    await expect(page.getByLabel(en.runs.filters.ticker)).toHaveValue('');
    await expect(rows(page)).toHaveCount(50);
  });
});

test.describe('request failures by reason code group', () => {
  test.use({ allowedHttpStatuses: [404, 409, 500, 503] });

  const screens = [
    {
      name: 'comparison',
      match: (url: URL) => url.pathname.endsWith('/compare'),
      open: async (page: Page, handler: Handler) => {
        await openRefreshes(page, handler);
        await rows(page).first().locator('th a').click();
      },
    },
    {
      name: 'run detail',
      match: (url: URL) => url.pathname.endsWith('/overview'),
      open: async (page: Page, handler: Handler) => {
        await open(page, handler);
        await nav(page).getByRole('link', { name: en.nav.runs }).click();
        await rows(page).first().locator('th a').click();
      },
    },
  ];

  for (const screen of screens) {
    test.describe(screen.name, () => {
      test('shows the API reason of a resource state, with its language', async ({
        page,
      }) => {
        await screen.open(page, (url) =>
          screen.match(url)
            ? failure(
                404,
                'analysis_run_not_found',
                'That one is not stored.',
                'en',
              )
            : undefined,
        );
        const status = page.getByRole('status');
        await expect(status).toContainText('That one is not stored.');
        await expect(status.locator('[lang="en"]')).toHaveCount(1);
        await expect(page.locator('table')).toHaveCount(0);
      });

      test('shows the database busy message and reloads on Try again', async ({
        page,
      }) => {
        let busy = true;
        await screen.open(page, (url) =>
          screen.match(url) && busy
            ? failure(503, 'database_busy', 'Run a command.')
            : undefined,
        );
        await expect(page.getByRole('status')).toContainText(
          en.engine.state.databaseBusy,
        );
        busy = false;
        await page.getByRole('button', { name: en.common.tryAgain }).click();
        await expect(page.getByRole('status')).toHaveCount(0);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      });

      test('shows another database code without a retry button', async ({
        page,
      }) => {
        await screen.open(page, (url) =>
          screen.match(url)
            ? failure(503, 'database_io_error', 'Names a path.')
            : undefined,
        );
        await expect(page.getByRole('status')).toHaveText(
          en.engine.state.databaseOther,
        );
        await expect(
          page.getByRole('button', { name: en.common.tryAgain }),
        ).toHaveCount(0);
      });

      test('shows one message for every other code', async ({ page }) => {
        await screen.open(page, (url) =>
          screen.match(url)
            ? failure(500, 'execution_error', 'Internal detail.')
            : undefined,
        );
        await expect(page.getByRole('status')).toHaveText(en.state.defect);
        await expect(page.getByText('Internal detail')).toHaveCount(0);
      });
    });
  }
});

test.describe('served period end', () => {
  test('shows the UTC date of a period end served as a midnight-UTC instant', async ({
    page,
  }) => {
    // The first saved run is a Graham Number run whose period end is served
    // as 2025-12-31T00:00:00+00:00, the form the engine uses.
    expect(runDetails[savedId(1)]?.overview.headline?.period_end).toBe(
      '2025-12-31T00:00:00+00:00',
    );
    await openRun(page, 0);
    await expect(page.locator('.meta li').nth(3)).toContainText(
      'fiscal year-end Dec 31, 2025',
    );
  });
});

test.describe('render errors', () => {
  test.use({
    allowedConsoleErrors: ['Invalid time value', 'date value is not finite'],
  });

  test('shows one message in place of a screen that fails to render, and keeps the navigation working', async ({
    page,
  }) => {
    const broken = structuredClone(runDetails[savedId(1)]!.overview);
    broken.headline!.period_end = 'not a date';
    await openRuns(page, (url) =>
      url.pathname === `/v1/runs/${savedId(1)}/overview`
        ? ok(broken)
        : undefined,
    );
    await rows(page).nth(0).locator('th a').click();
    await expect(page.getByRole('alert')).toHaveText(en.state.renderFailed);
    await nav(page).getByRole('link', { name: en.nav.refreshes }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      en.nav.refreshes,
    );
  });
});

test.describe('links', () => {
  // Focuses a link after a key press, so that :focus-visible applies (a
  // browser may not tab to links by default).
  async function focusByKeyboard(page: Page, link: Locator) {
    await page.keyboard.press('Shift');
    await link.focus();
    await expect(link).toBeFocused();
  }

  const underline = (link: Locator) =>
    link.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        line: style.textDecorationLine,
        skipInk: style.textDecorationSkipInk,
        thickness: style.textDecorationThickness,
      };
    });

  test('a table link and a breadcrumb link are underlined only on focus', async ({
    page,
  }) => {
    await openComparison(page);
    const tableLink = rows(page).nth(0).locator('td a').first();
    const crumb = page
      .getByRole('navigation', { name: en.breadcrumb.label })
      .getByRole('link');
    expect((await underline(tableLink)).line).toBe('none');
    expect((await underline(crumb)).line).toBe('none');
    for (const link of [crumb, tableLink]) {
      await focusByKeyboard(page, link);
      const focused = await underline(link);
      expect(focused.line).toBe('underline');
      expect(focused.skipInk).toBe('none');
    }
  });

  test('a link inside a line of text is underlined at rest, unbroken', async ({
    page,
  }) => {
    await openRun(page, 2);
    const link = page.getByRole('link', { name: en.runDetail.savedByRefresh });
    const style = await underline(link);
    expect(style.line).toBe('underline');
    expect(style.skipInk).toBe('none');
    expect(style.thickness).toBe('1px');
  });

  test('a link inside a plain paragraph is underlined at rest, with no class', async ({
    page,
  }) => {
    await openRuns(page);
    const link = await page.evaluate(() => {
      const paragraph = document.createElement('p');
      paragraph.innerHTML = 'See <a id="plain" href="#x">this</a> text.';
      document.body.append(paragraph);
      const style = getComputedStyle(paragraph.querySelector('a')!);
      return {
        line: style.textDecorationLine,
        skipInk: style.textDecorationSkipInk,
        thickness: style.textDecorationThickness,
      };
    });
    expect(link).toEqual({
      line: 'underline',
      skipInk: 'none',
      thickness: '1px',
    });
  });

  test('a time cell stays on one line at a narrow width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openRuns(page);
    const cell = rows(page).nth(0).locator('th');
    const lines = await cell.evaluate((element) => {
      const range = element.ownerDocument.createRange();
      range.selectNodeContents(element);
      return new Set(
        Array.from(range.getClientRects()).map((rect) => Math.round(rect.top)),
      ).size;
    });
    expect(lines).toBe(1);
  });
});
