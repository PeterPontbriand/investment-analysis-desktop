// One navigation trail for the whole application (D380 to D384): following a
// link adds the screen left, a crumb returns to the exact place, a sidebar item
// starts afresh, revisiting a screen cuts the trail back, the bar is sticky
// unless it would take more than a quarter of the window, and after a crumb
// focus moves to the screen's main heading. Each test runs left to right and
// right to left, against the engine mock.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { engineUrl, mockEngine, type Handler } from './engine-mock.ts';
import { openApp, openCore } from './refresh-helpers.ts';
import * as actions from '../fixtures/api/actions.ts';
import { runs, strategies } from '../fixtures/api/data.ts';
import { guides, termDocument } from '../fixtures/api/help.ts';
import { scriptedJob } from '../fixtures/api/refresh.ts';
import { ok } from '../fixtures/api/server.ts';
import { frames } from './refresh-helpers.ts';
import en from '../../src/locales/en.json' with { type: 'json' };
import ar from '../fixtures/locales/ar-XB.json' with { type: 'json' };

const directions = [
  { name: 'left to right', dir: 'ltr', words: en },
  { name: 'right to left', dir: 'rtl', words: ar },
] as const;
type Direction = (typeof directions)[number];

const h1 = (page: Page) => page.getByRole('heading', { level: 1 });
const main = (page: Page) => page.getByRole('main');
const rows = (page: Page) => page.locator('tbody tr');
const panel = (page: Page) => page.locator('#details-panel');
const bar = (page: Page) => page.locator('.trail-bar');

const fill = (message: string, values: Record<string, string>) =>
  message.replace(/\{(\w+)\}/g, (_match, name: string) => values[name]!);

async function useDirection(page: Page, direction: Direction) {
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
}

async function start(page: Page, direction: Direction, handler?: Handler) {
  await useDirection(page, direction);
  const engine = await mockEngine(page, handler);
  await page.goto(engineUrl);
  await expect(page.locator('html')).toHaveAttribute('dir', direction.dir);
  return engine;
}

const menu = (page: Page, direction: Direction, name: string) =>
  page
    .getByRole('navigation', { name: direction.words.nav.label })
    .getByRole('link', { name, exact: true });

const crumbs = (page: Page, direction: Direction) =>
  page
    .getByRole('navigation', { name: direction.words.breadcrumb.label })
    .getByRole('link');

const trailNav = (page: Page, direction: Direction) =>
  page.getByRole('navigation', { name: direction.words.breadcrumb.label });

// The first saved run in the fixtures, and its crumb label (D382).
const firstRun = runs[0]!;
const firstStrategy = strategies.items.find(
  (item) => item.method === firstRun.method_id,
)!;
const runLabel = (direction: Direction) =>
  fill(direction.words.runDetail.titleNoName, {
    ticker: firstRun.ticker,
    strategy: firstStrategy.label,
  });

async function openFirstRun(page: Page, direction: Direction) {
  await menu(page, direction, direction.words.nav.runs).click();
  await expect(rows(page).first()).toBeVisible();
  await rows(page).nth(0).locator('th a').click();
  await expect(h1(page)).toContainText(firstStrategy.label);
}

// From a run, its strategy's term and the term's group on the Help screen.
async function runToHelp(page: Page, direction: Direction) {
  await h1(page)
    .getByRole('button', { name: firstStrategy.label, exact: true })
    .click();
  const group = termDocument(firstStrategy.term)!.group;
  await panel(page).getByRole('link', { name: group.title }).click();
  await expect(h1(page)).toHaveText(direction.words.nav.help);
}

for (const direction of directions) {
  const { nav } = direction.words;

  test.describe(`navigation trail (${direction.name})`, () => {
    test('a run left for Help is a crumb that returns to it, with focus on its heading (a, j)', async ({
      page,
    }) => {
      await start(page, direction);
      await openFirstRun(page, direction);
      // With an empty trail the run shows the screen above it (D173).
      await expect(crumbs(page, direction)).toHaveText([nav.runs]);
      await runToHelp(page, direction);
      await expect(crumbs(page, direction)).toHaveText([
        nav.runs,
        runLabel(direction),
      ]);
      // The served strategy name keeps its language inside the crumb.
      await expect(
        crumbs(page, direction).nth(1).locator('[lang="en"]'),
      ).toHaveText(firstStrategy.label);
      await crumbs(page, direction).nth(1).click();
      await expect(h1(page)).toContainText(firstStrategy.label);
      await expect(h1(page)).toBeFocused();
      await expect(crumbs(page, direction)).toHaveText([nav.runs]);
    });

    test('Saved runs filters survive the round trip (b)', async ({ page }) => {
      await start(page, direction);
      await menu(page, direction, nav.runs).click();
      await page
        .getByLabel(direction.words.runs.filters.ticker)
        .fill(firstRun.ticker.toLowerCase());
      await page.getByLabel(direction.words.runs.filters.ticker).press('Enter');
      // The runs of that ticker in the fixtures, once the list has answered.
      const filtered = runs.filter(
        (run) => run.ticker === firstRun.ticker,
      ).length;
      await expect(rows(page)).toHaveCount(filtered);
      await rows(page).nth(0).locator('th a').click();
      await expect(h1(page)).toContainText(firstStrategy.label);
      await runToHelp(page, direction);
      await crumbs(page, direction).nth(0).click();
      await expect(h1(page)).toHaveText(nav.runs);
      await expect(
        page.getByLabel(direction.words.runs.filters.ticker),
      ).toHaveValue(firstRun.ticker.toLowerCase());
      await expect(rows(page)).toHaveCount(filtered);
      await expect(h1(page)).toBeFocused();
    });

    test('a sidebar item starts the trail afresh (c)', async ({ page }) => {
      await start(page, direction);
      await openFirstRun(page, direction);
      await runToHelp(page, direction);
      await expect(crumbs(page, direction)).toHaveCount(2);
      await menu(page, direction, nav.about).click();
      await expect(h1(page)).toHaveText(nav.about);
      await expect(trailNav(page, direction)).toHaveCount(0);
      // Also the item of the screen already shown, which makes no navigation.
      await menu(page, direction, nav.gettingStarted).click();
      await main(page)
        .getByRole('listitem')
        .getByRole('link', { name: nav.watchlists, exact: true })
        .click();
      await expect(crumbs(page, direction)).toHaveText([nav.gettingStarted]);
      await menu(page, direction, nav.watchlists).click();
      await expect(trailNav(page, direction)).toHaveCount(0);
    });

    test('revisiting a screen in the trail cuts the trail back to before it (d)', async ({
      page,
    }) => {
      await start(page, direction);
      await menu(page, direction, nav.refreshes).click();
      await rows(page).nth(0).locator('th a').click();
      await expect(crumbs(page, direction)).toHaveText([nav.refreshes]);
      await rows(page).nth(0).locator('td a').first().click();
      await expect(page.locator('.cards')).toBeVisible();
      await expect(crumbs(page, direction)).toHaveText([
        nav.refreshes,
        direction.words.compare.refreshComparison,
      ]);
      await crumbs(page, direction).nth(1).click();
      await expect(crumbs(page, direction)).toHaveText([nav.refreshes]);
      await expect(h1(page)).toBeFocused();
    });

    test('the running-refresh marker keeps the trail (e)', async ({ page }) => {
      const script = scriptedJob(frames);
      await useDirection(page, direction);
      await openApp(page, script);
      await openCore(page);
      await page
        .getByRole('button', { name: direction.words.refresh.now })
        .click();
      await expect(crumbs(page, direction)).toHaveText([
        nav.watchlists,
        'Core',
      ]);
      await crumbs(page, direction).nth(1).click();
      await expect(h1(page)).toHaveText('Core');
      await expect(crumbs(page, direction)).toHaveText([nav.watchlists]);
      await page.locator('.marker').click();
      await expect(crumbs(page, direction)).toHaveText([
        nav.watchlists,
        'Core',
      ]);
    });

    test('deleting a watchlist cuts the trail back to before it (f)', async ({
      page,
    }) => {
      await start(page, direction, (_url, { method }) =>
        method === 'DELETE' ? ok(actions.deleted) : undefined,
      );
      await menu(page, direction, nav.gettingStarted).click();
      await main(page)
        .getByRole('listitem')
        .getByRole('link', { name: nav.watchlists, exact: true })
        .click();
      await page.getByRole('link', { name: 'Core', exact: true }).click();
      await expect(h1(page)).toHaveText('Core');
      await expect(crumbs(page, direction)).toHaveText([
        nav.gettingStarted,
        nav.watchlists,
      ]);
      await page
        .getByRole('button', { name: direction.words.watchlist.delete })
        .click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: direction.words.watchlist.delete })
        .click();
      await expect(h1(page)).toHaveText(nav.watchlists);
      await expect(crumbs(page, direction)).toHaveText([nav.gettingStarted]);
    });

    test('a long trail wraps and keeps every crumb, and stops being sticky in a short window (g)', async ({
      page,
    }) => {
      await start(page, direction);
      await page.setViewportSize({ width: 600, height: 900 });
      // Getting started, Refreshes, a comparison, a run, and Help.
      await menu(page, direction, nav.gettingStarted).click();
      await main(page)
        .getByRole('listitem')
        .getByRole('link', { name: nav.refreshes, exact: true })
        .click();
      await rows(page).nth(0).locator('th a').click();
      await rows(page).nth(0).locator('td a').first().click();
      await expect(page.locator('.cards')).toBeVisible();
      await h1(page).getByRole('button').last().click();
      await panel(page).locator('.listed a').click();
      await expect(h1(page)).toHaveText(nav.help);
      await main(page)
        .getByRole('link', { name: guides['beginner-guide']!.title })
        .click();
      await expect(h1(page)).toHaveText(guides['beginner-guide']!.title);
      await expect(crumbs(page, direction)).toHaveCount(5);
      await expect(crumbs(page, direction).first()).toHaveText(
        nav.gettingStarted,
      );
      await expect(crumbs(page, direction).last()).toHaveText(nav.help);
      const [first, last] = await Promise.all([
        crumbs(page, direction).first().boundingBox(),
        crumbs(page, direction).last().boundingBox(),
      ]);
      expect(last!.y).toBeGreaterThan(first!.y);
      await expect(bar(page)).toHaveCSS('position', 'sticky');

      // A window whose quarter is smaller than the bar: not sticky.
      const height = (await bar(page).boundingBox())!.height;
      await page.setViewportSize({
        width: 600,
        height: Math.floor(height * 4) - 10,
      });
      await expect(bar(page)).not.toHaveCSS('position', 'sticky');
      await expect(crumbs(page, direction)).toHaveCount(5);
    });

    test('a short trail stays in view while a long screen scrolls (g)', async ({
      page,
    }) => {
      await start(page, direction);
      await menu(page, direction, nav.gettingStarted).click();
      await main(page)
        .getByRole('listitem')
        .getByRole('link', { name: nav.runs, exact: true })
        .click();
      await expect(rows(page)).toHaveCount(50);
      await expect(crumbs(page, direction)).toHaveText([nav.gettingStarted]);
      const scrolled = await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
        return window.scrollY;
      });
      expect(scrolled).toBeGreaterThan(500);
      await expect(crumbs(page, direction).first()).toBeInViewport({
        ratio: 1,
      });
      expect((await bar(page).boundingBox())!.y).toBe(0);
    });

    test('a heading a guide link scrolls to stays clear of the bar (D384)', async ({
      page,
    }) => {
      await start(page, direction);
      await menu(page, direction, nav.gettingStarted).click();
      await main(page)
        .getByRole('link', { name: guides['beginner-guide']!.title })
        .click();
      await expect(h1(page)).toHaveText(guides['beginner-guide']!.title);
      await expect(crumbs(page, direction)).toHaveText([nav.gettingStarted]);
      await page.setViewportSize({ width: 1000, height: 400 });
      const last = guides['beginner-guide']!.sections.at(-1)!;
      await page.evaluate((id) => {
        document.getElementById(`help-section-${id}`)!.scrollIntoView();
      }, last.id);
      const [barBox, heading] = await Promise.all([
        bar(page).boundingBox(),
        page.locator(`#help-section-${last.id}`).boundingBox(),
      ]);
      expect(heading!.y).toBeGreaterThanOrEqual(barBox!.y + barBox!.height - 1);
    });
  });

  test.describe(`navigation trail stacking and failures (${direction.name})`, () => {
    test.use({
      allowedConsoleErrors: ['Invalid time value', 'date value is not finite'],
    });

    test('the bar stays when a screen fails to render (h)', async ({
      page,
    }) => {
      const broken = structuredClone(
        (await import('../fixtures/api/compare.ts')).runDetails[
          firstRun.analysis_run_id
        ]!.overview,
      );
      broken.headline!.period_end = 'not a date';
      await start(page, direction, (url) =>
        url.pathname === `/v1/runs/${firstRun.analysis_run_id}/overview`
          ? ok(broken)
          : undefined,
      );
      await menu(page, direction, nav.runs).click();
      await rows(page).nth(0).locator('th a').click();
      await expect(page.getByRole('alert')).toHaveText(
        direction.words.state.renderFailed,
      );
      await expect(crumbs(page, direction)).toHaveText([nav.runs]);
    });

    test('the details panel and the preview are above the bar, the sticky column below it (i)', async ({
      page,
    }) => {
      await start(page, direction);
      await menu(page, direction, nav.refreshes).click();
      await rows(page).nth(0).locator('th a').click();
      await expect(crumbs(page, direction)).toHaveText([nav.refreshes]);
      const layer = (selector: string) =>
        page
          .locator(selector)
          .first()
          .evaluate((element) => Number(getComputedStyle(element).zIndex));
      const barLayer = await layer('.trail-bar');
      expect(await layer('.compare .ticker')).toBeLessThan(barLayer);

      // The sticky column passes under the bar when the page scrolls.
      await page.setViewportSize({ width: 1000, height: 300 });
      const cell = page.locator('.compare tbody .ticker').first();
      const barBox = (await bar(page).boundingBox())!;
      await page.evaluate((top) => {
        const target = document.querySelector('.compare tbody .ticker')!;
        window.scrollBy(0, target.getBoundingClientRect().top - top);
      }, barBox.y + 2);
      const box = (await cell.boundingBox())!;
      const onTop = await page.evaluate(
        ([x, y]) =>
          document.elementFromPoint(x!, y!)?.closest('.trail-bar') !== null,
        [box.x + box.width / 2, barBox.y + 2],
      );
      expect(onTop).toBe(true);

      // The details panel covers the bar where they meet.
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.locator('thead').getByRole('button').first().click();
      await expect(panel(page)).toBeVisible();
      const panelBox = (await panel(page).boundingBox())!;
      const barNow = (await bar(page).boundingBox())!;
      const panelOnTop = await page.evaluate(
        ([x, y]) =>
          document.elementFromPoint(x!, y!)?.closest('#details-panel') !== null,
        [panelBox.x + panelBox.width / 2, barNow.y + barNow.height / 2],
      );
      expect(panelOnTop).toBe(true);
      expect(await layer('#details-panel')).toBeGreaterThan(barLayer);

      // The preview too.
      await page.keyboard.press('Escape');
      await expect(panel(page)).toHaveCount(0);
      await page.mouse.move(0, 0);
      await page.locator('thead').getByRole('button').first().hover();
      await expect(page.getByRole('tooltip')).toBeVisible();
      expect(
        await page
          .getByRole('tooltip')
          .evaluate((element) => Number(getComputedStyle(element).zIndex)),
      ).toBeGreaterThan(barLayer);
    });

    test('a guide reached by a crumb keeps its own focus rule (j)', async ({
      page,
    }) => {
      await start(page, direction);
      await menu(page, direction, nav.gettingStarted).click();
      const guide = guides['beginner-guide']!;
      await main(page).getByRole('link', { name: guide.title }).click();
      await expect(h1(page)).toHaveText(guide.title);
      await main(page).getByRole('button').first().click();
      await panel(page).locator('.listed a').click();
      await expect(crumbs(page, direction)).toHaveText([
        nav.gettingStarted,
        guide.title,
      ]);
      await crumbs(page, direction).nth(1).click();
      await expect(h1(page)).toHaveText(guide.title);
      await expect(h1(page)).toBeFocused();
    });
  });
}
