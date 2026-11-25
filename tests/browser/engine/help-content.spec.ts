// Help content against a real engine (GUI.4c2): the full entry a term's panel
// shows, the guides and groups the Help screen lists, a guide's title and
// sections, and the guide "Getting started" links are the ones the engine
// serves. No engine text is written out here. See README.md in this folder.
import type { Page } from '@playwright/test';
import MarkdownIt, { type Token } from 'markdown-it';
import type { components } from '../../../src/api/schema.ts';
import en from '../../../src/locales/en.json' with { type: 'json' };
import { expect, openApp, test, type RealEngine } from './real-engine.ts';

type Schemas = components['schemas'];

const words = en;
const beginnerGuide = 'beginner-guide';

const panel = (page: Page) => page.locator('#details-panel');
const h1 = (page: Page) => page.getByRole('heading', { level: 1 });
const main = (page: Page) => page.getByRole('main');

const sidebar = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: words.nav.label })
    .getByRole('link', { name, exact: true });

async function helpIndex(engine: RealEngine) {
  return (await engine.get<Schemas['HelpIndexDocument']>('/v1/help')).body;
}

// The first term in the index whose entry is more than its definition.
async function termWithBody(engine: RealEngine) {
  for (const group of (await helpIndex(engine)).groups)
    for (const term of group.terms) {
      const { body } = await engine.get<Schemas['HelpTermDocument']>(
        `/v1/help/terms/${term.id}`,
      );
      if (body.body !== '') return body;
    }
  throw new Error('The engine serves no term with a body.');
}

const squeezed = (text: string) => text.replace(/\s+/g, '');

// The text a reader should see of served Markdown: what its tokens hold, without
// the marks and the addresses of links.
function readable(markdown: string): string {
  const parser = new MarkdownIt({ html: false });
  const textOf = (tokens: Token[]): string =>
    tokens
      .map((token) => (token.children ? textOf(token.children) : token.content))
      .join('');
  return squeezed(textOf(parser.parse(markdown, {})));
}

test("a term's panel shows the entry and the group the engine serves", async ({
  page,
  engine,
}) => {
  const term = await termWithBody(engine);
  await openApp(page, engine);
  await sidebar(page, words.nav.help).click();
  await main(page)
    .getByRole('button', { name: term.name, exact: true })
    .first()
    .click();
  await expect(panel(page).getByRole('heading')).toHaveText(term.name);
  await expect(panel(page)).toContainText(term.definition);
  const body = panel(page).locator('.help-markdown');
  await expect(body).toBeVisible();
  // Screen-reader text and marks are the application's, not the entry's.
  const shown = await body.evaluate((element) => {
    const copy = element.cloneNode(true) as Element;
    for (const own of copy.querySelectorAll('.visually-hidden, .mark'))
      own.remove();
    return copy.textContent ?? '';
  });
  expect(squeezed(shown)).toBe(readable(term.body));
  await expect(
    panel(page).getByRole('link', { name: term.group.title, exact: true }),
  ).toBeVisible();
});

test('the Help screen lists every guide and group the engine serves', async ({
  page,
  engine,
}) => {
  const index = await helpIndex(engine);
  await openApp(page, engine);
  await sidebar(page, words.nav.help).click();
  await expect(h1(page)).toHaveText(words.nav.help);
  await expect(main(page).getByRole('link')).toHaveText(
    index.documents.map((item) => item.title),
  );
  await expect(main(page).getByRole('heading', { level: 2 })).toHaveText([
    words.help.guides,
    ...index.groups.map((group) => group.title),
  ]);
});

test("the Beginner's Guide opens with the title and the sections the engine serves", async ({
  page,
  engine,
}) => {
  const guide = (
    await engine.get<Schemas['HelpDocumentDocument']>(
      `/v1/help/documents/${beginnerGuide}`,
    )
  ).body;
  await openApp(page, engine);
  await sidebar(page, words.nav.help).click();
  await main(page)
    .getByRole('link', { name: guide.title, exact: true })
    .click();
  await expect(h1(page)).toHaveText(guide.title);
  await expect(h1(page)).toBeFocused();
  await expect(main(page).getByRole('heading')).toHaveText([
    guide.title,
    ...guide.sections.map((section) => section.heading),
  ]);
});

test('Getting started links the guide by the title the engine serves', async ({
  page,
  engine,
}) => {
  const listed = (await helpIndex(engine)).documents.find(
    (item) => item.id === beginnerGuide,
  );
  expect(listed, 'the help index lists the guide').toBeDefined();
  await openApp(page, engine);
  await sidebar(page, words.nav.gettingStarted).click();
  await expect(h1(page)).toHaveText(words.nav.gettingStarted);
  await main(page)
    .getByRole('link', { name: listed!.title, exact: true })
    .click();
  await expect(h1(page)).toHaveText(listed!.title);
});
