// The switch that turns previews off (D330): none opens, the panel still
// opens, the description stays as hidden text, and the choice is kept. Each
// test runs left to right and right to left, against the engine mock.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { hoverSettled } from './hover.ts';
import { engineUrl, mockEngine } from './engine-mock.ts';
import { openAdd } from './add-entries-helpers.ts';
import { focusByKeyboard } from './keyboard.ts';
import { helpIndex } from '../fixtures/api/data.ts';
import en from '../../src/locales/en.json' with { type: 'json' };
import ar from '../fixtures/locales/ar-XB.json' with { type: 'json' };

const directions = [
  { name: 'left to right', dir: 'ltr', words: en },
  { name: 'right to left', dir: 'rtl', words: ar },
] as const;
type Direction = (typeof directions)[number];

const definitionOf = (id: string) =>
  helpIndex.groups
    .flatMap((group) => group.terms)
    .find((term) => term.id === id)!.definition;

async function start(
  page: Page,
  direction: Direction,
  init?: () => void | Promise<void>,
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
  if (init) await page.addInitScript(init);
  await mockEngine(page);
  await page.goto(engineUrl);
  await expect(page.locator('html')).toHaveAttribute('dir', direction.dir);
}

const popup = (page: Page) => page.getByRole('tooltip');
const panel = (page: Page) => page.locator('#details-panel');
const switchOf = (page: Page, direction: Direction) =>
  page.getByRole('switch', { name: direction.words.previewSwitch.label });

async function openCore(page: Page) {
  await page.getByRole('link', { name: 'Core' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Core');
}

for (const direction of directions) {
  const words = direction.words;

  test.describe(`the preview switch (${direction.name})`, () => {
    test('is a switch below the navigation, on by default, and announces its state', async ({
      page,
    }) => {
      await start(page, direction);
      const toggle = switchOf(page, direction);
      await expect(toggle).toHaveAttribute('aria-checked', 'true');
      const nav = page.getByRole('navigation', { name: words.nav.label });
      const navBox = (await nav.boundingBox())!;
      const toggleBox = (await toggle.boundingBox())!;
      expect(toggleBox.y).toBeGreaterThan(navBox.y + navBox.height);
      await expect(toggle).toHaveText(words.previewSwitch.label);
    });

    test('is operated from the keyboard', async ({ page }) => {
      await start(page, direction);
      const toggle = switchOf(page, direction);
      await toggle.focus();
      await page.keyboard.press('Space');
      await expect(toggle).toHaveAttribute('aria-checked', 'false');
      await page.keyboard.press('Enter');
      await expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    test('with previews off, no preview opens for a ticker or a term, and the panel still opens', async ({
      page,
    }) => {
      await start(page, direction);
      await switchOf(page, direction).click();
      await openCore(page);
      const ticker = page
        .getByRole('button', { name: 'ACME', exact: true })
        .first();
      const term = page.getByRole('button', { name: 'Momentum' }).first();

      for (const trigger of [ticker, term]) {
        await hoverSettled(page, trigger);
        // Past the hover delay, nothing has opened.
        await page.waitForTimeout(800);
        await expect(popup(page)).toHaveCount(0);
        await page.mouse.move(0, 0);
        await focusByKeyboard(page, trigger);
        await page.waitForTimeout(200);
        await expect(popup(page)).toHaveCount(0);
        // Enter opens the panel; click does too.
        await page.keyboard.press('Enter');
        await expect(panel(page)).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(panel(page)).toHaveCount(0);
      }
      await ticker.click();
      await expect(panel(page)).toContainText('Acme Corp');
    });

    test('with previews off, the trigger is still described by the preview text', async ({
      page,
    }) => {
      await start(page, direction);
      await switchOf(page, direction).click();
      await openCore(page);
      await expect(
        page.getByRole('button', { name: 'ACME', exact: true }).first(),
      ).toHaveAccessibleDescription(/Acme Corp/);
      await expect(
        page.getByRole('button', { name: 'Momentum' }).first(),
      ).toHaveAccessibleDescription(definitionOf('strategy-momentum'));
    });

    test('keeps the choice across a reload', async ({ page }) => {
      await start(page, direction);
      await switchOf(page, direction).click();
      await expect(switchOf(page, direction)).toHaveAttribute(
        'aria-checked',
        'false',
      );
      await page.reload();
      await expect(switchOf(page, direction)).toHaveAttribute(
        'aria-checked',
        'false',
      );
      await switchOf(page, direction).click();
      await page.reload();
      await expect(switchOf(page, direction)).toHaveAttribute(
        'aria-checked',
        'true',
      );
    });

    test('falls back to on when the store is unavailable, and still switches', async ({
      page,
    }) => {
      await start(page, direction, () => {
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new Error('storage is blocked');
          },
          configurable: true,
        });
      });
      const toggle = switchOf(page, direction);
      await expect(toggle).toHaveAttribute('aria-checked', 'true');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    test('turning it off closes an open preview', async ({ page }) => {
      await start(page, direction);
      await openCore(page);
      const ticker = page
        .getByRole('button', { name: 'ACME', exact: true })
        .first();
      await focusByKeyboard(page, ticker);
      await expect(popup(page)).toBeVisible();
      // A click event on the switch, with no pointer or focus moving.
      await switchOf(page, direction).dispatchEvent('click');
      await expect(popup(page)).toHaveCount(0);
      await expect(ticker).toBeFocused();
    });

    test('F1 in a form and the help buttons still work with previews off', async ({
      page,
    }) => {
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
      await openAdd(page, { words });
      await switchOf(page, direction).click();
      const checkbox = page.getByRole('checkbox', { name: 'Momentum' });
      await checkbox.focus();
      await page.keyboard.press('F1');
      await expect(panel(page)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('button', {
          name: words.termHelp.about.replace('{name}', 'Momentum'),
        }),
      ).toBeVisible();
    });
  });
}
