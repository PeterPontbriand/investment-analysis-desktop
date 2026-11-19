// Add entries (GUI.3b): engine errors at their fields, several strategies, the
// pending state, cancel, unsupported options, keyboard use and text direction.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { engineUrl, mockEngine } from './engine-mock.ts';
import { failure, type Reply } from '../fixtures/api/server.ts';
import * as selection from '../fixtures/api/selection.ts';
import {
  add,
  added,
  asOf,
  bodies,
  checkbox,
  choose,
  describedBy,
  field,
  heading,
  openAdd,
  posts,
  showOptions,
  status,
  strategy,
  tickers,
  type Options,
} from './add-entries-helpers.ts';
import en from '../../src/locales/en.json' with { type: 'json' };
import ar from '../fixtures/locales/ar-XB.json' with { type: 'json' };

// The failures these tests provoke are logged by the browser.
test.use({ allowedHttpStatuses: [400, 409, 503] });

test.describe('engine errors at their fields', () => {
  async function momentumForm(page: Page, options: Options) {
    const engine = await openAdd(page, options);
    await tickers(page).fill('KO');
    await asOf(page).fill('2025-12-31');
    await choose(page, 'Momentum');
    await showOptions(page, 'Momentum');
    const box = strategy(page, 'Momentum');
    await field(box, 'Short window').fill('200');
    await field(box, 'Long window').fill('50');
    return { engine, box };
  }

  test('shows an error that names two fields once, at the first, tied to both', async ({
    page,
  }) => {
    const { engine, box } = await momentumForm(page, {
      fail: () => selection.failures.windowOrder,
    });
    // Close the options: an error opens them again.
    await page
      .getByRole('button', {
        name: en.selection.hideOptions.replace('{strategy}', 'Momentum'),
      })
      .click();
    await add(page).click();
    const message = page.getByText(
      'Invalid momentum windows: Short window (200) must be smaller than Long window (50).',
    );
    await expect(message).toHaveCount(1);
    const short = field(box, 'Short window');
    await describedBy(short, message);
    await describedBy(field(box, 'Long window'), message);
    await expect(short).toBeFocused();
    expect(posts(engine)).toHaveLength(1);
    await expect(heading(page)).toHaveText(
      en.addEntries.heading.replace('{name}', 'Core'),
    );
  });

  test('puts an error that lists its fields in reverse at the first in form order', async ({
    page,
  }) => {
    const { box } = await momentumForm(page, {
      fail: () => selection.failures.twoFields,
    });
    await add(page).click();
    const message = page.getByText(
      'Long window (50) must exceed Short window (200).',
    );
    await expect(message).toHaveCount(1);
    await describedBy(field(box, 'Short window'), message);
    await describedBy(field(box, 'Long window'), message);
    await expect(field(box, 'Short window')).toBeFocused();
  });

  test('shows a duplicate at Tickers, for a twin in the watchlist and in the request', async ({
    page,
  }) => {
    let reply = selection.failures.duplicate;
    await openAdd(page, { fail: () => reply });
    await tickers(page).fill('KO');
    await choose(page, 'Momentum');
    await add(page).click();
    const message = page.getByText(
      'Tickers must not duplicate an entry: KO is already listed for Momentum with an equal selection in the watchlist.',
    );
    await expect(message).toBeVisible();
    await describedBy(tickers(page), message);
    await expect(tickers(page)).toBeFocused();
    reply = selection.failures.twinInRequest;
    await add(page).click();
    await expect(
      page.getByText(
        'Tickers must not duplicate an entry: KO is listed twice for Momentum with an equal selection in this request.',
      ),
    ).toBeVisible();
    await expect(page.getByText('already listed')).toHaveCount(0);
  });

  test('shows a ticker error and an as-of error at their fields', async ({
    page,
  }) => {
    let reply = selection.failures.tickerAt;
    await openAdd(page, { fail: () => reply });
    await tickers(page).fill('KO, ');
    await choose(page, 'Piotroski F-Score');
    await add(page).click();
    const ticker = page.getByText('Tickers must not be empty.');
    await expect(ticker).toBeVisible();
    await describedBy(tickers(page), ticker);
    reply = selection.failures.asOf;
    await add(page).click();
    const message = page.getByText(
      'Invalid As of: Input should be a valid datetime',
    );
    await expect(message).toBeVisible();
    await describedBy(asOf(page), message);
    await expect(asOf(page)).toBeFocused();
  });

  test('shows an error for a nested field in the options of its strategy, opening them', async ({
    page,
  }) => {
    await openAdd(page, { fail: () => selection.failures.nested });
    await tickers(page).fill('KO');
    await choose(page, 'FCF Growth');
    await add(page).click();
    const box = strategy(page, 'FCF Growth');
    const message = box.getByText(
      'Invalid Forward policy: Input should be a valid value',
    );
    await expect(message).toBeVisible();
    await describedBy(field(box, 'Forward policy'), message);
    await expect(field(box, 'Forward policy')).toBeFocused();
  });

  test('shows an error that names no field above Add, with its number in the locale', async ({
    page,
  }) => {
    let reply = selection.failures.methodId;
    await openAdd(page, { fail: () => reply });
    await tickers(page).fill('KO');
    await choose(page, 'Piotroski F-Score');
    await add(page).click();
    await expect(
      page.getByText('The method_id is not a declared method.'),
    ).toBeVisible();
    reply = selection.failures.unrecognised;
    await add(page).click();
    await expect(
      page.getByText('body.extra was not expected (1,234.5).'),
    ).toBeVisible();
    await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);
  });

  test('shows a failure with no list of errors, and an unreadable entry, above Add', async ({
    page,
  }) => {
    let reply: Reply = selection.failures.shape;
    await openAdd(page, { fail: () => reply });
    await tickers(page).fill('KO');
    await choose(page, 'Piotroski F-Score');
    await add(page).click();
    await expect(page.getByText(en.state.defect)).toBeVisible();
    await expect(page.getByText('The body is not valid JSON.')).toHaveCount(0);
    reply = selection.unreadableFailure();
    await add(page).click();
    await expect(
      page.getByText(
        'Entry 2 was saved by a different version and cannot be read.',
      ),
    ).toBeVisible();
    await expect(page.getByText(en.state.defect)).toHaveCount(0);
  });
});

test.describe('several strategies', () => {
  test('keeps the strategies that were not added and says which were', async ({
    page,
  }) => {
    let failing = true;
    const engine = await openAdd(page, {
      fail: (method) =>
        failing && method === 'graham_growth_value'
          ? selection.failures.duplicate
          : undefined,
    });
    await tickers(page).fill('KO, PG');
    await choose(page, 'Momentum');
    await choose(page, 'Graham Number');
    await choose(page, 'Graham Growth');
    const box = strategy(page, 'Graham Growth');
    await field(box, 'Expected growth rate').fill('6.5');
    await field(box, 'AAA corporate bond yield').fill('4.9');
    await add(page).click();

    const line = en.addEntries.partial
      .split(' | ')[1]!
      .replace('{count}', '4')
      .replace('{strategies}', 'Momentum and Graham Number');
    await expect(status(page, line)).toBeVisible();
    await expect(checkbox(page, 'Momentum')).not.toBeChecked();
    await expect(checkbox(page, 'Graham Number')).not.toBeChecked();
    await expect(checkbox(page, 'Graham Growth')).toBeChecked();
    await expect(
      page.getByText(/must not duplicate an entry: KO is already listed/),
    ).toBeVisible();
    expect(posts(engine)).toHaveLength(3);

    // Sending again adds only what is still chosen; the notice counts every
    // entry added since the form loaded.
    failing = false;
    await add(page).click();
    await expect(heading(page)).toHaveText('Core');
    expect(posts(engine)).toHaveLength(4);
    expect(posts(engine).at(-1)?.body).toMatchObject({
      method_id: 'graham_growth_value',
    });
    await expect(status(page, added(6))).toBeVisible();
  });

  test('says one entry was added when one was', async ({ page }) => {
    await openAdd(page, {
      fail: (method) =>
        method === 'graham_growth_value'
          ? selection.failures.duplicate
          : undefined,
    });
    await tickers(page).fill('KO');
    await choose(page, 'Graham Number');
    await choose(page, 'Graham Growth');
    const box = strategy(page, 'Graham Growth');
    await field(box, 'Expected growth rate').fill('6.5');
    await field(box, 'AAA corporate bond yield').fill('4.9');
    await add(page).click();
    await expect(
      status(
        page,
        en.addEntries.partial
          .split(' | ')[0]!
          .replace('{count}', '1')
          .replace('{strategies}', 'Graham Number'),
      ),
    ).toBeVisible();
  });

  test('shows no status line when the first request fails', async ({
    page,
  }) => {
    await openAdd(page, { fail: () => selection.failures.duplicate });
    await tickers(page).fill('KO');
    await choose(page, 'Momentum');
    await add(page).click();
    await expect(page.getByText(/already listed/)).toBeVisible();
    await expect(
      status(page, en.addEntries.partial.split('. ')[1]!.split(' | ')[0]!),
    ).toHaveCount(0);
  });
});

test.describe('pending, cancel and unsupported options', () => {
  test('reads "Adding…" and ignores a second activation while a request runs', async ({
    page,
  }) => {
    let release: () => void = () => undefined;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const engine = await openAdd(page, { hold });
    await tickers(page).fill('KO');
    await choose(page, 'Piotroski F-Score');
    await add(page).click();
    const pending = page.getByRole('button', { name: en.addEntries.adding });
    await expect(pending).toHaveAttribute('aria-disabled', 'true');
    await expect(pending).not.toHaveAttribute('disabled', /.*/);
    await pending.dispatchEvent('click');
    await pending.focus();
    await page.keyboard.press('Enter');
    release();
    await expect(heading(page)).toHaveText('Core');
    expect(posts(engine)).toHaveLength(1);
  });

  test('cancels without asking, even with input typed, and sends nothing', async ({
    page,
  }) => {
    const engine = await openAdd(page);
    await tickers(page).fill('KO, MSFT');
    await choose(page, 'Momentum');
    await page.getByRole('button', { name: en.actions.cancel }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(heading(page)).toHaveText('Core');
    expect(posts(engine)).toHaveLength(0);
  });

  test('blocks a strategy whose required option cannot be set, and no other', async ({
    page,
  }) => {
    const engine = await openAdd(page, {
      strategies: selection.exoticStrategies,
    });
    await tickers(page).fill('KO');
    await choose(page, 'Exotic Screen');
    await choose(page, 'Graham Number');
    await add(page).click();
    const box = strategy(page, 'Exotic Screen');
    await expect(box.getByText(en.selection.unsupported)).toBeVisible();
    expect(posts(engine)).toHaveLength(0);
    // The other strategies still can be added.
    await checkbox(page, 'Exotic Screen').uncheck();
    await add(page).click();
    await expect(heading(page)).toHaveText('Core');
    expect(bodies(posts(engine))).toEqual([
      {
        method_id: 'graham_number',
        tickers: ['KO'],
        selection: { use_cache: true },
      },
    ]);
  });

  test('shows an optional option that cannot be set and still adds the strategy', async ({
    page,
  }) => {
    const engine = await openAdd(page, {
      strategies: selection.exoticStrategies,
    });
    await tickers(page).fill('KO');
    await choose(page, 'Odd Screen');
    await showOptions(page, 'Odd Screen');
    await expect(
      strategy(page, 'Odd Screen').getByText(en.selection.unsupported),
    ).toBeVisible();
    await add(page).click();
    await expect(heading(page)).toHaveText('Core');
    expect(posts(engine)).toHaveLength(1);
  });

  test('shows a failed selection form in its strategy, with Try again, while the others work', async ({
    page,
  }) => {
    let broken = true;
    const engine = await openAdd(page, {
      extra: (url) =>
        broken && url.pathname === '/v1/strategies/graham_number/selection'
          ? failure(503, 'database_busy', 'busy')
          : undefined,
    });
    await showOptions(page, 'Graham Number');
    const box = strategy(page, 'Graham Number');
    await expect(box.getByText(en.engine.state.databaseBusy)).toBeVisible();
    await tickers(page).fill('KO');
    await choose(page, 'Piotroski F-Score');
    broken = false;
    await box.getByRole('button', { name: en.common.tryAgain }).click();
    await expect(field(box, 'Use cached data')).toBeVisible();
    await add(page).click();
    await expect(heading(page)).toHaveText('Core');
    expect(posts(engine)).toHaveLength(1);
  });
});

test.describe('keyboard and text direction', () => {
  test('can be filled and sent from the keyboard alone', async ({ page }) => {
    const engine = await openAdd(page);
    await tickers(page).focus();
    await page.keyboard.type('KO');
    await checkbox(page, 'Piotroski F-Score').focus();
    await page.keyboard.press('Space');
    await expect(checkbox(page, 'Piotroski F-Score')).toBeChecked();
    await page
      .getByRole('button', {
        name: en.selection.showOptions.replace(
          '{strategy}',
          'Piotroski F-Score',
        ),
      })
      .focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('button', {
        name: en.selection.hideOptions.replace(
          '{strategy}',
          'Piotroski F-Score',
        ),
      }),
    ).toHaveAttribute('aria-expanded', 'true');
    await add(page).focus();
    await page.keyboard.press('Enter');
    await expect(heading(page)).toHaveText('Core');
    expect(posts(engine)).toHaveLength(1);
  });

  test('follows the pseudo-locale direction and words', async ({ page }) => {
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
    await mockEngine(page, selection.selectionHandler());
    await page.goto(engineUrl);
    await page.getByRole('link', { name: 'Core' }).click();
    await page.getByRole('button', { name: ar.watchlist.addEntries }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(heading(page)).toHaveText(
      ar.addEntries.heading.replace('{name}', 'Core'),
    );
    const addButton = page.getByRole('button', {
      name: ar.addEntries.add,
      exact: true,
    });
    const cancel = page.getByRole('button', { name: ar.actions.cancel });
    const addBox = await addButton.boundingBox();
    const cancelBox = await cancel.boundingBox();
    // Cancel comes first in the source, so in right-to-left text it is the
    // button on the right.
    expect((cancelBox?.x ?? 0) > (addBox?.x ?? 0)).toBe(true);
    await addButton.click();
    await expect(
      page.getByText(ar.addEntries.errors.tickersRequired),
    ).toBeVisible();
    // Options open when the strategy is chosen with a required option empty.
    await checkbox(page, 'Graham Growth').check();
    const box = strategy(page, 'Graham Growth');
    const options = box.locator('.options');
    expect(
      await options.evaluate((element) => getComputedStyle(element).direction),
    ).toBe('rtl');
    // The options are indented from the inline start: the right edge.
    const optionsBox = await options.boundingBox();
    const rowBox = await box.locator('.row').boundingBox();
    expect(
      (optionsBox?.x ?? 0) + (optionsBox?.width ?? 0) <=
        (rowBox?.x ?? 0) + (rowBox?.width ?? 0),
    ).toBe(true);
    expect(
      (optionsBox?.x ?? 0) + (optionsBox?.width ?? 0) <
        (rowBox?.x ?? 0) + (rowBox?.width ?? 0),
    ).toBe(true);
  });
});
