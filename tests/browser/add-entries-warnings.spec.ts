// Add entries (API.16, D282): the engine adds every entry and warns of each
// ticker it could not confirm; the screen the user ends on shows one status
// line for each.
import { expect, test } from './fixtures.ts';
import {
  add,
  added,
  choose,
  heading,
  openAdd,
  posts,
  status,
  tickers,
} from './add-entries-helpers.ts';
import { notChecked, notRecognized } from '../fixtures/api/actions.ts';
import * as selection from '../fixtures/api/selection.ts';
import en from '../../src/locales/en.json' with { type: 'json' };

// The failures these tests provoke are logged by the browser.
test.use({ allowedHttpStatuses: [400, 409] });

const line = (ticker: string, name: string) =>
  en.watchlist.entryWarning
    .replace('{ticker}', ticker)
    .replace('{warning}', name);

test.describe('warnings of an add', () => {
  test('shows each warning as a status line with its term name, on the watchlist the user returns to', async ({
    page,
  }) => {
    await openAdd(page, {
      warnings: () => [notRecognized('ZZZZ'), notChecked('KO')],
    });
    await choose(page, 'Piotroski F-Score');
    await tickers(page).fill('KO ZZZZ');
    await add(page).click();
    await expect(heading(page)).toHaveText('Core');
    await expect(status(page, added(2))).toBeVisible();
    const notRecognizedLine = status(
      page,
      line('ZZZZ', 'Ticker Not Recognized'),
    );
    await expect(notRecognizedLine).toBeVisible();
    // The warning is the term's name, with its term id kept.
    await expect(
      notRecognizedLine.locator(
        '[data-term-id="entry-warning-ticker-not-recognized"]',
      ),
    ).toHaveText('Ticker Not Recognized');
    await expect(
      status(page, line('KO', 'Ticker Not Checked')).locator(
        '[data-term-id="entry-warning-ticker-not-checked"]',
      ),
    ).toBeVisible();
  });

  test('shows a ticker warned under several strategies once', async ({
    page,
  }) => {
    const engine = await openAdd(page, {
      warnings: () => [notRecognized('ZZZZ')],
    });
    await choose(page, 'Piotroski F-Score');
    await choose(page, 'Momentum');
    await tickers(page).fill('ZZZZ');
    await add(page).click();
    await expect(heading(page)).toHaveText('Core');
    expect(posts(engine)).toHaveLength(2);
    await expect(
      page.getByText(line('ZZZZ', 'Ticker Not Recognized')),
    ).toHaveCount(1);
  });

  test('shows no warning line when every ticker was confirmed, and no warning after the next screen', async ({
    page,
  }) => {
    await openAdd(page);
    await choose(page, 'Piotroski F-Score');
    await tickers(page).fill('KO');
    await add(page).click();
    await expect(heading(page)).toHaveText('Core');
    await expect(page.getByText('Ticker Not')).toHaveCount(0);
  });

  test('keeps the warnings of the strategies already added when a later one fails', async ({
    page,
  }) => {
    await openAdd(page, {
      warnings: () => [notRecognized('ZZZZ')],
      fail: (method) =>
        method === 'graham_growth_value'
          ? selection.failures.duplicate
          : undefined,
    });
    await tickers(page).fill('ZZZZ');
    await choose(page, 'Momentum');
    await choose(page, 'Graham Growth');
    await page
      .locator('.strategy')
      .filter({ hasText: 'Graham Growth' })
      .first()
      .getByLabel('Expected growth rate')
      .fill('6.5');
    await page
      .locator('.strategy')
      .filter({ hasText: 'Graham Growth' })
      .first()
      .getByLabel('AAA corporate bond yield')
      .fill('4.9');
    await add(page).click();
    await expect(
      status(page, line('ZZZZ', 'Ticker Not Recognized')),
    ).toBeVisible();
    // The add stopped on the form, which shows the warnings of the first strategy.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      en.addEntries.heading.replace('{name}', 'Core'),
    );
  });
});
