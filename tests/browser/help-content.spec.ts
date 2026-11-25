// Help content (GUI.4c2): a term's full entry in the details panel, the links
// in served text, the Help screen and the guides. Each test runs left to right
// and right to left, against the engine mock. Expected text comes from the
// catalog and from the fixtures of what the engine serves.
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { engineUrl, mockEngine, type Handler } from './engine-mock.ts';
import { focusByKeyboard } from './keyboard.ts';
import { helpIndex } from '../fixtures/api/data.ts';
import {
  codeSectionId,
  everyConstructId,
  externalUrl,
  guideId,
  guides,
  guideSectionId,
  linkTexts,
  mathGuideId,
  mathSectionId,
  termDocument,
  wideSectionId,
} from '../fixtures/api/help.ts';
import { failure } from '../fixtures/api/server.ts';
import { groupElementId, sectionElementId } from '../../src/api/helpLinks.ts';
import en from '../../src/locales/en.json' with { type: 'json' };
import ar from '../fixtures/locales/ar-XB.json' with { type: 'json' };

const directions = [
  { name: 'left to right', dir: 'ltr', words: en },
  { name: 'right to left', dir: 'rtl', words: ar },
] as const;
type Direction = (typeof directions)[number];

declare global {
  interface Window {
    openedExternalUrls?: string[];
  }
}

function term(id: string) {
  const found = termDocument(id);
  if (found === null) throw new Error(`no term ${id} in the fixture`);
  return found;
}

const guide = (id: string) => guides[id]!;

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
  const engine = await mockEngine(page, handler);
  await page.goto(engineUrl);
  await expect(page.locator('html')).toHaveAttribute('dir', direction.dir);
  return engine;
}

const panel = (page: Page) => page.locator('#details-panel');
const panelHeading = (page: Page) => panel(page).getByRole('heading');
const h1 = (page: Page) => page.getByRole('heading', { level: 1 });
const main = (page: Page) => page.getByRole('main');

async function openHelp(page: Page, direction: Direction) {
  await page
    .getByRole('navigation', { name: direction.words.nav.label })
    .getByRole('link', { name: direction.words.nav.help })
    .click();
  await expect(h1(page)).toHaveText(direction.words.nav.help);
}

// The trigger of a term in the Help screen's list.
const listed = (page: Page, id: string) =>
  main(page).getByRole('button', { name: term(id).name, exact: true });

async function openTerm(page: Page, direction: Direction, id: string) {
  await openHelp(page, direction);
  await listed(page, id).click();
  await expect(panelHeading(page)).toHaveText(term(id).name);
}

async function openGuide(page: Page, direction: Direction, id: string) {
  await openHelp(page, direction);
  await main(page)
    .getByRole('link', { name: guide(id).title })
    .click();
  await expect(h1(page)).toHaveText(guide(id).title);
}

const section = (page: Page, id: string) =>
  page.locator(`#${sectionElementId(id)}`);
const groupHeading = (page: Page, id: string) =>
  page.locator(`#${groupElementId(id)}`);

// The plain text a served paragraph starts with, before its first link.
const textStart = (markdown: string) => markdown.split(' [')[0]!;

// How far an element's content is wider than the element.
const overflow = (box: Locator) =>
  box.evaluate((element) => element.scrollWidth - element.clientWidth);
const pageOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

const opened = (page: Page) => page.evaluate(() => window.openedExternalUrls);

for (const direction of directions) {
  const words = direction.words;

  test.describe(`the full entry in the panel (${direction.name})`, () => {
    test('shows the definition, the body and the group that lists the term', async ({
      page,
    }) => {
      const engine = await start(page, direction);
      await openTerm(page, direction, 'ticker');
      const item = term('ticker');
      await expect(panel(page)).toContainText(item.definition);
      const body = panel(page).locator('.help-markdown');
      await expect(body).toHaveAttribute('lang', 'en');
      await expect(body).toContainText(linkTexts.venueInTicker);
      await expect(panel(page).locator('.listed')).toHaveText(
        `${words.help.listedUnder} ${item.group.title}`,
      );
      // Read once, however often the panel opens.
      await page.keyboard.press('Escape');
      await listed(page, 'ticker').click();
      await expect(panel(page).locator('.listed')).toBeVisible();
      expect(engine.paths('/v1/help/terms/ticker')).toHaveLength(1);
    });

    test('adds nothing for an empty body', async ({ page }) => {
      await start(page, direction);
      await openTerm(page, direction, 'entry');
      await expect(panel(page).locator('.listed')).toBeVisible();
      await expect(panel(page).locator('.help-markdown')).toHaveCount(0);
    });

    test('shows every allowed construct, and text for anything else', async ({
      page,
    }) => {
      await start(page, direction);
      await openTerm(page, direction, everyConstructId);
      const body = panel(page).locator('.help-markdown');
      for (const element of [
        'strong',
        'em',
        'p code',
        'ul ul',
        'ol[start="3"]',
        '.table-scroll table',
        'pre[dir="ltr"]',
        'br',
      ])
        await expect(body.locator(element).first()).toBeAttached();
      await expect(body.locator('th.align-end')).toHaveCSS('text-align', 'end');
      await expect(body.locator('pre')).toHaveCSS('direction', 'ltr');
      await expect(body.locator('pre')).toHaveCSS('white-space', 'pre');
      for (const text of linkTexts.notLinks) {
        await expect(body).toContainText(text);
        await expect(body.getByRole('link', { name: text })).toHaveCount(0);
        await expect(body.getByRole('button', { name: text })).toHaveCount(0);
      }
      await expect(body).toContainText('<b>');
      await expect(body.locator('b')).toHaveCount(0);
    });

    test('says it is loading while the entry is read', async ({ page }) => {
      let release = () => {};
      const hold = new Promise<void>((resolve) => (release = resolve));
      await start(page, direction, async (url) => {
        if (url.pathname === '/v1/help/terms/ticker') await hold;
        return undefined;
      });
      await openTerm(page, direction, 'ticker');
      await expect(panel(page)).toContainText(term('ticker').definition);
      await expect(panel(page)).toContainText(words.common.loading);
      release();
      await expect(panel(page).locator('.listed')).toBeVisible();
      await expect(panel(page)).not.toContainText(words.common.loading);
    });
  });

  test.describe(`help that cannot be read (${direction.name})`, () => {
    test.use({ allowedHttpStatuses: [404, 500] });

    const busyAt = (path: string) => {
      const state = { failing: true };
      const handler: Handler = (url) =>
        url.pathname === path && state.failing
          ? failure(500, 'database_busy', 'busy')
          : undefined;
      return { state, handler };
    };

    test('a term shows the failure, and Try again reads its entry', async ({
      page,
    }) => {
      const { state, handler } = busyAt('/v1/help/terms/ticker');
      await start(page, direction, handler);
      await openTerm(page, direction, 'ticker');
      await expect(panel(page)).toContainText(term('ticker').definition);
      await expect(panel(page)).toContainText(words.state.databaseBusy);
      state.failing = false;
      await panel(page)
        .getByRole('button', { name: words.common.tryAgain })
        .click();
      await expect(panel(page).locator('.listed')).toBeVisible();
      await expect(panel(page)).not.toContainText(words.state.databaseBusy);
    });

    test('says when the engine has no entry for the term', async ({ page }) => {
      await start(page, direction, (url) =>
        url.pathname === '/v1/help/terms/ticker'
          ? failure(404, 'help_term_not_found', 'No such help term.')
          : undefined,
      );
      await openTerm(page, direction, 'ticker');
      await expect(panel(page)).toContainText(term('ticker').definition);
      await expect(panel(page)).toContainText(words.help.termNotFound);
      await expect(panel(page).locator('.listed')).toHaveCount(0);
    });

    test('a guide shows the failure, and Try again reads it', async ({
      page,
    }) => {
      const { state, handler } = busyAt(`/v1/help/documents/${guideId}`);
      await start(page, direction, handler);
      await openHelp(page, direction);
      await main(page)
        .getByRole('link', { name: guide(guideId).title })
        .click();
      await expect(main(page)).toContainText(words.state.databaseBusy);
      state.failing = false;
      await main(page)
        .getByRole('button', { name: words.common.tryAgain })
        .click();
      await expect(h1(page)).toHaveText(guide(guideId).title);
      await expect(h1(page)).toBeFocused();
    });

    test('says when the engine has no guide with the name', async ({
      page,
    }) => {
      await start(page, direction, (url) =>
        url.pathname === `/v1/help/documents/${guideId}`
          ? failure(404, 'help_document_not_found', 'No such guide.')
          : undefined,
      );
      await openHelp(page, direction);
      await main(page)
        .getByRole('link', { name: guide(guideId).title })
        .click();
      await expect(main(page)).toContainText(words.help.documentNotFound);
      await expect(h1(page)).toHaveText(words.nav.help);
    });

    test('the Help screen shows a failed index, and Try again reads it', async ({
      page,
    }) => {
      const { state, handler } = busyAt('/v1/help');
      await start(page, direction, handler);
      await openHelp(page, direction);
      await expect(main(page)).toContainText(words.state.databaseBusy);
      state.failing = false;
      await main(page)
        .getByRole('button', { name: words.common.tryAgain })
        .click();
      await expect(listed(page, 'ticker')).toBeVisible();
    });
  });

  test.describe(`links in served text (${direction.name})`, () => {
    test('a term link steps to its term, and Back returns', async ({
      page,
    }) => {
      await start(page, direction);
      await openTerm(page, direction, 'ticker');
      await panel(page)
        .getByRole('button', { name: linkTexts.venueInTicker })
        .click();
      await expect(panelHeading(page)).toHaveText(term('listing-venue').name);
      await expect(panelHeading(page)).toBeFocused();
      await panel(page)
        .getByRole('button', { name: linkTexts.nasdaqInVenue })
        .click();
      await expect(panelHeading(page)).toHaveText(
        term('listing-venue-nasdaq').name,
      );
      await panel(page)
        .getByRole('button', {
          name: words.detailsPanel.back.replace(
            '{title}',
            term('listing-venue').name,
          ),
        })
        .click();
      await expect(panelHeading(page)).toHaveText(term('listing-venue').name);
      await expect(panelHeading(page)).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(panel(page)).toHaveCount(0);
      await expect(listed(page, 'ticker')).toBeFocused();
    });

    test('a guide link opens the guide, focuses its title and closes the panel', async ({
      page,
    }) => {
      await start(page, direction);
      await openTerm(page, direction, everyConstructId);
      await panel(page)
        .getByRole('link', { name: linkTexts.wholeGuide })
        .click();
      await expect(h1(page)).toHaveText(guide(mathGuideId).title);
      await expect(h1(page)).toBeFocused();
      await expect(panel(page)).toHaveCount(0);
    });

    test('a guide link with a section focuses that heading and closes the panel', async ({
      page,
    }) => {
      await start(page, direction);
      await openTerm(page, direction, everyConstructId);
      await panel(page)
        .getByRole('link', { name: linkTexts.guideSection })
        .click();
      await expect(h1(page)).toHaveText(guide(mathGuideId).title);
      await expect(section(page, mathSectionId)).toBeFocused();
      await expect(section(page, mathSectionId)).toBeInViewport();
      await expect(panel(page)).toHaveCount(0);
    });

    test('a section link of the guide already open closes the panel and focuses the heading, and again', async ({
      page,
    }) => {
      await start(page, direction);
      await openGuide(page, direction, guideId);
      await expect(h1(page)).toBeFocused();
      const trigger = main(page).getByRole('button', {
        name: linkTexts.venueInGuide,
      });
      // The second time the address is the one already shown.
      for (let visit = 0; visit < 2; visit += 1) {
        await trigger.click();
        await panel(page)
          .getByRole('link', { name: linkTexts.sectionInVenue })
          .click();
        await expect(panel(page)).toHaveCount(0);
        await expect(section(page, guideSectionId)).toBeFocused();
        await expect(section(page, guideSectionId)).toBeInViewport();
      }
    });

    test('"Listed under" opens its group on the Help screen', async ({
      page,
    }) => {
      await start(page, direction);
      await openGuide(page, direction, guideId);
      await main(page)
        .getByRole('button', { name: linkTexts.venueInGuide })
        .click();
      const { group } = term('listing-venue');
      await panel(page).getByRole('link', { name: group.title }).click();
      await expect(h1(page)).toHaveText(words.nav.help);
      await expect(groupHeading(page, group.id)).toBeFocused();
      await expect(groupHeading(page, group.id)).toBeInViewport();
      await expect(panel(page)).toHaveCount(0);
    });

    test('"Listed under" on the Help screen closes the panel and focuses the group, and again', async ({
      page,
    }) => {
      await start(page, direction);
      await openHelp(page, direction);
      const { group } = term('ticker');
      // The second time the address is the one already shown.
      for (let visit = 0; visit < 2; visit += 1) {
        await listed(page, 'ticker').click();
        await panel(page).getByRole('link', { name: group.title }).click();
        await expect(panel(page)).toHaveCount(0);
        await expect(groupHeading(page, group.id)).toBeFocused();
        await expect(groupHeading(page, group.id)).toBeInViewport();
      }
    });

    test('further reading opens through the platform, on click and on Enter, and goes nowhere', async ({
      page,
    }) => {
      await start(page, direction);
      await openGuide(page, direction, guideId);
      const url = page.url();
      const link = main(page).getByRole('link', {
        name: words.help.opensInBrowser,
      });
      await expect(link).toHaveAttribute('href', externalUrl);
      await expect(link).toContainText(words.help.externalMark);
      expect(await opened(page)).toEqual([]);
      await link.click();
      expect(await opened(page)).toEqual([externalUrl]);
      await focusByKeyboard(page, link);
      await page.keyboard.press('Enter');
      expect(await opened(page)).toEqual([externalUrl, externalUrl]);
      expect(page.url()).toBe(url);
      expect(page.context().pages()).toHaveLength(1);
      await expect(h1(page)).toHaveText(guide(guideId).title);
    });

    test('further reading in the panel opens through the platform and leaves the panel open', async ({
      page,
    }) => {
      await start(page, direction);
      await openTerm(page, direction, everyConstructId);
      const url = page.url();
      await panel(page)
        .getByRole('link', { name: linkTexts.furtherReading })
        .click();
      expect(await opened(page)).toEqual([externalUrl]);
      expect(page.url()).toBe(url);
      await expect(panelHeading(page)).toHaveText(term(everyConstructId).name);
    });
  });

  test.describe(`the Help screen and guides (${direction.name})`, () => {
    test('lists the guides, then each group with its terms, in served order', async ({
      page,
    }) => {
      const engine = await start(page, direction);
      await openHelp(page, direction);
      await expect(main(page).getByRole('link')).toHaveText(
        helpIndex.documents.map((item) => item.title),
      );
      await expect(main(page).getByRole('heading', { level: 2 })).toHaveText([
        words.help.guides,
        ...helpIndex.groups.map((group) => group.title),
      ]);
      await expect(main(page).getByRole('button')).toHaveText(
        helpIndex.groups.flatMap((group) =>
          group.terms.map((item) => item.name),
        ),
      );
      expect(engine.paths('/v1/help')).toHaveLength(1);
    });

    test('a listed term that wraps starts beside its bullet, with its lines at the start', async ({
      page,
    }) => {
      await start(page, direction);
      await openHelp(page, direction);
      // The list shows once the help index has answered.
      await expect(listed(page, 'ticker')).toBeVisible();
      // Narrow enough that the longer names wrap.
      await page.setViewportSize({ width: 480, height: 800 });
      const wrapped = await main(page)
        .locator('.terms li')
        .evaluateAll(
          (items, rtl) =>
            items.flatMap((item) => {
              const button = item.querySelector('button')!;
              const range = document.createRange();
              range.selectNodeContents(button);
              const lines = [...range.getClientRects()];
              if (lines.length < 2) return [];
              const edges = lines.map((line) => (rtl ? line.right : line.left));
              return {
                textAlign: getComputedStyle(button).textAlign,
                spread: Math.max(...edges) - Math.min(...edges),
                offset:
                  button.getBoundingClientRect().top -
                  item.getBoundingClientRect().top,
                // A space with no width, on the line the bullet is on.
                bullet: (() => {
                  const mark = document.createElement('span');
                  mark.textContent = '​';
                  item.prepend(mark);
                  const top = mark.getBoundingClientRect().top;
                  mark.remove();
                  return Math.abs(top - lines[0]!.top);
                })(),
              };
            }),
          direction.dir === 'rtl',
        );
      expect(wrapped.length).toBeGreaterThan(0);
      for (const item of wrapped) {
        expect(item.textAlign).toBe('start');
        expect(item.spread).toBeLessThan(1);
        expect(Math.abs(item.offset)).toBeLessThanOrEqual(1);
        expect(item.bullet).toBeLessThanOrEqual(3);
      }
    });

    test('the bullets of a later column have their own room', async ({
      page,
    }) => {
      await start(page, direction);
      await openHelp(page, direction);
      // The list shows once the help index has answered.
      await expect(listed(page, 'ticker')).toBeVisible();
      // For each list in columns, the room between one column's items and the
      // next one's, where the next one's bullets are.
      const { rooms, needed } = await main(page).evaluate((element, rtl) => {
        const rooms = [...element.querySelectorAll('.terms')].flatMap(
          (list) => {
            const boxes = [...list.querySelectorAll('li')].map((item) => {
              const box = item.getBoundingClientRect();
              // Along the text direction, so both directions read the same.
              return rtl
                ? { start: -box.right, end: -box.left }
                : { start: box.left, end: box.right };
            });
            const starts = [...new Set(boxes.map((box) => box.start))].sort(
              (one, other) => one - other,
            );
            return starts.slice(1).map((next, index) => {
              const column = boxes.filter((box) => box.start === starts[index]);
              return next - Math.max(...column.map((box) => box.end));
            });
          },
        );
        const rem = parseFloat(
          getComputedStyle(document.documentElement).fontSize,
        );
        return { rooms, needed: 2.5 * rem };
      }, direction.dir === 'rtl');
      expect(rooms.length).toBeGreaterThan(0);
      for (const room of rooms) expect(room).toBeGreaterThanOrEqual(needed);
    });

    test('a term in the list has the preview and the panel', async ({
      page,
    }) => {
      await start(page, direction);
      await openHelp(page, direction);
      await listed(page, 'watchlist').hover();
      await expect(page.getByRole('tooltip')).toHaveText(
        term('watchlist').definition,
      );
      await listed(page, 'watchlist').click();
      await expect(panelHeading(page)).toHaveText(term('watchlist').name);
    });

    test('a guide shows its title, introduction and sections, and a way back', async ({
      page,
    }) => {
      await start(page, direction);
      await openGuide(page, direction, guideId);
      const document = guide(guideId);
      await expect(h1(page)).toBeFocused();
      await expect(h1(page)).toHaveAttribute('lang', 'en');
      await expect(main(page)).toContainText(textStart(document.introduction));
      for (const level of [2, 3] as const)
        await expect(main(page).getByRole('heading', { level })).toHaveText(
          document.sections
            .filter((item) => Math.min(item.level, 3) === level)
            .map((item) => item.heading),
        );
      await page
        .getByRole('navigation', { name: words.breadcrumb.label })
        .getByRole('link', { name: words.nav.help })
        .click();
      await expect(h1(page)).toHaveText(words.nav.help);
    });

    test('a wide table scrolls in its own box', async ({ page }) => {
      await start(page, direction);
      await openGuide(page, direction, guideId);
      await section(page, wideSectionId).scrollIntoViewIfNeeded();
      const box = main(page).locator('.table-scroll');
      expect(await overflow(box)).toBeGreaterThan(0);
      expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
    });

    test('a long code block scrolls in its own box, which is then a named tab stop', async ({
      page,
    }) => {
      await start(page, direction);
      await openGuide(page, direction, guideId);
      await section(page, codeSectionId).scrollIntoViewIfNeeded();
      const long = main(page).getByRole('group', {
        name: words.help.codeBlock,
      });
      await expect(long).toHaveCount(1);
      await expect(long).toHaveAttribute('tabindex', '0');
      expect(await overflow(long)).toBeGreaterThan(0);
      expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
      const short = main(page).locator('pre').nth(1);
      expect(await overflow(short)).toBe(0);
      await expect(short).not.toHaveAttribute('tabindex');
      await expect(short).not.toHaveAttribute('aria-label');
      // Narrow enough that the short one is measured again and still fits.
      await page.setViewportSize({ width: 700, height: 700 });
      await expect(long).toHaveCount(1);
    });
  });
}
