// The comparison table scrolls sideways under its sticky ticker column. What
// the browser scrolls into view, a focused link or button, must stop clear of
// that column, not under it (WCAG 2.4.11; D317). Geometry is checked in both
// text directions.
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { engineUrl, mockEngine } from './engine-mock.ts';
import { focusByKeyboard } from './keyboard.ts';
import en from '../../src/locales/en.json' with { type: 'json' };
import ar from '../fixtures/locales/ar-XB.json' with { type: 'json' };

const directions = [
  { name: 'left to right', dir: 'ltr', words: en },
  { name: 'right to left', dir: 'rtl', words: ar },
] as const;

async function openComparison(
  page: Page,
  direction: (typeof directions)[number],
) {
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
  // Narrow enough that the table overflows by more than the sticky column.
  await page.setViewportSize({ width: 640, height: 800 });
  await mockEngine(page);
  await page.goto(engineUrl);
  await page
    .getByRole('navigation', { name: direction.words.nav.label })
    .getByRole('link', { name: direction.words.nav.refreshes })
    .click();
  await page.locator('tbody tr').nth(0).locator('th a').click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('.table-scroll')
        .evaluate(
          (box) =>
            parseFloat(getComputedStyle(box).scrollPaddingInlineStart) || 0,
        ),
    )
    .toBeGreaterThan(0);
}

// Where the table is scrolled to: its start (where the sticky column sits) or
// its far end. Scroll offsets differ by direction, so the ends are found from
// the layout: the last column's edge against the container's.
const scrollTo = (page: Page, end: 'start' | 'far') =>
  page.evaluate((where) => {
    const box = document.querySelector('.table-scroll')!;
    const max = box.scrollWidth - box.clientWidth;
    const rtl = getComputedStyle(box).direction === 'rtl';
    box.scrollLeft = where === 'start' ? 0 : rtl ? -max : max;
  }, end);

// Scrolls a control into view by the least distance, which is what a browser
// that does not centre a focused element does (WebKit on macOS does this): the
// control then stops against the scroll container's edge, or against the
// scroll padding when there is one.
const scrollNearest = (control: Locator) =>
  control.evaluate((element) =>
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' }),
  );

// The gap between a control and the sticky column, and whether the control is
// inside the scroll container: positive when clear.
async function clearance(page: Page, control: Locator) {
  const box = await page.evaluate(() => {
    const scroller = document
      .querySelector('.table-scroll')!
      .getBoundingClientRect();
    const sticky = document
      .querySelector('thead .ticker')!
      .getBoundingClientRect();
    return {
      scroller: [scroller.left, scroller.right],
      sticky: [sticky.left, sticky.right],
      rtl: document.documentElement.dir === 'rtl',
    };
  });
  const rect = (await control.boundingBox())!;
  const left = rect.x;
  const right = rect.x + rect.width;
  return {
    inside: left >= box.scroller[0]! - 0.5 && right <= box.scroller[1]! + 0.5,
    // Distance from the control to the sticky column on the side it is under.
    gap: box.rtl ? box.sticky[0]! - right : left - box.sticky[1]!,
  };
}

for (const direction of directions) {
  test.describe(`comparison table, sticky column (${direction.name})`, () => {
    test('a pill in the last column, focused from the keyboard, is fully visible and clear of the sticky column', async ({
      page,
    }) => {
      await openComparison(page, direction);
      const pill = page
        .locator('tbody tr')
        .nth(1)
        .getByRole('button', { name: 'Unavailable' });
      await scrollTo(page, 'start');
      await focusByKeyboard(page, pill);
      const found = await clearance(page, pill);
      expect(found.inside).toBe(true);
      expect(found.gap).toBeGreaterThanOrEqual(-0.5);
    });

    test('a pill scrolled into view by the browser (as a hover does) is clear of the sticky column', async ({
      page,
    }) => {
      await openComparison(page, direction);
      const pill = page
        .locator('tbody tr')
        .nth(1)
        .getByRole('button', { name: 'Unavailable' });
      await scrollTo(page, 'start');
      await pill.scrollIntoViewIfNeeded();
      const found = await clearance(page, pill);
      expect(found.inside).toBe(true);
      expect(found.gap).toBeGreaterThanOrEqual(-0.5);
    });

    test('a pill scrolled in by the least distance, from either end, is clear of the sticky column', async ({
      page,
    }) => {
      await openComparison(page, direction);
      const pill = page
        .locator('tbody tr')
        .nth(1)
        .getByRole('button', { name: 'Unavailable' });
      for (const end of ['start', 'far'] as const) {
        await scrollTo(page, end);
        await scrollNearest(pill);
        const found = await clearance(page, pill);
        expect(found.inside).toBe(true);
        expect(found.gap).toBeGreaterThanOrEqual(-0.5);
      }
    });

    test('a link in a middle column, scrolled in by the least distance from the far end, is clear of the sticky column', async ({
      page,
    }) => {
      await openComparison(page, direction);
      const link = page.locator('tbody tr').nth(0).locator('td a').nth(2);
      await scrollTo(page, 'far');
      await scrollNearest(link);
      const found = await clearance(page, link);
      expect(found.inside).toBe(true);
      expect(found.gap).toBeGreaterThanOrEqual(-0.5);
    });

    test('a link in a middle column, focused from the keyboard after scrolling to the far end, is clear of the sticky column', async ({
      page,
    }) => {
      await openComparison(page, direction);
      const link = page.locator('tbody tr').nth(0).locator('td a').nth(2);
      await scrollTo(page, 'far');
      await focusByKeyboard(page, link);
      const found = await clearance(page, link);
      expect(found.inside).toBe(true);
      expect(found.gap).toBeGreaterThanOrEqual(-0.5);
    });
  });
}
