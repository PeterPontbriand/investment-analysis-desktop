// Term popups (GUI.4b): the preview and the details panel on every element
// that shows a term, the help buttons beside form labels, and the links and
// triggers that sit side by side in comparison cells and progress rows. Each
// test runs left to right and right to left, against the engine mock.
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { openAdd } from './add-entries-helpers.ts';
import { engineUrl, mockEngine, type Handler } from './engine-mock.ts';
import { focusByKeyboard } from './keyboard.ts';
import { advance, frames, openApp, openCore } from './refresh-helpers.ts';
import { helpIndex, refreshes } from '../fixtures/api/data.ts';
import {
  retiredComparison,
  retiredRefreshId,
} from '../fixtures/api/compare.ts';
import { scriptedJob } from '../fixtures/api/refresh.ts';
import { ok } from '../fixtures/api/server.ts';
import en from '../../src/locales/en.json' with { type: 'json' };
import ar from '../fixtures/locales/ar-XB.json' with { type: 'json' };

const directions = [
  { name: 'left to right', dir: 'ltr', words: en },
  { name: 'right to left', dir: 'rtl', words: ar },
] as const;
type Direction = (typeof directions)[number];

// What the engine's help index says of a term: the expected text is read from
// the fixture of that index, never written out.
function term(id: string) {
  const found = helpIndex.groups
    .flatMap((group) => group.terms)
    .find((item) => item.id === id);
  if (found === undefined) throw new Error(`no term ${id} in the fixture`);
  return found;
}

async function useDirection(page: Page, direction: Direction) {
  if (direction.dir === 'rtl')
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

async function start(page: Page, direction: Direction, handler?: Handler) {
  await useDirection(page, direction);
  const engine = await mockEngine(page, handler);
  await page.goto(engineUrl);
  await expect(page.locator('html')).toHaveAttribute('dir', direction.dir);
  return engine;
}

const popup = (page: Page) => page.getByRole('tooltip');
const panel = (page: Page) => page.locator('#details-panel');
const rows = (page: Page) => page.locator('tbody tr');
const h1 = (page: Page) => page.getByRole('heading', { level: 1 });
const nav = (page: Page, direction: Direction) =>
  page.getByRole('navigation', { name: direction.words.nav.label });

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

// Hovering shows the definition only; clicking opens the panel with the term's
// name as its heading, then the definition (B8).
async function previewAndPanel(page: Page, trigger: Locator, id: string) {
  const item = term(id);
  await trigger.hover();
  await expect(popup(page)).toBeVisible();
  await expect(popup(page)).toHaveText(item.definition);
  await expect(trigger).toHaveAttribute('aria-describedby', /.+/);
  await trigger.click();
  await expect(panel(page)).toBeVisible();
  await expect(panel(page).getByRole('heading')).toHaveText(item.name);
  await expect(panel(page)).toContainText(item.definition);
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();
}

for (const direction of directions) {
  const words = direction.words;

  test.describe(`term popups (${direction.name})`, () => {
    test('a column header, an outcome pill and a strategy cell explain themselves', async ({
      page,
    }) => {
      await start(page, direction);
      await nav(page, direction)
        .getByRole('link', { name: words.nav.runs })
        .click();
      await expect(rows(page).first()).toBeVisible();
      await previewAndPanel(
        page,
        rows(page).nth(0).getByRole('button', { name: 'Completed' }),
        'outcome-completed',
      );
      await previewAndPanel(
        page,
        rows(page).nth(0).getByRole('button', { name: 'Graham Number' }),
        'strategy-graham-number',
      );
    });

    test('the "As of" column header takes the engine term of its label', async ({
      page,
    }) => {
      await start(page, direction);
      await page.getByRole('link', { name: 'Core' }).click();
      await previewAndPanel(
        page,
        page
          .getByRole('columnheader')
          .getByRole('button', { name: words.watchlist.columns.asOf }),
        'as-of-date',
      );
    });

    test('a comparison column header and the group heading explain themselves', async ({
      page,
    }) => {
      await start(page, direction);
      await nav(page, direction)
        .getByRole('link', { name: words.nav.refreshes })
        .click();
      await rows(page).nth(0).locator('th a').click();
      await expect(h1(page)).toBeVisible();
      await previewAndPanel(
        page,
        page.locator('thead').getByRole('button', { name: 'Momentum' }),
        'strategy-momentum',
      );
    });

    test('a comparison cell keeps its link and its term trigger apart', async ({
      page,
    }) => {
      await start(page, direction);
      await nav(page, direction)
        .getByRole('link', { name: words.nav.refreshes })
        .click();
      await rows(page).nth(0).locator('th a').click();
      await expect(h1(page)).toBeVisible();
      // ZED's second group: a dash, as a link, and its status, as a trigger.
      const zed = rows(page).nth(1);
      const status = zed
        .getByRole('button', { name: 'Does not apply' })
        .first();
      await expect(status).toBeVisible();
      await expect(zed.locator('a button, button a')).toHaveCount(0);
      await status.click();
      await expect(panel(page)).toBeVisible();
      // The trigger opened the panel and went nowhere.
      await expect(rows(page).nth(1)).toBeVisible();
      await page.keyboard.press('Escape');
      const dash = zed.getByRole('link', { name: '—' }).first();
      await dash.click();
      await expect(page.locator('thead')).toHaveCount(0);
    });

    test('the outcome column is a pill trigger and the row still links to the run', async ({
      page,
    }) => {
      await start(page, direction);
      await nav(page, direction)
        .getByRole('link', { name: words.nav.refreshes })
        .click();
      await rows(page).nth(0).locator('th a').click();
      await expect(h1(page)).toBeVisible();
      const pill = rows(page)
        .nth(1)
        .getByRole('button', { name: 'Unavailable' });
      await expect(pill).toBeVisible();
      await previewAndPanel(page, pill, 'outcome-unavailable');
      await expect(rows(page).nth(1).locator('td a').first()).toBeVisible();
    });

    test('run detail explains the strategy in its heading, a headline card and the as-of label', async ({
      page,
    }) => {
      await start(page, direction);
      await nav(page, direction)
        .getByRole('link', { name: words.nav.runs })
        .click();
      await rows(page).nth(0).locator('th a').click();
      await expect(h1(page)).toBeVisible();
      await previewAndPanel(
        page,
        h1(page).getByRole('button', { name: 'Graham Number' }),
        'strategy-graham-number',
      );
      await previewAndPanel(
        page,
        page.locator('.cards').getByRole('button').first(),
        // A headline card's term id is the engine's, whatever it is.
        await page
          .locator('.cards [data-term-id]')
          .first()
          .getAttribute('data-term-id')
          .then((id) => id!),
      );
      await previewAndPanel(
        page,
        page.getByRole('button', { name: words.runDetail.asOfLabel }),
        'as-of-date',
      );
    });

    test('a strategy checkbox and the "As of" field get a separate help button', async ({
      page,
    }) => {
      await useDirection(page, direction);
      await openAdd(page, { words });
      const button = page.getByRole('button', {
        name: words.termHelp.about.replace('{name}', 'Momentum'),
      });
      await expect(button).toHaveText(words.termHelp.mark);
      // The label and the checkbox are untouched by the help button.
      await expect(
        page.getByRole('checkbox', { name: 'Momentum' }),
      ).toBeVisible();
      await previewAndPanel(page, button, 'strategy-momentum');
      await previewAndPanel(
        page,
        page.getByRole('button', {
          name: words.termHelp.about.replace('{name}', term('as-of-date').name),
        }),
        'as-of-date',
      );
    });

    test('a trigger is a tab stop and opens its preview on keyboard focus', async ({
      page,
    }) => {
      await start(page, direction);
      await nav(page, direction)
        .getByRole('link', { name: words.nav.runs })
        .click();
      const pill = rows(page).nth(0).getByRole('button', { name: 'Completed' });
      await focusByKeyboard(page, pill);
      await expect(popup(page)).toHaveText(
        term('outcome-completed').definition,
      );
      await page.keyboard.press('Enter');
      await expect(panel(page)).toBeVisible();
    });

    test('a code with no term stays plain text', async ({ page }) => {
      await start(page, direction, withRetired);
      await nav(page, direction)
        .getByRole('link', { name: words.nav.refreshes })
        .click();
      await rows(page).nth(2).locator('th a').click();
      const header = page.locator('thead tr').nth(0).locator('th').nth(2);
      await expect(header).toHaveText('retired_method');
      await expect(header.getByRole('button')).toHaveCount(0);
    });
  });

  test.describe(`term popups on touch (${direction.name})`, () => {
    test.use({ hasTouch: true });

    test('a tap on a pill opens the panel, and no preview', async ({
      page,
    }) => {
      await start(page, direction);
      await nav(page, direction)
        .getByRole('link', { name: words.nav.runs })
        .click();
      await rows(page).nth(0).getByRole('button', { name: 'Completed' }).tap();
      await expect(panel(page)).toBeVisible();
      await expect(panel(page)).toContainText(
        term('outcome-completed').definition,
      );
      await expect(popup(page)).toHaveCount(0);
    });
  });

  test.describe(`refresh progress rows (${direction.name})`, () => {
    test('a finished row has a pill trigger followed by a View run link', async ({
      page,
    }) => {
      const script = scriptedJob(frames);
      await useDirection(page, direction);
      await openApp(page, script);
      await openCore(page);
      await page
        .getByRole('button', {
          name: words.refresh.now,
        })
        .click();
      await advance(page, script, 4);
      const first = page.locator('tbody tr').nth(0);
      await expect(
        first.getByRole('link', { name: words.refresh.viewRun }),
      ).toBeVisible();
      await first.getByRole('button', { name: 'Completed' }).click();
      await expect(panel(page)).toBeVisible();
      await expect(first).toBeVisible();
    });
  });
}
