// Ticker details against a real engine (GUI.4a): what the preview, the panel,
// the add-entries warning and the saved-run identity show is compared with what
// the engine serves for the same thing. Nothing here names a company, an
// exchange or a provider: those come from the engine, so each test passes with
// and without an SEC identity. See README.md in this folder.
import type { Page } from '@playwright/test';
import type { components } from '../../../src/api/schema.ts';
import { instantDateText, instantText } from '../expected-text.ts';
import { focusByKeyboard } from '../keyboard.ts';
import * as selection from '../../fixtures/api/selection.ts';
import en from '../../../src/locales/en.json' with { type: 'json' };
import {
  expect,
  knownTicker,
  openApp,
  test,
  unknownTicker,
  watchlistName,
  type Profile,
  type RealEngine,
} from './real-engine.ts';

// The failures these tests provoke (no stored profile, a lookup no provider can
// answer, a duplicate entry) are logged by the browser.
test.use({ allowedHttpStatuses: [400, 404] });

const noProviders = 'The data providers cannot be reached from this machine.';
const words = en;

const fill = (template: string, values: Record<string, string>) =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  );
const present = <T>(value: T | null): value is T => value !== null;
const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

const popup = (page: Page) => page.getByRole('tooltip');
const panel = (page: Page) => page.locator('#details-panel');
const tickerButton = (page: Page, ticker: string) =>
  page.getByRole('button', { name: ticker, exact: true }).first();

async function openWatchlist(page: Page, engine: RealEngine, name: string) {
  await openApp(page, engine);
  await page.getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
}

// What the engine serves for a profile, as the preview and the panel show it:
// the name, then the venue only when the engine serves one, the kind's term name,
// the currency, and the line saying when and with which provider it was checked.
async function expectedDetails(
  page: Page,
  engine: RealEngine,
  profile: Profile,
) {
  const kind =
    profile.kind === null
      ? null
      : await engine.termName('InstrumentKind', profile.kind);
  const parts = [profile.listing_venue, kind, profile.quote_currency].filter(
    present,
  );
  const checked = fill(words.tickerDetails.checked, {
    date: await instantText(page, profile.refreshed_at),
    provider: engine.providerName(profile.provider_id) ?? '',
  });
  return {
    preview: squash(
      [profile.instrument_name, parts.join(` ${words.common.separator} `)]
        .filter((part) => part !== null && part !== '')
        .join(' '),
    ),
    lines: [
      profile.instrument_name,
      profile.listing_venue,
      kind,
      profile.quote_currency,
      checked,
    ]
      .filter(present)
      .map(squash),
  };
}

const panelLines = async (page: Page) =>
  (await panel(page).locator('.lines > p').allTextContents()).map(squash);

test.describe('the details of a watchlist entry', () => {
  test('shows what the engine serves for the ticker, in the preview and the panel', async ({
    page,
    engine,
  }) => {
    test.skip(!engine.providers, noProviders);
    // With an SEC identity the setup's lookup stored the profile. Without one
    // the engine answers a lookup and stores nothing (its API document, "Instrument
    // profiles"), so the ticker has no stored profile and the user looks it up.
    const stored = await engine.get<Profile>(
      `/v1/instrument-profiles/${knownTicker}`,
    );
    await openWatchlist(page, engine, watchlistName);
    const trigger = tickerButton(page, knownTicker);
    await trigger.hover();
    await expect(popup(page)).toBeVisible();

    if (stored.status === 200) {
      const expected = await expectedDetails(page, engine, stored.body);
      expect(squash(await popup(page).innerText())).toBe(expected.preview);
      await page.mouse.move(0, 0);
      await expect(popup(page)).toHaveCount(0);
      await trigger.click();
      await expect(panel(page)).toBeVisible();
      await expect.poll(() => panelLines(page)).toEqual(expected.lines);
      // A stored profile offers no lookup.
      await expect(
        panel(page).getByRole('button', { name: words.tickerDetails.lookUp }),
      ).toHaveCount(0);
    } else {
      expect(stored.status).toBe(404);
      const none = fill(words.tickerDetails.noneStored, {
        ticker: knownTicker,
      });
      await expect(popup(page)).toContainText(none);
      await page.mouse.move(0, 0);
      await trigger.click();
      await expect(panel(page)).toContainText(none);
      // What the lookup answers is what the panel then shows.
      const answer = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response
            .url()
            .endsWith(`/v1/instrument-profiles/${knownTicker}/lookup`),
      );
      await panel(page)
        .getByRole('button', { name: words.tickerDetails.lookUp, exact: true })
        .click();
      const profile = (await (await answer).json()) as Profile;
      const expected = await expectedDetails(page, engine, profile);
      await expect.poll(() => panelLines(page)).toEqual(expected.lines);
    }

    // Escape closes the panel after a click in the content behind it.
    await page.locator('tbody tr').first().locator('td').first().click();
    await expect(panel(page).getByRole('heading')).not.toBeFocused();
    await page.keyboard.press('Escape');
    await expect(panel(page)).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('closes from the keyboard with the close button, leaving focus on the ticker', async ({
    page,
    engine,
  }) => {
    test.skip(!engine.providers, noProviders);
    await openWatchlist(page, engine, watchlistName);
    const trigger = tickerButton(page, knownTicker);
    await focusByKeyboard(page, trigger);
    await page.keyboard.press('Enter');
    await expect(panel(page).getByRole('heading')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      panel(page).getByRole('button', { name: words.detailsPanel.close }),
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(panel(page)).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await trigger.evaluate((e) => e.matches(':focus-visible'))).toBe(
      true,
    );
  });
});

test.describe('a ticker no provider knows', () => {
  test("is added with the not-recognized warning, has no stored details, and shows the engine's message on a lookup", async ({
    page,
    engine,
  }, testInfo) => {
    test.skip(!engine.providers, noProviders);
    const name = `Add ${testInfo.project.name}`;
    expect((await engine.cli(['watchlist', 'create', name])).code).toBe(0);
    const strategies = (
      await engine.get<components['schemas']['StrategiesDocument']>(
        '/v1/strategies',
      )
    ).body.items;
    const strategy = strategies.find((item) => item.method === 'piotroski');
    expect(strategy, 'the engine lists a Piotroski strategy').toBeDefined();
    await openWatchlist(page, engine, name);
    await page
      .getByRole('button', { name: words.watchlist.addEntries })
      .click();
    await page
      .getByRole('checkbox', { name: strategy!.label, exact: true })
      .check();
    await page.getByLabel(words.addEntries.tickers).fill(unknownTicker);
    await page
      .getByRole('button', { name: words.addEntries.add, exact: true })
      .click();

    const status = (text: string) =>
      page.getByRole('status').filter({ hasText: text });
    const addedOne = words.watchlist.added
      .split(' | ')[0]!
      .replace('{count}', '1');
    await expect(status(addedOne)).toBeVisible();
    const warning = (termId: string) =>
      engine.termById(termId).then((term) =>
        status(
          fill(words.watchlist.entryWarning, {
            ticker: unknownTicker,
            warning: term,
          }),
        ),
      );
    const notRecognized = await warning('entry-warning-ticker-not-recognized');
    const notChecked = await warning('entry-warning-ticker-not-checked');
    await expect(notRecognized.or(notChecked)).toBeVisible();
    test.skip(await notChecked.isVisible(), noProviders);
    await expect(notRecognized).toBeVisible();

    // No profile is stored for the ticker: the preview says so.
    const trigger = tickerButton(page, unknownTicker);
    await trigger.hover();
    await expect(popup(page)).toContainText(
      fill(words.tickerDetails.noneStored, { ticker: unknownTicker }),
    );
    await page.mouse.move(0, 0);
    await trigger.click();
    await expect(panel(page)).toContainText(
      fill(words.tickerDetails.noneStored, { ticker: unknownTicker }),
    );

    // Look up shows the message the engine serves for the same lookup.
    await panel(page)
      .getByRole('button', { name: words.tickerDetails.lookUp, exact: true })
      .click();
    const alert = panel(page).getByRole('alert');
    await expect(alert).toBeVisible();
    const served = await engine.post<components['schemas']['FailureEnvelope']>(
      `/v1/instrument-profiles/${unknownTicker}/lookup`,
    );
    test.skip(
      served.body.reason_code !== 'provider_no_data',
      `The engine answered the lookup with ${served.body.reason_code}, not that no provider has data for it.`,
    );
    await expect(alert).toContainText(served.body.reason ?? '');
    // The message's own template, which the engine defines, with the name of a
    // provider the engine lists.
    const match = new RegExp(
      `^Unable to look up ${unknownTicker}: (.+) returned no data for it\\.$`,
    ).exec(served.body.reason ?? '');
    expect(match, 'the engine message follows its template').not.toBeNull();
    const info = (
      await engine.get<components['schemas']['InfoDocument']>('/v1/info')
    ).body;
    expect(info.providers.map((provider) => provider.name)).toContain(
      match![1],
    );
    // Still offered, and nothing was stored.
    await expect(
      panel(page).getByRole('button', {
        name: words.tickerDetails.lookUp,
        exact: true,
      }),
    ).toBeVisible();
    expect(
      (await engine.get(`/v1/instrument-profiles/${unknownTicker}`)).status,
    ).toBe(404);
  });
});

test.describe('the identity a saved run kept', () => {
  test("shows the run overview's identity on the Saved runs row, and the name in the run title", async ({
    page,
    engine,
  }) => {
    test.skip(engine.savedRunId === null, noProviders);
    const overview = (
      await engine.get<components['schemas']['RunOverviewDocument']>(
        `/v1/runs/${engine.savedRunId}/overview`,
      )
    ).body;
    const identity = overview.security_identity;
    await openApp(page, engine);
    await page
      .getByRole('navigation', { name: words.nav.label })
      .getByRole('link', { name: words.nav.runs })
      .click();
    const trigger = tickerButton(page, overview.ticker);

    await trigger.hover();
    await expect(popup(page)).toBeVisible();
    await expect(popup(page)).toContainText(identity.instrument_name ?? '');
    if (identity.listing_venue !== null)
      await expect(popup(page)).toContainText(identity.listing_venue);
    await page.mouse.move(0, 0);

    await trigger.click();
    await expect(panel(page)).toBeVisible();
    const provider = engine.providerName(identity.provider_id);
    const date =
      identity.resolved_at === null
        ? null
        : await instantDateText(page, identity.resolved_at);
    const stamp =
      date === null
        ? null
        : provider === null
          ? fill(words.tickerDetails.identifiedNoProvider, { date })
          : fill(words.tickerDetails.identified, { date, provider });
    const lines = (
      await panel(page).locator('.lines > p').allTextContents()
    ).map(squash);
    expect(lines).toEqual(
      [identity.instrument_name, identity.listing_venue, stamp]
        .filter(present)
        .map(squash),
    );
    await page.keyboard.press('Escape');

    // The run detail's title starts with the same name.
    await page.locator('tbody tr').first().getByRole('link').first().click();
    const title = squash(
      (await page.getByRole('heading', { level: 1 }).textContent()) ?? '',
    );
    expect(
      title.startsWith(
        identity.instrument_name === null
          ? `${overview.ticker} `
          : `${identity.instrument_name} (${overview.ticker}) `,
      ),
    ).toBe(true);
  });
});

// The template the mocked tests' fixture gives a rule error.
const fixtureTemplate = (reply: { body: unknown }) =>
  (reply.body as components['schemas']['FailureEnvelope']).errors![0]!.template;

test.describe('a duplicate entry', () => {
  test("shows the engine's message at Tickers, for a twin in the watchlist and in the request", async ({
    page,
    engine,
  }, testInfo) => {
    const name = `Duplicate ${testInfo.project.name}`;
    expect((await engine.cli(['watchlist', 'create', name])).code).toBe(0);
    const strategies = (
      await engine.get<components['schemas']['StrategiesDocument']>(
        '/v1/strategies',
      )
    ).body.items;
    const strategy = strategies.find((item) => item.method === 'piotroski');
    expect(strategy, 'the engine lists a Piotroski strategy').toBeDefined();
    const lists = (
      await engine.get<{
        items: { watchlist_id: string; display_name: string }[];
      }>('/v1/watchlists')
    ).body.items;
    const id = lists.find((item) => item.display_name === name)?.watchlist_id;
    const path = `/v1/watchlists/${id}/entries`;
    const request = (tickers: string[]) => ({
      method_id: 'piotroski',
      tickers,
    });

    await openWatchlist(page, engine, name);
    const open = async () => {
      await page
        .getByRole('button', { name: words.watchlist.addEntries })
        .click();
      await page
        .getByRole('checkbox', { name: strategy!.label, exact: true })
        .check();
    };
    const submit = async (tickers: string) => {
      await page.getByLabel(words.addEntries.tickers).fill(tickers);
      await page
        .getByRole('button', { name: words.addEntries.add, exact: true })
        .click();
    };
    // What the engine serves for the same request, as the field shows it: the
    // template with the field's label and the engine's arguments.
    const served = async (tickers: string[]) => {
      const reply = await engine.post<components['schemas']['FailureEnvelope']>(
        path,
        request(tickers),
      );
      expect(reply.status).toBe(400);
      const error = reply.body.errors?.[0];
      expect(error?.rule).toBe('entries.duplicate');
      const args = error!.arguments as Record<string, string>;
      return {
        template: error!.template,
        text: error!
          .template!.replace('{tickers}', words.addEntries.tickers)
          .replace('{ticker}', args.ticker!)
          .replace('{strategy}', args.strategy!),
      };
    };

    await open();
    await submit('KO');
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: 'KO' })
        .or(page.getByRole('heading', { level: 1 }).filter({ hasText: name }))
        .first(),
    ).toBeVisible();
    await expect
      .poll(
        async () =>
          (await engine.get<{ entries: unknown[] }>(`/v1/watchlists/${id}`))
            .body.entries.length,
      )
      .toBe(1);

    // An entry already in the watchlist.
    await open();
    await submit('KO');
    const inWatchlist = await served(['KO']);
    expect(inWatchlist.template).toBe(
      fixtureTemplate(selection.failures.duplicate),
    );
    const message = page.getByText(inWatchlist.text);
    await expect(message).toBeVisible();
    await expect(page.getByLabel(words.addEntries.tickers)).toBeFocused();

    // A ticker listed twice in one request.
    await submit('MSFT MSFT');
    const twice = await served(['MSFT', 'MSFT']);
    expect(twice.template).toBe(
      fixtureTemplate(selection.failures.twinInRequest),
    );
    await expect(page.getByText(twice.text)).toBeVisible();
  });
});
