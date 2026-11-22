// Term popups against a real engine (GUI.4b): the definition a term's preview
// and panel show is the one the engine serves for that id in /v1/help, and the
// engine serves every term the application's own labels name. No engine text is
// written out here. See README.md in this folder.
import type { Page } from '@playwright/test';
import type { components } from '../../../src/api/schema.ts';
import { labelTerms } from '../../../src/api/labelTerms.ts';
import en from '../../../src/locales/en.json' with { type: 'json' };
import { expect, openApp, test, type RealEngine } from './real-engine.ts';

type Index = components['schemas']['HelpIndexDocument'];
type References = components['schemas']['HelpReferencesDocument'];

const noProviders = 'The data providers cannot be reached from this machine.';
const words = en;

const popup = (page: Page) => page.getByRole('tooltip');
const panel = (page: Page) => page.locator('#details-panel');

async function helpTerm(engine: RealEngine, termId: string) {
  const index = (await engine.get<Index>('/v1/help')).body;
  return index.groups
    .flatMap((group) => group.terms)
    .find((term) => term.id === termId);
}

test('the engine serves a term for every label the application names (D314)', async ({
  engine,
}) => {
  for (const termId of Object.values(labelTerms)) {
    const term = await helpTerm(engine, termId);
    expect(term, `the help index lists ${termId}`).toBeDefined();
    expect(term!.definition.length).toBeGreaterThan(0);
  }
});

test("a run outcome pill's preview shows the definition the engine serves, and its panel the name and definition", async ({
  page,
  engine,
}) => {
  test.skip(engine.savedRunId === null, noProviders);
  const overview = (
    await engine.get<components['schemas']['RunOverviewDocument']>(
      `/v1/runs/${engine.savedRunId}/overview`,
    )
  ).body;
  const references = (await engine.get<References>('/v1/help/references')).body;
  const termId = references.code_sets['RunOutcome']?.[overview.outcome];
  expect(termId, 'the engine gives the outcome a term').toBeDefined();
  const term = (await helpTerm(engine, termId!))!;

  await openApp(page, engine);
  await page
    .getByRole('navigation', { name: words.nav.label })
    .getByRole('link', { name: words.nav.runs })
    .click();
  const pill = page
    .getByRole('button', { name: term.name, exact: true })
    .first();
  await pill.hover();
  await expect(popup(page)).toBeVisible();
  await expect(popup(page)).toHaveText(term.definition);
  await pill.click();
  await expect(panel(page).getByRole('heading')).toHaveText(term.name);
  await expect(panel(page)).toContainText(term.definition);
});

test('the "As of" column header on a watchlist explains itself with the engine\'s definition', async ({
  page,
  engine,
}) => {
  const term = (await helpTerm(engine, labelTerms.asOf))!;
  await openApp(page, engine);
  await page.getByRole('link', { name: 'Engine Tests', exact: true }).click();
  const header = page
    .getByRole('columnheader')
    .getByRole('button', { name: words.watchlist.columns.asOf });
  await header.hover();
  await expect(popup(page)).toHaveText(term.definition);
  await header.click();
  await expect(panel(page).getByRole('heading')).toHaveText(term.name);
});
