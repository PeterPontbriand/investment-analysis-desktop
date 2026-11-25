// Getting started (GUI.4c2): first in the sidebar, what the application does
// and each screen's line, with its engine terms as triggers, and the guide for
// a new investor. Each test runs left to right and right to left, against the
// engine mock.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { engineUrl, mockEngine, type Handler } from './engine-mock.ts';
import { helpIndex } from '../fixtures/api/data.ts';
import { guideId, termDocument } from '../fixtures/api/help.ts';
import { selectionHandler } from '../fixtures/api/selection.ts';
import { failure, ok } from '../fixtures/api/server.ts';
import en from '../../src/locales/en.json' with { type: 'json' };
import ar from '../fixtures/locales/ar-XB.json' with { type: 'json' };

const directions = [
  { name: 'left to right', dir: 'ltr', words: en },
  { name: 'right to left', dir: 'rtl', words: ar },
] as const;
type Direction = (typeof directions)[number];

const panel = (page: Page) => page.locator('#details-panel');
const h1 = (page: Page) => page.getByRole('heading', { level: 1 });
const main = (page: Page) => page.getByRole('main');
const sidebar = (page: Page, direction: Direction) =>
  page.getByRole('navigation', { name: direction.words.nav.label });

function term(id: string) {
  const found = termDocument(id);
  if (found === null) throw new Error(`no term ${id} in the fixture`);
  return found;
}

const guideTitle = helpIndex.documents.find(
  (item) => item.id === guideId,
)!.title;

async function start(page: Page, direction: Direction, handler?: Handler) {
  if (direction.dir === 'rtl')
    await page.addInitScript(() => {
      for (const [name, value] of [
        ['languages', ['ar-XB']],
        ['language', 'ar-XB'],
      ] as const)
        Object.defineProperty(navigator, name, {
          get: () => value,
          configurable: true,
        });
    });
  await mockEngine(page, handler);
  await page.goto(engineUrl);
  await expect(page.locator('html')).toHaveAttribute('dir', direction.dir);
}

async function open(page: Page, direction: Direction, handler?: Handler) {
  await start(page, direction, handler);
  await sidebar(page, direction)
    .getByRole('link', { name: direction.words.nav.gettingStarted })
    .click();
  await expect(h1(page)).toHaveText(direction.words.nav.gettingStarted);
}

const fill = (message: string, values: Record<string, string>) =>
  message.replace(/\{(\w+)\}/g, (_match, name: string) => values[name]!);

const screens = [
  'analyze',
  'watchlists',
  'refreshes',
  'runs',
  'help',
  'about',
] as const;

for (const direction of directions) {
  const { nav, gettingStarted: said, common, state } = direction.words;

  // Every trigger in reading order, with the term it explains.
  const triggers = [
    [said.terms.strategies, 'analysis-strategy'],
    [said.terms.tickers, 'ticker'],
    [said.terms.ticker, 'ticker'],
    [said.terms.watchlists, 'watchlist'],
    [said.terms.entries, 'entry'],
    [said.terms.refresh, 'refresh'],
    [said.terms.run, 'analysis-run'],
  ] as const;

  test.describe(`getting started (${direction.name})`, () => {
    test('is first in the sidebar, with Help just above About, and the application opens on Watchlists', async ({
      page,
    }) => {
      await start(page, direction);
      await expect(h1(page)).toHaveText(nav.watchlists);
      await expect(sidebar(page, direction).getByRole('link')).toHaveText([
        nav.gettingStarted,
        ...screens.map((screen) => nav[screen]),
      ]);
    });

    test('says what the application does, and what each screen is for', async ({
      page,
    }) => {
      await open(page, direction);
      await expect(main(page).locator('p').first()).toHaveText(
        fill(said.intro, {
          strategies: said.terms.strategies,
          tickers: said.terms.tickers,
        }),
      );
      await expect(main(page).getByRole('listitem')).toHaveText([
        fill(said.analyze, { screen: nav.analyze, ticker: said.terms.ticker }),
        fill(said.watchlists, {
          screen: nav.watchlists,
          watchlists: said.terms.watchlists,
          entries: said.terms.entries,
        }),
        fill(said.refreshes, {
          screen: nav.refreshes,
          refresh: said.terms.refresh,
        }),
        fill(said.runs, { screen: nav.runs, run: said.terms.run }),
        fill(said.help, { screen: nav.help }),
        fill(said.about, { screen: nav.about }),
      ]);
      await expect(main(page).locator('a button, button a')).toHaveCount(0);
    });

    test('explains each term in place', async ({ page }) => {
      await open(page, direction);
      const buttons = main(page).getByRole('button');
      await expect(buttons).toHaveText(triggers.map(([text]) => text));
      for (const [index, [, id]] of triggers.entries()) {
        await buttons.nth(index).click();
        await expect(panel(page).getByRole('heading')).toHaveText(
          term(id).name,
        );
        await expect(panel(page)).toContainText(term(id).definition);
        await expect(panel(page).locator('.listed')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(panel(page)).toHaveCount(0);
      }
    });

    for (const screen of screens)
      test(`links the ${screen} screen`, async ({ page }) => {
        // The Analyze screen reads each strategy's form as it opens.
        await open(page, direction, selectionHandler());
        await main(page)
          .getByRole('listitem')
          .getByRole('link', { name: nav[screen], exact: true })
          .click();
        await expect(h1(page)).toHaveText(nav[screen]);
      });

    test('links the guide for a new investor, by its served title', async ({
      page,
    }) => {
      await open(page, direction);
      await expect(main(page).locator('p').last()).toHaveText(
        fill(said.guide, { guide: guideTitle }),
      );
      await main(page).getByRole('link', { name: guideTitle }).click();
      await expect(h1(page)).toHaveText(guideTitle);
      await expect(h1(page)).toBeFocused();
    });

    test('has no guide line when the index lists no such guide', async ({
      page,
    }) => {
      await open(page, direction, (url) =>
        url.pathname === '/v1/help'
          ? ok({
              ...helpIndex,
              documents: helpIndex.documents.filter(
                (item) => item.id !== guideId,
              ),
            })
          : undefined,
      );
      await expect(main(page).getByRole('button').first()).toBeVisible();
      await expect(main(page).locator('p')).toHaveCount(1);
    });
  });

  test.describe(`getting started with no index (${direction.name})`, () => {
    test.use({ allowedHttpStatuses: [500] });

    test('shows the failure in place of the guide line, and the rest; Try again brings the guide and the terms', async ({
      page,
    }) => {
      let failing = true;
      await open(page, direction, (url) =>
        url.pathname === '/v1/help' && failing
          ? failure(500, 'database_busy', 'busy')
          : undefined,
      );
      await expect(main(page)).toContainText(state.databaseBusy);
      await expect(main(page).getByRole('listitem')).toHaveCount(
        screens.length,
      );
      await expect(main(page)).toContainText(said.terms.strategies);
      failing = false;
      await main(page).getByRole('button', { name: common.tryAgain }).click();
      await expect(
        main(page).getByRole('link', { name: guideTitle }),
      ).toBeVisible();
      await expect(main(page).getByRole('button')).toHaveText(
        triggers.map(([text]) => text),
      );
    });
  });
}
