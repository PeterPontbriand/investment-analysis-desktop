// Ticker details (GUI.4a): the preview on hover or keyboard focus, the details
// panel on click or tap, looking up a ticker with no stored profile, the
// identity a saved run kept, and the headings that name a ticker. Each test
// runs left to right and right to left, against the engine mock.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { engineUrl, mockEngine, type Handler } from './engine-mock.ts';
import { instantDateText, instantText } from './expected-text.ts';
import { focusByKeyboard } from './keyboard.ts';
import { advance, momentum, openApp } from './refresh-helpers.ts';
import {
  analysisScript,
  analyze,
  choose,
  frames,
  openAnalyze,
  ticker as tickerField,
} from './analyze-helpers.ts';
import {
  analyzeRefreshId,
  coreRefreshId,
  identityOf,
} from '../fixtures/api/compare.ts';
import { refreshes } from '../fixtures/api/data.ts';
import {
  finished,
  job,
  summary,
  totals,
  type Frame,
  type JobScript,
} from '../fixtures/api/refresh.ts';
import { lookedUp, profiles } from '../fixtures/api/profiles.ts';
import { failure, ok, respond } from '../fixtures/api/server.ts';
import en from '../../src/locales/en.json' with { type: 'json' };
import ar from '../fixtures/locales/ar-XB.json' with { type: 'json' };

// The failures these tests provoke are logged by the browser.
test.use({ allowedHttpStatuses: [404, 503] });

const directions = [
  { name: 'left to right', dir: 'ltr', words: en },
  { name: 'right to left', dir: 'rtl', words: ar },
] as const;
type Direction = (typeof directions)[number];

const fill = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );

// Makes the application start in the direction's language.
async function useDirection(page: Page, direction: Direction) {
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
}

async function start(page: Page, direction: Direction, handler?: Handler) {
  await useDirection(page, direction);
  const engine = await mockEngine(page, handler);
  await page.goto(engineUrl);
  await expect(page.locator('html')).toHaveAttribute('dir', direction.dir);
  return engine;
}

const h1 = (page: Page) => page.getByRole('heading', { level: 1 });
const popup = (page: Page) => page.getByRole('tooltip');
const panel = (page: Page) => page.locator('#details-panel');
const tickerButton = (page: Page, name: string, index = 0) =>
  page.getByRole('button', { name, exact: true }).nth(index);

async function openCore(page: Page) {
  await page.getByRole('link', { name: 'Core' }).click();
  await expect(h1(page)).toHaveText('Core');
}

const profilePath = (ticker: string) => `/v1/instrument-profiles/${ticker}`;
const lookupPaths = (
  engine: Awaited<ReturnType<typeof mockEngine>>,
  ticker: string,
) => engine.actions('POST', `${profilePath(ticker)}/lookup`);

for (const direction of directions) {
  const words = direction.words;
  // The application formats dates in its own language.
  const locale = direction.dir === 'rtl' ? 'ar-XB' : 'en';

  test.describe(`preview (${direction.name})`, () => {
    test('opens on hover after a rest, with the name, venue, kind and currency', async ({
      page,
    }) => {
      await start(page, direction);
      await openCore(page);
      const trigger = tickerButton(page, 'ACME');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      const begun = Date.now();
      await trigger.hover();
      // Nothing opens at once: the pointer must rest first.
      await expect(popup(page)).toHaveCount(0);
      await expect(popup(page)).toBeVisible();
      expect(Date.now() - begun).toBeGreaterThanOrEqual(450);
      await expect(popup(page)).toContainText('Acme Corp');
      // The venue, kind and currency, joined by the separator (D290).
      await expect(popup(page)).toContainText(
        `NASDAQ ${words.common.separator} Equity ${words.common.separator} USD`,
      );
      // The kind is the engine's term name, with its term id kept.
      await expect(
        popup(page).locator('[data-term-id="instrument-kind-equity"]'),
      ).toHaveText('Equity');
      // Never the identifiers; no controls; linked while it is open.
      await expect(popup(page)).not.toContainText('ISSUER');
      await expect(popup(page)).not.toContainText('INSTRUMENT');
      await expect(popup(page).getByRole('button')).toHaveCount(0);
      await expect(popup(page).getByRole('link')).toHaveCount(0);
      const id = await popup(page).getAttribute('id');
      await expect(trigger).toHaveAttribute('aria-describedby', id ?? '');
    });

    test('does not open when the pointer passes by', async ({ page }) => {
      await start(page, direction);
      await openCore(page);
      await tickerButton(page, 'ACME').hover();
      await page.mouse.move(0, 0);
      await page.waitForTimeout(700);
      await expect(popup(page)).toHaveCount(0);
      await expect(tickerButton(page, 'ACME')).not.toHaveAttribute(
        'aria-describedby',
        /.+/,
      );
    });

    test('opens at once on keyboard focus, and closes on Escape and on blur', async ({
      page,
    }) => {
      await start(page, direction);
      await openCore(page);
      const trigger = tickerButton(page, 'ACME');
      await focusByKeyboard(page, trigger);
      await expect(popup(page)).toBeVisible();
      await expect(popup(page)).toContainText('Acme Corp');
      await page.keyboard.press('Escape');
      await expect(popup(page)).toHaveCount(0);
      // Escape closed the preview only: no panel, and the focus stayed.
      await expect(panel(page)).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await trigger.evaluate((element) => (element as HTMLElement).blur());
      await focusByKeyboard(page, trigger);
      await expect(popup(page)).toBeVisible();
      await page.keyboard.press('Tab');
      await expect(popup(page)).toHaveCount(0);
    });

    test('does not open on the focus a mouse click gives', async ({ page }) => {
      await start(page, direction);
      await openCore(page);
      await tickerButton(page, 'ACME').click();
      await expect(panel(page)).toBeVisible();
      await expect(popup(page)).toHaveCount(0);
    });

    test('stays open while the pointer is over the popup, and closes when it leaves both', async ({
      page,
    }) => {
      await start(page, direction);
      await openCore(page);
      await tickerButton(page, 'ACME').hover();
      await expect(popup(page)).toBeVisible();
      await popup(page).hover();
      await page.waitForTimeout(400);
      await expect(popup(page)).toBeVisible();
      await page.mouse.move(2, 2);
      await expect(popup(page)).toHaveCount(0);
    });

    test('closes on Escape while the pointer rests on the trigger', async ({
      page,
    }) => {
      await start(page, direction);
      await openCore(page);
      await tickerButton(page, 'ACME').hover();
      await expect(popup(page)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(popup(page)).toHaveCount(0);
    });

    test('aligns its inline start with the ticker, which mirrors in right-to-left text', async ({
      page,
    }) => {
      await start(page, direction);
      await openCore(page);
      const trigger = tickerButton(page, 'ACME');
      await trigger.hover();
      await expect(popup(page)).toBeVisible();
      const anchor = (await trigger.boundingBox())!;
      const shown = (await popup(page).boundingBox())!;
      const edge =
        direction.dir === 'ltr'
          ? shown.x - anchor.x
          : shown.x + shown.width - (anchor.x + anchor.width);
      expect(Math.abs(edge)).toBeLessThanOrEqual(2);
      // Below the ticker, inside the window.
      expect(shown.y).toBeGreaterThanOrEqual(anchor.y + anchor.height);
      const view = page.viewportSize()!;
      expect(shown.x).toBeGreaterThanOrEqual(0);
      expect(shown.x + shown.width).toBeLessThanOrEqual(view.width);
    });
  });

  test.describe(`details panel (${direction.name})`, () => {
    test('opens on click with focus on its heading, shows the details, and Escape closes it and returns focus', async ({
      page,
    }) => {
      await start(page, direction);
      await openCore(page);
      const trigger = tickerButton(page, 'ACME');
      await trigger.click();
      await expect(panel(page)).toBeVisible();
      const heading = panel(page).getByRole('heading', {
        name: fill(words.tickerDetails.panelTitle, { ticker: 'ACME' }),
      });
      await expect(heading).toBeFocused();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(trigger).toHaveAttribute('aria-controls', 'details-panel');
      await expect(panel(page)).toContainText('Acme Corp');
      await expect(panel(page)).toContainText('NASDAQ');
      await expect(
        panel(page).locator('[data-term-id="instrument-kind-equity"]'),
      ).toHaveText('Equity');
      await expect(panel(page)).toContainText('USD');
      await expect(panel(page)).toContainText(
        fill(words.tickerDetails.checked, {
          date: await instantText(page, profiles.ACME!.refreshed_at, locale),
          provider: 'Yahoo Finance',
        }),
      );
      await expect(panel(page)).not.toContainText('ISSUER');
      await expect(panel(page)).not.toContainText('INSTRUMENT');
      await expect(
        panel(page).getByRole('button', {
          name: words.tickerDetails.lookUpAgain,
        }),
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(panel(page)).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      // Focus given back opens no preview.
      await expect(popup(page)).toHaveCount(0);
    });

    test('opens from the keyboard with Enter, and the close button closes it and returns focus', async ({
      page,
    }) => {
      await start(page, direction);
      await openCore(page);
      const trigger = tickerButton(page, 'ZED');
      await focusByKeyboard(page, trigger);
      await expect(popup(page)).toBeVisible();
      await page.keyboard.press('Enter');
      await expect(panel(page)).toBeVisible();
      await expect(popup(page)).toHaveCount(0);
      await expect(panel(page).getByRole('heading')).toBeFocused();
      await panel(page)
        .getByRole('button', { name: words.detailsPanel.close })
        .click();
      await expect(panel(page)).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });

    test('shows one panel, replaced by the next ticker', async ({ page }) => {
      await start(page, direction);
      await openCore(page);
      await tickerButton(page, 'ACME').click();
      await expect(panel(page)).toContainText('Acme Corp');
      const first = tickerButton(page, 'ACME');
      await tickerButton(page, 'ZED').click();
      await expect(panel(page)).toHaveCount(1);
      await expect(panel(page)).toContainText('Zedco Group');
      await expect(panel(page)).not.toContainText('Acme Corp');
      await expect(panel(page).getByRole('heading')).toBeFocused();
      await expect(first).toHaveAttribute('aria-expanded', 'false');
      await expect(tickerButton(page, 'ZED')).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      // The same ticker again closes it.
      await tickerButton(page, 'ZED').click();
      await expect(panel(page)).toHaveCount(0);
    });

    test('overlays the inline-end side, leaving the table where it was', async ({
      page,
    }) => {
      await start(page, direction);
      await openCore(page);
      const table = page.locator('table').first();
      const before = (await table.boundingBox())!;
      await tickerButton(page, 'ACME').click();
      const shown = (await panel(page).boundingBox())!;
      const view = page.viewportSize()!;
      if (direction.dir === 'ltr')
        expect(Math.round(shown.x + shown.width)).toBe(view.width);
      else expect(Math.round(shown.x)).toBe(0);
      expect(await table.boundingBox()).toEqual(before);
      // Not modal: the dialog roles are absent and the content is not inert.
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.locator('main')).not.toHaveAttribute('inert', /.*/);
    });

    test('closes when the user goes to another screen', async ({ page }) => {
      await start(page, direction);
      await openCore(page);
      await tickerButton(page, 'ACME').click();
      await expect(panel(page)).toBeVisible();
      await page
        .getByRole('navigation', { name: en.nav.label })
        .getByRole('link', { name: words.nav.runs })
        .click();
      await expect(panel(page)).toHaveCount(0);
    });
  });

  test.describe(`tap (${direction.name})`, () => {
    test.use({ hasTouch: true });

    test('opens the panel, and no preview', async ({ page }) => {
      await start(page, direction);
      await openCore(page);
      await tickerButton(page, 'ACME').tap();
      await expect(panel(page)).toBeVisible();
      await expect(panel(page)).toContainText('Acme Corp');
      await expect(popup(page)).toHaveCount(0);
    });
  });

  test.describe(`a ticker with no stored profile (${direction.name})`, () => {
    // ACME has none stored until a lookup stores it.
    function noProfile(options: { hold?: Promise<void> } = {}) {
      let stored = false;
      const handler: Handler = async (url, request) => {
        if (url.pathname !== profilePath('ACME')) return undefined;
        if (request.method === 'GET' && !stored)
          return failure(
            404,
            'instrument_profile_not_found',
            'No profile is stored.',
          );
        return undefined;
      };
      const lookup: Handler = async (url, request) => {
        if (
          request.method !== 'POST' ||
          url.pathname !== `${profilePath('ACME')}/lookup`
        )
          return undefined;
        await options.hold;
        stored = true;
        return ok(lookedUp('ACME'));
      };
      return async (...args: Parameters<Handler>) =>
        (await lookup(...args)) ?? (await handler(...args));
    }

    test('says so in the preview and asks nothing of a provider until the user chooses Look up', async ({
      page,
    }) => {
      const engine = await start(page, direction, noProfile());
      await openCore(page);
      const none = fill(words.tickerDetails.noneStored, { ticker: 'ACME' });
      await tickerButton(page, 'ACME').hover();
      await expect(popup(page)).toHaveText(none);
      await page.mouse.move(2, 2);
      await expect(popup(page)).toHaveCount(0);
      await focusByKeyboard(page, tickerButton(page, 'ZED'));
      await expect(popup(page)).toBeVisible();
      expect(lookupPaths(engine, 'ACME')).toHaveLength(0);
      expect(engine.requests.filter((r) => r.method === 'POST')).toHaveLength(
        0,
      );
    });

    test('offers Look up in the panel, shows the pending text once, and shows the profile it found', async ({
      page,
    }) => {
      let release!: () => void;
      const hold = new Promise<void>((resolve) => (release = resolve));
      const engine = await start(page, direction, noProfile({ hold }));
      await openCore(page);
      await tickerButton(page, 'ACME').click();
      const none = fill(words.tickerDetails.noneStored, { ticker: 'ACME' });
      await expect(panel(page)).toContainText(none);
      const button = panel(page).getByRole('button', {
        name: words.tickerDetails.lookUp,
        exact: true,
      });
      await expect(button).toHaveClass(/primary/);
      await button.click();
      const pending = panel(page).getByRole('button', {
        name: words.tickerDetails.lookingUp,
      });
      await expect(pending).toHaveAttribute('aria-disabled', 'true');
      await pending.click({ force: true });
      release();
      await expect(panel(page)).toContainText('Bolt Industries');
      await expect(panel(page)).toContainText('TSX');
      await expect(panel(page)).toContainText('CAD');
      await expect(panel(page)).toContainText(
        fill(words.tickerDetails.checked, {
          date: await instantText(page, lookedUp('ACME').refreshed_at, locale),
          provider: 'Yahoo Finance',
        }),
      );
      await expect(
        panel(page).getByRole('button', {
          name: words.tickerDetails.lookUpAgain,
        }),
      ).toBeVisible();
      // One request, although the pending button was activated again.
      expect(lookupPaths(engine, 'ACME')).toHaveLength(1);
      // The lookup replaced the cached entry: no profile is asked for again.
      await page.keyboard.press('Escape');
      await tickerButton(page, 'ACME').hover();
      await expect(popup(page)).toContainText('Bolt Industries');
      expect(engine.paths(profilePath('ACME'))).toHaveLength(1);
    });

    test('looks up while a refresh is running', async ({ page }) => {
      await useDirection(page, direction);
      // The engine reports a refresh that is running when the application starts.
      const engine = await openApp(
        page,
        analysisScript(),
        noProfile(),
        ok(
          job({
            refresh_id: analyzeRefreshId,
            watchlist_id: null,
            totals: totals(2, 1, 0),
          }),
        ),
      );
      await openCore(page);
      await expect(
        page
          .getByRole('navigation', { name: en.nav.label })
          .getByText(
            words.nav.refreshRunning.replace(' · {finished} of {total}', ''),
          ),
      ).toBeVisible();
      await tickerButton(page, 'ACME').click();
      await panel(page)
        .getByRole('button', { name: words.tickerDetails.lookUp, exact: true })
        .click();
      await expect(panel(page)).toContainText('Bolt Industries');
      expect(lookupPaths(engine, 'ACME')).toHaveLength(1);
    });

    test('shows the reason the engine served for a lookup no provider could answer, in its language', async ({
      page,
    }) => {
      const served =
        'Unable to look up ACME: Yahoo Finance returned no data for it.';
      const engine = await start(page, direction, async (url, request) =>
        request.method === 'POST' && url.pathname.endsWith('/lookup')
          ? failure(404, 'provider_no_data', served, 'fr')
          : url.pathname === profilePath('ACME')
            ? failure(404, 'instrument_profile_not_found', 'None stored.')
            : undefined,
      );
      await openCore(page);
      await tickerButton(page, 'ACME').click();
      await panel(page)
        .getByRole('button', { name: words.tickerDetails.lookUp, exact: true })
        .click();
      const reason = panel(page).getByRole('alert').getByText(served);
      await expect(reason).toBeVisible();
      await expect(reason).toHaveAttribute('lang', 'fr');
      await expect(panel(page)).not.toContainText(words.state.defect);
      // Still offered, so the user can ask again.
      await expect(
        panel(page).getByRole('button', {
          name: words.tickerDetails.lookUp,
          exact: true,
        }),
      ).toBeVisible();
      expect(lookupPaths(engine, 'ACME')).toHaveLength(1);
    });

    test('shows a busy database with Try again, which asks again', async ({
      page,
    }) => {
      let busy = true;
      const engine = await start(page, direction, async (url, request) =>
        request.method === 'POST' && url.pathname.endsWith('/lookup')
          ? busy
            ? failure(503, 'database_busy', 'The database is busy.')
            : ok(lookedUp('ACME'))
          : url.pathname === profilePath('ACME')
            ? failure(404, 'instrument_profile_not_found', 'None stored.')
            : undefined,
      );
      void engine;
      await openCore(page);
      await tickerButton(page, 'ACME').click();
      await panel(page)
        .getByRole('button', { name: words.tickerDetails.lookUp, exact: true })
        .click();
      busy = false;
      await panel(page)
        .getByRole('button', { name: words.common.tryAgain })
        .click();
      await expect(panel(page)).toContainText('Bolt Industries');
    });
  });

  // The identity a saved run kept differs from the current profile of the same
  // ticker: ZED was reused (D289).
  test.describe(`the identity a saved run kept (${direction.name})`, () => {
    const zedRun = (page: Page) =>
      page.getByRole('row').filter({ hasText: 'ZED' });
    const heldAs = async (page: Page) =>
      fill(words.tickerDetails.identified, {
        date: await instantDateText(page, '2026-10-30T18:00:00+00:00', locale),
        provider: 'Yahoo Finance',
      });

    test('shows the run identity on Saved runs, and the current profile on the watchlist', async ({
      page,
    }) => {
      await start(page, direction);
      await openCore(page);
      await tickerButton(page, 'ZED').hover();
      await expect(popup(page)).toContainText('Zedco Group');
      await expect(popup(page)).toContainText('NYSE');
      await page.mouse.move(2, 2);
      await expect(popup(page)).toHaveCount(0);

      await page
        .getByRole('navigation', { name: en.nav.label })
        .getByRole('link', { name: words.nav.runs })
        .click();
      const trigger = zedRun(page).getByRole('button', { name: 'ZED' });
      await trigger.hover();
      await expect(popup(page)).toContainText('Zed Holdings');
      await expect(popup(page)).not.toContainText('Zedco');
      await expect(popup(page)).not.toContainText('NYSE');
      await page.mouse.move(2, 2);
      await trigger.click();
      await expect(panel(page)).toContainText('Zed Holdings');
      await expect(panel(page)).toContainText(await heldAs(page));
      await expect(panel(page)).not.toContainText('Zedco');
      // A run identity has no lookup.
      await expect(
        panel(page).getByRole('button', { name: /Look/ }),
      ).toHaveCount(0);
    });

    test("shows the first saved run's identity on a comparison row", async ({
      page,
    }) => {
      await start(page, direction);
      await page
        .getByRole('navigation', { name: en.nav.label })
        .getByRole('link', { name: words.nav.refreshes })
        .click();
      await page.locator('tbody').getByRole('link').first().click();
      await expect(page.locator('table.compare')).toBeVisible();
      // ZED's first saved run is its Graham Number run, which kept 'Zed Holdings'.
      const zed = page.locator('tbody tr').filter({ hasText: 'ZED' });
      await zed.getByRole('button', { name: 'ZED' }).click();
      await expect(panel(page)).toContainText('Zed Holdings');
      await expect(panel(page)).not.toContainText('Zedco');
      const acme = page.locator('tbody tr').filter({ hasText: 'ACME' });
      await acme.getByRole('button', { name: 'ACME' }).click();
      await expect(panel(page)).toContainText('Acme Corp');
      await expect(panel(page)).toContainText(await heldAs(page));
    });

    test('falls back to the current profile for a row with no saved run', async ({
      page,
    }) => {
      const noRuns = (url: URL) => {
        if (url.pathname !== `/v1/refreshes/${coreRefreshId}/compare`)
          return undefined;
        const reply = respond(url);
        const document = structuredClone(reply.body) as {
          rows: { ticker: string; entries: { run: unknown }[] }[];
        };
        for (const entry of document.rows[1]!.entries) entry.run = null;
        return { ...reply, body: document };
      };
      const engine = await start(page, direction, noRuns);
      await page
        .getByRole('navigation', { name: en.nav.label })
        .getByRole('link', { name: words.nav.refreshes })
        .click();
      await page.locator('tbody').getByRole('link').first().click();
      const zed = page.locator('tbody tr').filter({ hasText: 'ZED' });
      await zed.getByRole('button', { name: 'ZED' }).click();
      await expect(panel(page)).toContainText('Zedco Group');
      expect(engine.paths(profilePath('ZED'))).toHaveLength(1);
    });

    test('shows the run identity in the run detail heading and keeps the name without the document', async ({
      page,
    }) => {
      await start(page, direction);
      await page
        .getByRole('navigation', { name: en.nav.label })
        .getByRole('link', { name: words.nav.runs })
        .click();
      await zedRun(page).getByRole('link').first().click();
      await expect(h1(page)).toHaveText(
        fill(words.runDetail.title, {
          name: 'Zed Holdings',
          ticker: 'ZED',
          strategy: 'Quality Screen',
        }),
      );
      await h1(page).getByRole('button', { name: 'ZED' }).click();
      await expect(panel(page)).toContainText('Zed Holdings');
      await expect(panel(page)).not.toContainText('Zedco');
    });
  });

  test.describe(`headings that name a ticker (${direction.name})`, () => {
    const oneTickerRefresh = {
      refresh_id: analyzeRefreshId,
      watchlist_id: null,
      watchlist_name: null,
      first_completed_at: '2026-11-19T13:15:00+00:00',
      last_completed_at: '2026-11-19T13:15:30+00:00',
      run_count: 2,
      outcome_counts: {
        completed: 2,
        unavailable: 0,
        not_applicable: 0,
        failed: 0,
      },
    };
    const withOneTicker: Handler = (url) =>
      url.pathname === '/v1/refreshes'
        ? ok({
            schema_version: 1,
            has_more: false,
            items: [...refreshes, oneTickerRefresh],
          })
        : undefined;
    const analyzeRun = '10000000-0000-4000-8000-000000000031';

    async function openOneTicker(page: Page, handler: Handler) {
      await start(
        page,
        direction,
        async (url, request) =>
          (await handler(url, request)) ?? withOneTicker(url, request),
      );
      await page
        .getByRole('navigation', { name: en.nav.label })
        .getByRole('link', { name: words.nav.refreshes })
        .click();
      await page
        .getByRole('link', {
          name: await instantText(
            page,
            oneTickerRefresh.last_completed_at,
            locale,
          ),
        })
        .click();
    }
    const time = (page: Page) =>
      instantText(page, oneTickerRefresh.last_completed_at, locale);

    test('names the company and the ticker in the one-ticker comparison heading, with details on the ticker', async ({
      page,
    }) => {
      await openOneTicker(page, () => undefined);
      await expect(h1(page)).toHaveText(
        fill(words.compare.heading, {
          watchlist: fill(words.tickerDetails.nameAndTicker, {
            name: 'Acme Corp',
            ticker: 'ACME',
          }),
          time: await time(page),
        }),
      );
      await h1(page).getByRole('button', { name: 'ACME' }).click();
      await expect(panel(page)).toContainText('Acme Corp');
    });

    test('shows the ticker alone when no run kept a name', async ({ page }) => {
      await openOneTicker(page, (url) => {
        if (url.pathname !== `/v1/runs/${analyzeRun}/overview`)
          return undefined;
        const reply = respond(url);
        return {
          ...reply,
          body: {
            ...(reply.body as object),
            security_identity: identityOf('ACME', null),
          },
        };
      });
      await expect(h1(page)).toHaveText(
        fill(words.compare.heading, {
          watchlist: 'ACME',
          time: await time(page),
        }),
      );
      await expect(
        h1(page).getByRole('button', { name: 'ACME' }),
      ).toBeVisible();
    });

    test('shows the ticker alone when the run cannot be read', async ({
      page,
    }) => {
      await openOneTicker(page, (url) =>
        url.pathname === `/v1/runs/${analyzeRun}/overview`
          ? failure(404, 'analysis_run_not_found', 'No such run.')
          : undefined,
      );
      await expect(h1(page)).toHaveText(
        fill(words.compare.heading, {
          watchlist: 'ACME',
          time: await time(page),
        }),
      );
    });

    test('keeps the heading of a comparison of a watchlist as it was', async ({
      page,
    }) => {
      await start(page, direction);
      await page
        .getByRole('navigation', { name: en.nav.label })
        .getByRole('link', { name: words.nav.refreshes })
        .click();
      await page.locator('tbody').getByRole('link').first().click();
      await expect(h1(page)).toContainText('Core (as it was)');
      await expect(h1(page).getByRole('button')).toHaveCount(0);
    });

    test('names a run with no kept name by its ticker alone', async ({
      page,
    }) => {
      await start(page, direction);
      await page
        .getByRole('navigation', { name: en.nav.label })
        .getByRole('link', { name: words.nav.runs })
        .click();
      // The second saved run, MSFT under Momentum, kept no name.
      await page
        .getByRole('row')
        .filter({ hasText: 'Momentum' })
        .filter({ hasText: 'MSFT' })
        .getByRole('link')
        .first()
        .click();
      await expect(h1(page)).toHaveText(
        fill(words.runDetail.titleNoName, {
          ticker: 'MSFT',
          strategy: 'Momentum',
        }),
      );
      await h1(page).getByRole('button', { name: 'MSFT' }).hover();
      await expect(popup(page)).toHaveText(
        fill(words.tickerDetails.noneKept, { ticker: 'MSFT' }),
      );
    });
  });
}

// The headings of the refresh progress screen are live and announced, so only
// their ticker is a button; the announcement stays plain text (D299).
for (const direction of directions) {
  const { words } = direction;
  test.describe(`progress headings (${direction.name})`, () => {
    const heading = (page: Page) => page.getByRole('heading', { level: 1 });
    const headingTrigger = (page: Page) =>
      heading(page).getByRole('button', { name: 'ACME' });

    // Opens the panel from the heading's ticker, and closes it again.
    async function opensDetails(page: Page) {
      await headingTrigger(page).click();
      await expect(panel(page)).toContainText('Acme Corp');
      await page.keyboard.press('Escape');
      await expect(panel(page)).toHaveCount(0);
    }

    async function startAnalysis(page: Page, script: JobScript) {
      await useDirection(page, direction);
      await openAnalyze(page, script, { words });
      await expect(page.locator('html')).toHaveAttribute('dir', direction.dir);
      await tickerField(page, words).fill('ACME');
      await choose(page, 'Momentum');
      await choose(page, 'Graham Number');
      await analyze(page, words).click();
    }

    test('make the ticker a button in the running and the finished heading', async ({
      page,
    }) => {
      const script = analysisScript();
      await startAnalysis(page, script);
      await expect(heading(page)).toHaveText(
        fill(words.refresh.heading.running, { subject: 'ACME' }),
      );
      await headingTrigger(page).click();
      await expect(panel(page)).toContainText('Acme Corp');
      await page.keyboard.press('Escape');
      // The refresh's rows have ticker buttons too, with the current profile.
      await advance(page, script);
      await expect(
        page.locator('tbody').getByRole('button', { name: 'ACME' }),
      ).toHaveCount(2);
      await advance(page, script, 2);
      await expect(heading(page)).toHaveText(
        fill(words.refresh.heading.finished, { subject: 'ACME' }),
      );
      await opensDetails(page);
      await expect(
        page
          .getByRole('navigation', { name: words.nav.label })
          .locator('[aria-live="polite"]')
          .getByRole('button'),
      ).toHaveCount(0);
    });

    test('make the ticker a button in the stopped heading', async ({
      page,
    }) => {
      const stopped: Frame[] = [
        frames[0]!,
        { state: 'stopping', totals: totals(2, 2, 0) },
        {
          state: 'stopped',
          totals: totals(2, 2, 1),
          events: [finished(3, 0, 'ACME', momentum)],
          summary: summary(
            { completed: 1 },
            {
              refresh_id: analyzeRefreshId,
              watchlist_id: null,
              watchlist_name: null,
            },
          ),
        },
      ];
      const script = analysisScript(stopped, 1);
      await startAnalysis(page, script);
      await advance(page, script);
      await page.getByRole('button', { name: words.actions.stop }).click();
      await advance(page, script);
      await expect(heading(page)).toHaveText(
        fill(words.refresh.heading.stopped, { subject: 'ACME' }),
      );
      await opensDetails(page);
    });

    test('make the ticker a button in the failed heading', async ({ page }) => {
      const failed = failure(409, 'watchlist_empty', 'The entries failed.');
      const script = analysisScript([
        frames[0]!,
        {
          state: 'failed',
          totals: totals(2, 2, 0),
          failure: failed.body as never,
        },
      ]);
      await startAnalysis(page, script);
      await advance(page, script, 2);
      await expect(heading(page)).toHaveText(
        fill(words.refresh.heading.failed, { subject: 'ACME' }),
      );
      await opensDetails(page);
    });
  });
}
