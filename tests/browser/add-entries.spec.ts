// Add entries (GUI.3b): the screen, the requests it sends and the checks it
// makes before sending, driven against the engine mock.
import { expect, test } from './fixtures.ts';
import { engineUrl, mockEngine } from './engine-mock.ts';
import { coreId } from '../fixtures/api/data.ts';
import { failure } from '../fixtures/api/server.ts';
import * as selection from '../fixtures/api/selection.ts';
import {
  add,
  added,
  asOf,
  bodies,
  choose,
  describedBy,
  field,
  heading,
  openAdd,
  expanded,
  uncheck,
  posts,
  showOptions,
  status,
  strategy,
  tickers,
} from './add-entries-helpers.ts';
import en from '../../src/locales/en.json' with { type: 'json' };

// The failures these tests provoke are logged by the browser.
test.use({ allowedHttpStatuses: [400, 404, 409] });

test.describe('the screen', () => {
  test('has its own route, heading and trail', async ({ page }) => {
    await openAdd(page);
    const crumb = page.getByRole('navigation', { name: en.breadcrumb.label });
    await expect(crumb.getByRole('listitem')).toHaveText([
      en.nav.watchlists,
      'Core',
    ]);
    await expect(crumb.locator('[aria-current]')).toHaveCount(0);
    await crumb.getByRole('link', { name: 'Core' }).click();
    await expect(heading(page)).toHaveText('Core');
  });

  test('is offered for an empty watchlist', async ({ page }) => {
    await mockEngine(page);
    await page.goto(engineUrl);
    await page.getByRole('link', { name: 'Empty' }).click();
    await expect(heading(page)).toHaveText('Empty');
    await page.getByRole('button', { name: en.watchlist.addEntries }).click();
    await expect(heading(page)).toHaveText(
      en.addEntries.heading.replace('{name}', 'Empty'),
    );
  });

  test('is not offered when the watchlist cannot be read', async ({ page }) => {
    await mockEngine(page, (url) =>
      url.pathname === `/v1/watchlists/${coreId}`
        ? selection.unreadableFailure()
        : undefined,
    );
    await page.goto(engineUrl);
    await page.getByRole('link', { name: 'Core' }).click();
    await expect(page.getByText(/cannot be read/)).toBeVisible();
    await expect(
      page.getByRole('button', { name: en.watchlist.addEntries }),
    ).toHaveCount(0);
  });

  test('shows a load failure like the other screens', async ({ page }) => {
    let opened = false;
    await mockEngine(page, (url) =>
      opened && url.pathname === `/v1/watchlists/${coreId}`
        ? failure(404, 'watchlist_not_found', 'No such watchlist.')
        : undefined,
    );
    await page.goto(engineUrl);
    await page.getByRole('link', { name: 'Core' }).click();
    await expect(heading(page)).toHaveText('Core');
    opened = true;
    await page.getByRole('button', { name: en.watchlist.addEntries }).click();
    await expect(page.getByText('No such watchlist.')).toBeVisible();
    await expect(add(page)).toHaveCount(0);
  });

  test("lists the strategies in the engine's order, every strategy's options hidden", async ({
    page,
  }) => {
    await openAdd(page);
    await expect(page.locator('.strategy > .row label')).toHaveText([
      'Momentum',
      'Graham Number',
      'Graham Growth',
      'FCF Growth',
      'Piotroski F-Score',
      'Quality Screen',
    ]);
    for (const name of [
      'Momentum',
      'Graham Number',
      'Graham Growth',
      'FCF Growth',
      'Piotroski F-Score',
      'Quality Screen',
    ])
      expect(await expanded(page, name), name).toBe('false');
    await expect(page.locator('.options')).toHaveCount(0);
  });

  test("opens a strategy's options when it is chosen with a required option empty, and not otherwise", async ({
    page,
  }) => {
    await openAdd(page);
    await choose(page, 'Momentum');
    expect(await expanded(page, 'Momentum')).toBe('false');
    await choose(page, 'Graham Growth');
    expect(await expanded(page, 'Graham Growth')).toBe('true');
    // Opening options never moves focus: chosen from the keyboard, the box keeps it.
    const quality = page.getByRole('checkbox', {
      name: 'Quality Screen',
      exact: true,
    });
    await quality.focus();
    await page.keyboard.press('Space');
    expect(await expanded(page, 'Quality Screen')).toBe('true');
    await expect(quality).toBeFocused();
    // The button still works on a strategy that is not chosen.
    await showOptions(page, 'Piotroski F-Score');
    expect(await expanded(page, 'Piotroski F-Score')).toBe('true');
  });

  test('hides the options when a strategy is unchecked, keeping the values', async ({
    page,
  }) => {
    await openAdd(page);
    await choose(page, 'Graham Growth');
    const box = strategy(page, 'Graham Growth');
    await field(box, 'Expected growth rate').fill('6.5');
    await uncheck(page, 'Graham Growth');
    expect(await expanded(page, 'Graham Growth')).toBe('false');
    await expect(page.locator('.options')).toHaveCount(0);
    // One required option is still empty: choosing again opens them, and
    // what was typed is back.
    await choose(page, 'Graham Growth');
    expect(await expanded(page, 'Graham Growth')).toBe('true');
    await expect(field(box, 'Expected growth rate')).toHaveValue('6.5');
    await field(box, 'AAA corporate bond yield').fill('4.9');
    await uncheck(page, 'Graham Growth');
    // Every required option has a value now: choosing again leaves them hidden.
    await choose(page, 'Graham Growth');
    expect(await expanded(page, 'Graham Growth')).toBe('false');
    await showOptions(page, 'Graham Growth');
    await expect(field(box, 'AAA corporate bond yield')).toHaveValue('4.9');
  });

  test('opens a strategy chosen while its form loads once the form arrives, if still chosen', async ({
    page,
  }) => {
    let release: () => void = () => undefined;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    await openAdd(page, {
      extra: async (url) => {
        if (
          url.pathname === '/v1/strategies/graham_growth_value/selection' ||
          url.pathname === '/v1/strategies/quality_screen/selection'
        )
          await hold;
        return undefined;
      },
    });
    await choose(page, 'Graham Growth');
    await choose(page, 'Quality Screen');
    await uncheck(page, 'Quality Screen');
    expect(await expanded(page, 'Graham Growth')).toBe('false');
    release();
    await expect(
      strategy(page, 'Graham Growth').getByLabel('Expected growth rate'),
    ).toBeVisible();
    expect(await expanded(page, 'Graham Growth')).toBe('true');
    // Unchecked before the form arrived: it stays hidden.
    expect(await expanded(page, 'Quality Screen')).toBe('false');
  });

  test("builds the Graham Growth options from the engine's form, with no raw codes", async ({
    page,
  }) => {
    await openAdd(page);
    await choose(page, 'Graham Growth');
    const box = strategy(page, 'Graham Growth');
    await expect(box.locator('.fields label')).toHaveText([
      'EPS basis',
      'Earnings per share override',
      'Share price override',
      'Expected growth rate *',
      'AAA corporate bond yield *',
      'Use cached data',
    ]);
    // As of is the shared field above the strategies, never one of the options.
    await expect(box.getByLabel(en.addEntries.asOf)).toHaveCount(0);
    const growth = field(box, 'Expected growth rate');
    await expect(growth).toHaveAttribute('aria-required', 'true');
    await expect(growth).toHaveAttribute('type', 'number');
    await expect(growth).toHaveAttribute('step', 'any');
    await expect(
      box.getByText('Expected annual earnings growth, in percentage points.'),
    ).toBeVisible();
    await expect(box.locator('label[data-term-id="eps-basis"]')).toHaveCount(1);
    const basis = field(box, 'EPS basis');
    await expect(basis.locator('option')).toHaveText([
      'Three-Year-Average EPS',
      'Fiscal-Year EPS',
    ]);
    await expect(basis.locator('option').first()).toHaveAttribute(
      'data-term-id',
      'three-year-average-eps',
    );
    await expect(basis).toHaveValue('three_year_average');
    await expect(box).not.toContainText('three_year_average');
    await expect(field(box, 'Use cached data')).toBeChecked();
    await expect(field(box, 'Earnings per share override')).toHaveValue('');
    await expect(page.getByText(en.addEntries.requiredNote)).toBeVisible();
  });

  test('shows the nested group and its option names', async ({ page }) => {
    await openAdd(page);
    await showOptions(page, 'FCF Growth');
    const box = strategy(page, 'FCF Growth');
    const group = box.getByRole('group', { name: 'Growth policy' });
    await expect(group).toBeVisible();
    await expect(group.locator('label')).toHaveText([
      'Historical horizon',
      'Classification basis',
      'Forward policy',
    ]);
    await expect(
      group.getByLabel('Historical horizon').locator('option'),
    ).toHaveText([
      'Longest Available Horizon',
      'Three-Year Horizon',
      'Four-Year Horizon',
      'Five-Year Horizon',
    ]);
    await expect(
      group.getByLabel('Classification basis').locator('option'),
    ).toHaveText(['Total FCF Basis', 'FCF-per-Share Basis']);
    await expect(
      group.getByLabel('Forward policy').locator('option'),
    ).toHaveText([
      'Display-Only Policy',
      'Confirmation Policy',
      'Hard-Gate Policy',
    ]);
    await expect(field(box, 'Reporting currency')).toHaveValue('USD');
  });

  test('works for a made-up strategy with every supported construct and no code change', async ({
    page,
  }) => {
    const engine = await openAdd(page);
    await choose(page, 'Quality Screen');
    const box = strategy(page, 'Quality Screen');
    await expect(box.locator('.field > label, .group > legend')).toHaveText([
      'Lowest score',
      'Screen weight *',
      'Style tilt',
      'Sector',
      'Target price',
      'Strict mode',
      'Limits',
      'Price ceiling *',
      'Note',
      'Use cached data',
    ]);
    await expect(field(box, 'Sector').locator('option')).toHaveText([
      en.selection.notSet,
      'energy',
      'health',
    ]);
    await expect(field(box, 'Style tilt').locator('option')).toHaveText([
      'Value Tilt',
      'Growth Tilt',
    ]);
    await expect(field(box, 'Price ceiling')).toHaveValue('80');
    const score = field(box, 'Lowest score');
    await expect(score).toHaveAttribute('step', '1');
    await expect(score).toHaveAttribute('min', '1');
    await expect(score).toHaveAttribute('max', '9');
    // Only an inclusive bound is a native attribute (D229).
    await expect(field(box, 'Screen weight')).not.toHaveAttribute('min', /.*/);
    await choose(page, 'Quality Screen');
    await tickers(page).fill('ko');
    await field(box, 'Screen weight').fill('2');
    await field(box, 'Sector').selectOption('health');
    await box
      .getByRole('group', { name: 'Limits' })
      .getByLabel('Note')
      .fill(' keep ');
    await add(page).click();
    await expect(heading(page)).toHaveText('Core');
    expect(bodies(posts(engine))).toEqual([
      {
        method_id: 'quality_screen',
        tickers: ['ko'],
        selection: {
          weight: 2,
          tilt: 'value',
          sector: 'health',
          strict: false,
          limits: { ceiling: 80, note: ' keep ' },
          use_cache: true,
        },
      },
    ]);
    expect(engine.rejected).toEqual([]);
  });
});

test.describe('the requests', () => {
  test("sends one request per chosen strategy in the engine's order, with only what each form holds", async ({
    page,
  }) => {
    const engine = await openAdd(page);
    for (const name of [
      'Quality Screen',
      'Piotroski F-Score',
      'FCF Growth',
      'Graham Growth',
      'Graham Number',
      'Momentum',
    ])
      await choose(page, name);
    await tickers(page).fill('ko, msft');
    await asOf(page).fill('2025-12-31');
    const growth = strategy(page, 'Graham Growth');
    await field(growth, 'Expected growth rate').fill('6.5');
    await field(growth, 'AAA corporate bond yield').fill('4.9');
    await field(strategy(page, 'Quality Screen'), 'Screen weight').fill('2');
    await showOptions(page, 'FCF Growth');
    await field(
      strategy(page, 'FCF Growth'),
      'Historical horizon',
    ).selectOption('3');
    await add(page).click();

    await expect(heading(page)).toHaveText('Core');
    const as_of = '2025-12-31';
    const both = ['ko', 'msft'];
    expect(bodies(posts(engine))).toEqual([
      {
        method_id: 'sma_crossover',
        tickers: both,
        selection: {
          short_window: 50,
          long_window: 200,
          rsi_period: 14,
          use_cache: true,
          as_of,
        },
      },
      {
        method_id: 'graham_number',
        tickers: both,
        selection: { use_cache: true, as_of },
      },
      {
        method_id: 'graham_growth_value',
        tickers: both,
        selection: {
          eps_basis: 'three_year_average',
          expected_growth: 6.5,
          aaa_yield_override: 4.9,
          use_cache: true,
          as_of,
        },
      },
      {
        method_id: 'reported_fcf_eps_cagr',
        tickers: both,
        selection: {
          policy: {
            historical_horizon: '3',
            classification_basis: 'total_fcf',
            forward_policy: 'display_only',
          },
          currency: 'USD',
          use_cache: true,
          as_of,
        },
      },
      {
        method_id: 'piotroski',
        tickers: both,
        selection: { use_cache: true, as_of },
      },
      {
        method_id: 'quality_screen',
        tickers: both,
        selection: {
          weight: 2,
          tilt: 'value',
          strict: false,
          limits: { ceiling: 80 },
          use_cache: true,
          as_of,
        },
      },
    ]);
    expect(engine.rejected).toEqual([]);
    // Each answer held two more entries: twelve in all.
    await expect(status(page, added(12))).toBeVisible();
  });

  test('leaves as_of out when the date is empty', async ({ page }) => {
    const engine = await openAdd(page);
    await choose(page, 'Momentum');
    await tickers(page).fill('KO');
    await add(page).click();
    await expect(status(page, added(1))).toBeVisible();
    expect(bodies(posts(engine))).toEqual([
      {
        method_id: 'sma_crossover',
        tickers: ['KO'],
        selection: {
          short_window: 50,
          long_window: 200,
          rsi_period: 14,
          use_cache: true,
        },
      },
    ]);
  });

  test('sends as_of only to a strategy whose schema declares it', async ({
    page,
  }) => {
    const engine = await openAdd(page, {
      strategies: selection.exoticStrategies,
    });
    await choose(page, 'Graham Number');
    await choose(page, 'Odd Screen');
    await tickers(page).fill('KO');
    await asOf(page).fill('2026-01-15');
    await add(page).click();
    await expect(heading(page)).toHaveText('Core');
    expect(bodies(posts(engine))).toEqual([
      {
        method_id: 'graham_number',
        tickers: ['KO'],
        selection: { use_cache: true, as_of: '2026-01-15' },
      },
      {
        method_id: 'odd_screen',
        tickers: ['KO'],
        selection: { use_cache: true },
      },
    ]);
  });

  test('returns to the watchlist, loaded afresh, with the number of entries added', async ({
    page,
  }) => {
    await openAdd(page);
    await choose(page, 'Piotroski F-Score');
    await tickers(page).fill('KO MSFT AAPL');
    await add(page).click();
    await expect(heading(page)).toHaveText('Core');
    await expect(status(page, added(3))).toBeVisible();
    await expect(
      page.locator('table').first().locator('tbody > tr'),
    ).toHaveCount(6);
  });
});

test.describe('checks before sending', () => {
  test('asks for a ticker and a strategy, and moves focus to the first field with a message', async ({
    page,
  }) => {
    const engine = await openAdd(page);
    await add(page).click();
    const message = page.getByText(en.addEntries.errors.tickersRequired);
    await expect(message).toBeVisible();
    await describedBy(tickers(page), message);
    await expect(tickers(page)).toBeFocused();
    await expect(
      page.getByText(en.addEntries.errors.strategyRequired),
    ).toBeVisible();
    expect(posts(engine)).toHaveLength(0);
  });

  test('asks for a required option at its field, without repeating the label', async ({
    page,
  }) => {
    const engine = await openAdd(page);
    await tickers(page).fill('KO');
    await choose(page, 'Graham Growth');
    await add(page).click();
    const box = strategy(page, 'Graham Growth');
    const messages = box.getByText(en.selection.errors.required, {
      exact: true,
    });
    await expect(messages).toHaveCount(2);
    const growth = field(box, 'Expected growth rate');
    await describedBy(growth, messages.first());
    await describedBy(field(box, 'AAA corporate bond yield'), messages.nth(1));
    await expect(growth).toBeFocused();
    expect(posts(engine)).toHaveLength(0);
    await growth.fill('6.5');
    await field(box, 'AAA corporate bond yield').fill('4.9');
    await add(page).click();
    await expect(heading(page)).toHaveText('Core');
    expect(posts(engine)).toHaveLength(1);
  });

  test('checks numbers against the schema, and only for the chosen strategies', async ({
    page,
  }) => {
    const engine = await openAdd(page);
    await tickers(page).fill('KO');
    // Graham Growth is empty but not chosen: it is not checked.
    await choose(page, 'Momentum');
    await showOptions(page, 'Momentum');
    const box = strategy(page, 'Momentum');
    const short = field(box, 'Short window');
    await short.fill('0');
    await field(box, 'Long window').fill('0');
    await field(box, 'RSI period').fill('2.5');
    await add(page).click();
    await expect(
      box.getByText(en.selection.errors.greater.replace('{limit}', '0')),
    ).toHaveCount(2);
    await expect(box.getByText(en.selection.errors.whole)).toHaveCount(1);
    await expect(short).toBeFocused();
    await expect(
      strategy(page, 'Graham Growth').getByText(en.selection.errors.required),
    ).toHaveCount(0);
    expect(posts(engine)).toHaveLength(0);
  });

  test('treats content the number field cannot read as an invalid number', async ({
    page,
  }) => {
    const engine = await openAdd(page);
    await tickers(page).fill('KO');
    await choose(page, 'Graham Growth');
    const box = strategy(page, 'Graham Growth');
    await field(box, 'Expected growth rate').focus();
    await page.keyboard.type('1e');
    await field(box, 'AAA corporate bond yield').fill('4.9');
    await add(page).click();
    await expect(
      box.getByText(en.selection.errors.number, { exact: true }),
    ).toBeVisible();
    expect(posts(engine)).toHaveLength(0);
  });
});
