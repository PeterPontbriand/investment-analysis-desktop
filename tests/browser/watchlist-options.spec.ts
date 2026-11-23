// An entry's stored options and the remedy for an unreadable entry (GUI.3b),
// on the watchlist screen.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { engineUrl, mockEngine, type Handler } from './engine-mock.ts';
import { coreId, watchlistDocuments } from '../fixtures/api/data.ts';
import * as actions from '../fixtures/api/actions.ts';
import * as selection from '../fixtures/api/selection.ts';
import { failure, ok } from '../fixtures/api/server.ts';
import type { components } from '../../src/api/schema.ts';
import en from '../../src/locales/en.json' with { type: 'json' };

test.use({ allowedHttpStatuses: [404, 409, 503] });

type Watchlist = components['schemas']['WatchlistDocument'];
type Entry = Watchlist['entries'][number];

const stored = (
  index: number,
  ticker: string,
  selectionFields: Record<string, unknown>,
): Entry => ({
  index,
  ticker,
  selection: selectionFields as unknown as Entry['selection'],
});

// One entry of each shape the options list shows. The Graham Growth entry
// also stores a field its form does not declare.
const storedEntries: Entry[] = [
  stored(1, 'ACME', {
    method_id: 'sma_crossover',
    short_window: 50,
    long_window: 200,
    rsi_period: 14,
    as_of: null,
    use_cache: true,
  }),
  stored(2, 'ACME', {
    method_id: 'graham_growth_value',
    eps_basis: 'three_year_average',
    eps_override: null,
    quote_override: null,
    expected_growth: 6.5,
    aaa_yield_override: 4.9,
    as_of: '2025-12-31',
    use_cache: true,
    legacy_flag: 'old',
  }),
  stored(3, 'BOLT', {
    method_id: 'reported_fcf_eps_cagr',
    policy: {
      historical_horizon: '3',
      classification_basis: 'fcf_per_share',
      forward_policy: 'hard_gate',
    },
    currency: 'USD',
    as_of: null,
    use_cache: false,
  }),
  stored(4, 'BOLT', {
    method_id: 'quality_screen',
    weight: 1234.5,
    tilt: 'growth',
    sector: 'energy',
    target: null,
    strict: true,
    limits: { ceiling: 80, note: 'kept' },
    as_of: null,
    use_cache: true,
  }),
  stored(5, 'ZED', {
    method_id: 'graham_growth_value',
    eps_basis: 'fiscal_year',
    eps_override: 2.25,
    quote_override: null,
    expected_growth: 3,
    aaa_yield_override: 4.5,
    as_of: null,
    use_cache: false,
  }),
];

const withStored: Watchlist = {
  ...watchlistDocuments[coreId]!,
  entries: storedEntries,
};

const rowName = (verb: 'show' | 'hide', n: number, rest: string) =>
  (verb === 'show' ? en.watchlist.showOptions : en.watchlist.hideOptions)
    .replace('{index}', String(n))
    .replace('{ticker}', rest.split(', ')[0]!)
    .replace('{strategy}', rest.split(', ')[1]!);

async function openCore(page: Page, extra?: Handler) {
  const served = selection.selectionHandler();
  const engine = await mockEngine(page, async (url, request) => {
    const answer = await extra?.(url, request);
    if (answer !== undefined) return answer;
    if (url.pathname === `/v1/watchlists/${coreId}` && request.method === 'GET')
      return ok(withStored);
    return served(url);
  });
  await page.goto(engineUrl);
  await page.getByRole('link', { name: 'Core' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Core');
  return engine;
}

const optionsOf = async (page: Page, n: number) => {
  const row = page.locator(`#entry-options-${n}`);
  await expect(row.locator('dt').first()).toBeVisible();
  const labels = await row.locator('dt').allInnerTexts();
  const values = await row.locator('dd:not(.nested)').allInnerTexts();
  return { row, labels, values };
};

test.describe('stored options', () => {
  test("shows and hides an entry's options, as the button's name says", async ({
    page,
  }) => {
    await openCore(page);
    const show = page.getByRole('button', {
      name: rowName('show', 2, 'ACME, Graham Growth'),
    });
    await expect(show).toHaveAttribute('aria-expanded', 'false');
    await expect(show).toHaveText(en.selection.show);
    await expect(page.locator('#entry-options-2')).toHaveCount(0);

    await show.click();
    const hide = page.getByRole('button', {
      name: rowName('hide', 2, 'ACME, Graham Growth'),
    });
    await expect(hide).toHaveAttribute('aria-expanded', 'true');
    await expect(hide).toHaveText(en.selection.hide);
    expect(await hide.getAttribute('aria-controls')).toBe('entry-options-2');

    const { labels, values } = await optionsOf(page, 2);
    // The engine's order and labels; no As of row, and the field the form
    // does not declare is not shown.
    expect(labels).toEqual([
      'EPS basis',
      'Earnings per share override',
      'Share price override',
      'Expected growth rate',
      'AAA corporate bond yield',
      'Use cached data',
    ]);
    expect(values).toEqual([
      'Three-Year-Average EPS',
      en.selection.notSet,
      en.selection.notSet,
      '6.5',
      '4.9',
      en.selection.yes,
    ]);
    await expect(page.locator('#entry-options-2')).not.toContainText('old');
    await expect(
      page.locator('#entry-options-2 [data-term-id="three-year-average-eps"]'),
    ).toBeVisible();

    await hide.click();
    await expect(page.locator('#entry-options-2')).toHaveCount(0);
    await expect(show).toHaveAttribute('aria-expanded', 'false');
  });

  test('shows whole numbers, booleans, a nested group and option names', async ({
    page,
  }) => {
    await openCore(page);
    await page
      .getByRole('button', { name: rowName('show', 1, 'ACME, Momentum') })
      .click();
    const momentum = await optionsOf(page, 1);
    expect(momentum.labels).toEqual([
      'Short window',
      'Long window',
      'RSI period',
      'Use cached data',
    ]);
    expect(momentum.values).toEqual(['50', '200', '14', en.selection.yes]);

    await page
      .getByRole('button', { name: rowName('show', 3, 'BOLT, FCF Growth') })
      .click();
    const fcf = await optionsOf(page, 3);
    expect(fcf.labels).toEqual([
      'Growth policy',
      'Historical horizon',
      'Classification basis',
      'Forward policy',
      'Reporting currency',
      'Use cached data',
    ]);
    expect(fcf.values).toEqual([
      'Three-Year Horizon',
      'FCF-per-Share Basis',
      'Hard-Gate Policy',
      'USD',
      en.selection.no,
    ]);
    // The nested fields sit under the group's label, indented.
    const group = fcf.row.locator('dd.nested');
    await expect(group.locator('dt')).toHaveCount(3);
  });

  test('shows a made-up strategy, a number in the locale and a value not set', async ({
    page,
  }) => {
    await openCore(page);
    await page
      .getByRole('button', { name: rowName('show', 4, 'BOLT, Quality Screen') })
      .click();
    const { labels, values } = await optionsOf(page, 4);
    expect(labels).toEqual([
      'Lowest score',
      'Screen weight',
      'Style tilt',
      'Sector',
      'Target price',
      'Strict mode',
      'Limits',
      'Price ceiling',
      'Note',
      'Use cached data',
    ]);
    expect(values).toEqual([
      en.selection.notSet,
      '1,234.5',
      'Growth Tilt',
      'energy',
      en.selection.notSet,
      en.selection.yes,
      '80',
      'kept',
      en.selection.yes,
    ]);
  });

  test("asks for each strategy's form once, the first time one of its entries is shown", async ({
    page,
  }) => {
    const engine = await openCore(page);
    const forms = (method: string) =>
      engine.paths(`/v1/strategies/${method}/selection`).length;
    expect(forms('graham_growth_value')).toBe(0);
    await page
      .getByRole('button', { name: rowName('show', 2, 'ACME, Graham Growth') })
      .click();
    await expect(page.locator('#entry-options-2')).toBeVisible();
    await page
      .getByRole('button', { name: rowName('hide', 2, 'ACME, Graham Growth') })
      .click();
    await page
      .getByRole('button', { name: rowName('show', 5, 'ZED, Graham Growth') })
      .click();
    const { values } = await optionsOf(page, 5);
    expect(values).toEqual([
      'Fiscal-Year EPS',
      '2.25',
      en.selection.notSet,
      '3',
      '4.5',
      en.selection.no,
    ]);
    expect(forms('graham_growth_value')).toBe(1);
    expect(forms('sma_crossover')).toBe(0);
  });

  test('shows a failure to fetch the form inside the expanded row, with Try again', async ({
    page,
  }) => {
    let broken = true;
    await openCore(page, (url) =>
      broken && url.pathname === '/v1/strategies/sma_crossover/selection'
        ? failure(503, 'database_busy', 'busy')
        : undefined,
    );
    await page
      .getByRole('button', { name: rowName('show', 1, 'ACME, Momentum') })
      .click();
    const row = page.locator('#entry-options-1');
    await expect(row.getByText(en.state.databaseBusy)).toBeVisible();
    broken = false;
    await row.getByRole('button', { name: en.common.tryAgain }).click();
    await expect(row.getByText('Short window')).toBeVisible();
  });

  test('can be shown from the keyboard', async ({ page }) => {
    await openCore(page);
    const show = page.getByRole('button', {
      name: rowName('show', 1, 'ACME, Momentum'),
    });
    await show.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#entry-options-1')).toBeVisible();
    await page
      .getByRole('button', { name: rowName('hide', 1, 'ACME, Momentum') })
      .focus();
    await page.keyboard.press('Space');
    await expect(page.locator('#entry-options-1')).toHaveCount(0);
  });
});

test.describe('an unreadable entry', () => {
  const unreadable = selection.unreadableFailure;
  const dialog = (page: Page) => page.getByRole('dialog');
  const removeLabel = en.watchlist.removeUnreadable
    .replace('{index}', '2')
    .replace('{ticker}', 'ACME');

  test('offers to remove the entry and to delete the watchlist, without the stored method', async ({
    page,
  }) => {
    await mockEngine(page, (url) =>
      url.pathname === `/v1/watchlists/${coreId}` ? unreadable() : undefined,
    );
    await page.goto(engineUrl);
    await page.getByRole('link', { name: 'Core' }).click();
    await expect(
      page.getByText(
        'Entry 2 was saved by a different version and cannot be read.',
      ),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: removeLabel })).toBeVisible();
    await expect(
      page.getByRole('button', { name: en.watchlist.deleteThis }),
    ).toBeVisible();
    await expect(page.getByText('retired_method')).toHaveCount(0);
  });

  test('offers only the delete when the failure names no entry', async ({
    page,
  }) => {
    await mockEngine(page, (url) =>
      url.pathname === `/v1/watchlists/${coreId}`
        ? failure(
            409,
            'stored_selection_unreadable',
            'An entry cannot be read.',
          )
        : undefined,
    );
    await page.goto(engineUrl);
    await page.getByRole('link', { name: 'Core' }).click();
    await expect(page.getByText('An entry cannot be read.')).toBeVisible();
    await expect(
      page.getByRole('button', { name: en.watchlist.deleteThis }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^Remove entry/ }),
    ).toHaveCount(0);
  });

  async function openUnreadable(page: Page, handler: Handler) {
    let removed = false;
    const engine = await mockEngine(page, (url, request) => {
      if (url.pathname === `/v1/watchlists/${coreId}/entries/2`) {
        removed = true;
        return handler(url, request);
      }
      if (url.pathname === `/v1/watchlists/${coreId}` && !removed)
        return unreadable();
      return undefined;
    });
    await page.goto(engineUrl);
    await page.getByRole('link', { name: 'Core' }).click();
    await page.getByRole('button', { name: removeLabel }).focus();
    await page.keyboard.press('Enter');
    return engine;
  }

  test('removes the entry after a confirmation that names it, and shows the watchlist', async ({
    page,
  }) => {
    const engine = await openUnreadable(page, () => ok(actions.removal(1)));
    await expect(
      dialog(page).getByRole('heading', {
        name: en.watchlist.removeUnreadableTitle
          .replace('{index}', '2')
          .replace('{ticker}', 'ACME'),
      }),
    ).toBeVisible();
    await expect(dialog(page).getByText(en.actions.runsKept)).toBeVisible();
    await expect(dialog(page)).not.toContainText('retired_method');
    await dialog(page)
      .getByRole('button', { name: en.watchlist.removeAction })
      .click();
    await expect(
      page.getByRole('status').filter({
        hasText: en.watchlist.removed.split(' | ')[0]!.replace('{count}', '1'),
      }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Core');
    const request = engine.actions(
      'DELETE',
      `/v1/watchlists/${coreId}/entries/2`,
    )[0];
    expect(request?.body).toBeUndefined();
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  });

  test("shows the next unreadable entry's remedy when the removal finds another", async ({
    page,
  }) => {
    await openUnreadable(page, () =>
      ok({
        ...actions.removalUnreadable,
        unreadable: {
          entry_number: 3,
          ticker: 'ZED',
          method_id: 'retired_again',
          reason:
            'Entry 3 was saved by a different version and cannot be read.',
        },
      }),
    );
    await dialog(page)
      .getByRole('button', { name: en.watchlist.removeAction })
      .click();
    await expect(
      page.getByText(
        'Entry 3 was saved by a different version and cannot be read.',
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: en.watchlist.removeUnreadable
          .replace('{index}', '3')
          .replace('{ticker}', 'ZED'),
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: en.watchlist.deleteThis }),
    ).toBeVisible();
    await expect(page.getByText('retired_again')).toHaveCount(0);
  });

  test('shows a failure inside the dialog, reads "Removing…" while pending and returns focus on Escape', async ({
    page,
  }) => {
    let release: () => void = () => undefined;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    await openUnreadable(page, async () => {
      await hold;
      return actions.failures.entryNotFound;
    });
    const confirm = dialog(page).getByRole('button', {
      name: en.watchlist.removeAction,
    });
    await confirm.click();
    const pending = dialog(page).getByRole('button', {
      name: en.actions.removing,
    });
    await expect(pending).toHaveAttribute('aria-disabled', 'true');
    release();
    await expect(
      dialog(page)
        .getByRole('alert')
        .getByText('The watchlist has no entry 9.'),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: removeLabel })).toBeFocused();
  });
});
