// The fixed sidebar (D379): it stays in place while a long screen scrolls, and
// scrolls by itself in a window too short for it. Each test runs left to right
// and right to left, against the engine mock.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { engineUrl, mockEngine } from './engine-mock.ts';
import en from '../../src/locales/en.json' with { type: 'json' };
import ar from '../fixtures/locales/ar-XB.json' with { type: 'json' };

const directions = [
  { name: 'left to right', dir: 'ltr', words: en },
  { name: 'right to left', dir: 'rtl', words: ar },
] as const;
type Direction = (typeof directions)[number];

const sidebar = (page: Page) => page.locator('.sidebar');
const menu = (page: Page, direction: Direction) =>
  page
    .getByRole('navigation', { name: direction.words.nav.label })
    .getByRole('link');

async function start(page: Page, direction: Direction) {
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
  await mockEngine(page);
  await page.goto(engineUrl);
  await expect(page.locator('html')).toHaveAttribute('dir', direction.dir);
}

// Saved runs: the fixtures list 50 runs, a screen longer than the window.
async function openRuns(page: Page, direction: Direction) {
  await menu(page, direction)
    .filter({ hasText: direction.words.nav.runs })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    direction.words.nav.runs,
  );
  await expect(page.locator('tbody tr')).toHaveCount(50);
}

const scrollWindow = (page: Page, to: 'bottom' | 'top') =>
  page.evaluate((end) => {
    window.scrollTo(
      0,
      end === 'top' ? 0 : document.documentElement.scrollHeight,
    );
    return window.scrollY;
  }, to);

for (const direction of directions) {
  test.describe(`fixed sidebar (${direction.name})`, () => {
    test('keeps the first and last menu items in view at the bottom of a long screen', async ({
      page,
    }) => {
      await start(page, direction);
      await openRuns(page, direction);
      await expect(menu(page, direction)).toHaveText([
        direction.words.nav.gettingStarted,
        direction.words.nav.analyze,
        direction.words.nav.watchlists,
        direction.words.nav.refreshes,
        direction.words.nav.runs,
        direction.words.nav.help,
        direction.words.nav.about,
      ]);
      expect(await scrollWindow(page, 'bottom')).toBeGreaterThan(500);
      await expect(menu(page, direction).first()).toBeInViewport({ ratio: 1 });
      await expect(menu(page, direction).last()).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole('switch')).toBeInViewport({ ratio: 1 });
      await menu(page, direction).last().click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        direction.words.nav.about,
      );
    });

    test('scrolls by itself in a window too short for it, and the window scrolling does not move it', async ({
      page,
    }) => {
      await start(page, direction);
      await page.setViewportSize({ width: 1000, height: 300 });
      await openRuns(page, direction);
      const sizes = await sidebar(page).evaluate((element) => ({
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      }));
      expect(sizes.scrollHeight).toBeGreaterThan(sizes.clientHeight);
      expect((await sidebar(page).boundingBox())?.height).toBe(300);

      // The window scrolls the content, never the sidebar or its own scroll.
      const ownScroll = () =>
        sidebar(page).evaluate((element) => element.scrollTop);
      const before = await sidebar(page).boundingBox();
      const kept = await ownScroll();
      expect(await scrollWindow(page, 'bottom')).toBeGreaterThan(0);
      expect(await sidebar(page).boundingBox()).toEqual(before);
      expect(await ownScroll()).toBe(kept);

      // The sidebar's own last item is reached by scrolling the sidebar.
      const last = page.getByRole('switch');
      await last.scrollIntoViewIfNeeded();
      await expect(last).toBeInViewport({ ratio: 1 });
      expect(await ownScroll()).toBeGreaterThan(kept);
      expect(await sidebar(page).boundingBox()).toEqual(before);
    });
  });
}
