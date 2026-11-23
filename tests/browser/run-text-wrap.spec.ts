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
// left edges of the fragments of one line, in pixels, with the measured width of the runs of spaces the checks use.
function measure(page: Page) {
  return page.evaluate(() => {
    const panel = document.querySelector('[role="tabpanel"]')!;
    const pre = panel.querySelector('pre')!;
    // Widths are measured on runs of spaces, the text's own indentation, not
    // taken from the ch unit, which some engines round to whole pixels.
    const widthOf = (spaces: number) => {
      const probe = document.createElement('span');
      probe.style.cssText =
        'position:absolute;visibility:hidden;white-space:pre';
      probe.textContent = ' '.repeat(spaces);
      pre.parentElement!.append(probe);
      const width = probe.getBoundingClientRect().width;
      probe.remove();
      return width;
    };
    return {
      panelOverflow: panel.scrollWidth - panel.clientWidth,
      preOverflow: pre.scrollWidth - pre.clientWidth,
      pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
      spaces: { 2: widthOf(2), 10: widthOf(10) },
    };
  });
}

// The left edge of each visual line of the line whose text starts with `start`,
// relative to the line. Range rectangles are snapped to whole pixels in WebKit,
// so only their tops find where each visual line begins; the left edge is read
// from a marker element wrapped round that first character, which has the layout's own,
// fractional position.
function fragments(page: Page, start: string) {
  return page.evaluate((prefix) => {
    const line = [...document.querySelectorAll('[role="tabpanel"] .line')].find(
      (element) => (element.textContent ?? '').trimStart().startsWith(prefix),
    )!;
    const text = line.firstChild as Text;
    const body = text.textContent ?? '';
    // From the first character after the line's own leading spaces.
    const first = body.length - body.trimStart().length;
    const starts: number[] = [];
    let previousTop: number | null = null;
    for (let at = first; at < body.length; at += 1) {
      // A space at a wrap hangs past the end of its line; only a letter starts one.
      if (body[at] === ' ') continue;
      const range = document.createRange();
      range.setStart(text, at);
      range.setEnd(text, at + 1);
      const top = Math.round(range.getBoundingClientRect().top);
      if (previousTop === null || top !== previousTop) starts.push(at);
      previousTop = top;
    }
    const origin = line.getBoundingClientRect().left;
    const markers: HTMLElement[] = [];
    // Last offset first, so an insertion does not move the offsets before it.
    for (const at of [...starts].reverse()) {
      const range = document.createRange();
      range.setStart(text, at);
      range.setEnd(text, at + 1);
      const marker = document.createElement('span');
      range.surroundContents(marker);
      markers.push(marker);
    }
    const lefts = new Set<number>();
    for (const marker of markers)
      lefts.add(
        Math.round((marker.getBoundingClientRect().left - origin) * 10) / 10,
      );
    for (const marker of markers) marker.replaceWith(...marker.childNodes);
    line.normalize();
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
        expect(notes[1]! - notes[0]!).toBeCloseTo(size.spaces[2], 0);

        // An indented line keeps its indentation: a continuation is two
        // columns right of it, not of the margin.
        const indented = await fragments(page, 'bvps:');
        expect(indented.length).toBeGreaterThanOrEqual(2);
        expect(indented[0]!).toBeCloseTo(size.spaces[2], 0);
        expect(indented[1]! - indented[0]!).toBeCloseTo(size.spaces[2], 0);

        // A line indented several spaces starts at that many columns, and its
        // continuation two further in.
        const deep = await fragments(page, 'deep:');
        expect(deep.length).toBeGreaterThanOrEqual(2);
        expect(deep[0]!).toBeCloseTo(size.spaces[10], 0);
        expect(deep[1]! - deep[0]!).toBeCloseTo(size.spaces[2], 0);

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
