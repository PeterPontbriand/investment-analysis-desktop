// The four text tabs of run detail wrap every line with a hanging indent
// (D329): no horizontal scrolling, a continuation line two columns right of
// its line's own indentation, long tokens broken, and copying gives the
// engine's original lines. Each test runs left to right and right to left.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { engineUrl, mockEngine } from './engine-mock.ts';
import { textFor } from '../fixtures/api/compare.ts';
import { runDetails } from '../fixtures/api/compare.ts';
import en from '../../src/locales/en.json' with { type: 'json' };
import ar from '../fixtures/locales/ar-XB.json' with { type: 'json' };

const directions = [
  { name: 'left to right', dir: 'ltr', words: en },
  { name: 'right to left', dir: 'rtl', words: ar },
] as const;

const runId = Object.keys(runDetails)[0]!;
const modes = ['concise', 'details', 'diagnostics'] as const;

async function openRun(page: Page, direction: (typeof directions)[number]) {
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
  await mockEngine(page);
  await page.goto(engineUrl);
  await page
    .getByRole('navigation', { name: direction.words.nav.label })
    .getByRole('link', { name: direction.words.nav.runs })
    .click();
  await page.locator('tbody tr').nth(0).locator('th a').click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

// What a tab's text box measures: whether anything scrolls sideways, and the
// left edges of the fragments of one line, in pixels, with one column's width.
function measure(page: Page) {
  return page.evaluate(() => {
    const panel = document.querySelector('[role="tabpanel"]')!;
    const pre = panel.querySelector('pre')!;
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;inline-size:1ch';
    pre.append(probe);
    const column = probe.getBoundingClientRect().width;
    probe.remove();
    return {
      panelOverflow: panel.scrollWidth - panel.clientWidth,
      preOverflow: pre.scrollWidth - pre.clientWidth,
      pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
      column,
    };
  });
}

// The left edge of each visual line of the line whose text starts with `start`.
function fragments(page: Page, start: string) {
  return page.evaluate((prefix) => {
    const line = [...document.querySelectorAll('[role="tabpanel"] .line')].find(
      (element) => (element.textContent ?? '').trimStart().startsWith(prefix),
    )!;
    const text = line.firstChild!;
    const range = document.createRange();
    // From the first character after the line's own leading spaces.
    const body = text.textContent ?? '';
    range.setStart(text, body.length - body.trimStart().length);
    range.setEnd(text, body.length);
    const origin = line.getBoundingClientRect().left;
    // The left edge of each visual line: the least left of the fragments at
    // one height (a trailing space that hangs past the end is a fragment too).
    const byTop = new Map<number, number>();
    for (const rect of range.getClientRects()) {
      const top = Math.round(rect.top);
      byTop.set(top, Math.min(byTop.get(top) ?? Infinity, rect.left));
    }
    const lefts = new Set<number>();
    for (const left of byTop.values())
      lefts.add(Math.round((left - origin) * 10) / 10);
    return [...lefts].sort((a, b) => a - b);
  }, start);
}

// Selects a line, or the whole text, and returns what a copy would hold.
function selected(page: Page, start: string | null) {
  return page.evaluate((prefix) => {
    const pre = document.querySelector('[role="tabpanel"] pre')!;
    const range = document.createRange();
    if (prefix === null) range.selectNodeContents(pre);
    else {
      const line = [...pre.querySelectorAll('.line')].find((element) =>
        (element.textContent ?? '').trimStart().startsWith(prefix),
      )!;
      range.selectNodeContents(line);
    }
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    return selection.toString();
  }, start);
}

for (const direction of directions) {
  const words = direction.words;

  test.describe(`run text wrapping (${direction.name})`, () => {
    for (const mode of modes) {
      test(`wraps every line of the ${mode} tab, with a hanging indent`, async ({
        page,
      }) => {
        await openRun(page, direction);
        const tab = {
          concise: words.runDetail.tabs.summary,
          details: words.runDetail.tabs.details,
          diagnostics: words.runDetail.tabs.diagnostics,
        }[mode];
        await page.getByRole('tab', { name: tab }).click();
        await expect(page.getByRole('tabpanel')).toContainText(
          `in ${mode} mode`,
        );

        const size = await measure(page);
        expect(size.panelOverflow).toBeLessThanOrEqual(0);
        expect(size.preOverflow).toBeLessThanOrEqual(0);
        expect(size.pageOverflow).toBeLessThanOrEqual(0);

        // The long line wraps: its fragments start at its own indentation,
        // then two columns further in.
        const notes = await fragments(page, 'notes:');
        expect(notes).toHaveLength(2);
        expect(notes[0]).toBeCloseTo(0, 0);
        expect(notes[1]! - notes[0]!).toBeCloseTo(2 * size.column, 0);

        // An indented line keeps its indentation: a continuation is two
        // columns right of it, not of the margin.
        const indented = await fragments(page, 'bvps:');
        expect(indented.length).toBeGreaterThanOrEqual(2);
        expect(indented[0]!).toBeCloseTo(2 * size.column, 0);
        expect(indented[1]! - indented[0]!).toBeCloseTo(2 * size.column, 0);

        // A token with no break opportunity breaks anywhere.
        const token = await fragments(page, 'token:');
        expect(token.length).toBeGreaterThanOrEqual(2);
        expect((await measure(page)).preOverflow).toBeLessThanOrEqual(0);
      });
    }

    test('selecting wrapped text copies the original lines, with no inserted breaks', async ({
      page,
    }) => {
      await openRun(page, direction);
      await page
        .getByRole('tab', { name: words.runDetail.tabs.details })
        .click();
      await expect(page.getByRole('tabpanel')).toContainText('in details mode');
      const original = textFor(runId, 'details').text.split('\n');
      const line = (start: string) =>
        original.find((item) => item.trimStart().startsWith(start))!;
      expect(await selected(page, 'notes:')).toBe(line('notes:'));
      expect(await selected(page, 'bvps:')).toBe(line('bvps:'));
      expect(await selected(page, 'token:')).toBe(line('token:'));
      const all = (await selected(page, null)).replace(/\n+/g, '\n');
      expect(all.replace(/\n$/, '')).toBe(
        original.filter((item) => item !== '').join('\n'),
      );
    });

    test('wraps the JSON tab too, and copies the original JSON lines', async ({
      page,
    }) => {
      await openRun(page, direction);
      await page.getByRole('tab', { name: words.runDetail.tabs.json }).click();
      await expect(page.locator('[role="tabpanel"] pre')).toBeVisible();
      const size = await measure(page);
      expect(size.panelOverflow).toBeLessThanOrEqual(0);
      expect(size.preOverflow).toBeLessThanOrEqual(0);
      expect(size.pageOverflow).toBeLessThanOrEqual(0);
      const first = await selected(page, '"');
      expect(first.trimStart().startsWith('"')).toBe(true);
      expect(first).not.toContain('\n');
    });
  });
}
