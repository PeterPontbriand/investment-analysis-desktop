// Analyze a ticker (GUI.3d), against the engine mock: it answers the start of a
// refresh of entries, checks the body it was sent and plays a scripted job.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { engineUrl, mockEngine } from './engine-mock.ts';
import { advance, jobHandler } from './refresh-helpers.ts';
import {
  analysisScript,
  analyze,
  asOf,
  bodies,
  checkbox,
  choose,
  describedBy,
  field,
  frames,
  heading,
  navLink,
  openAnalyze,
  starts,
  strategy,
  ticker,
} from './analyze-helpers.ts';
import { analyzeRefreshId } from '../fixtures/api/compare.ts';
import { info } from '../fixtures/api/data.ts';
import * as actions from '../fixtures/api/actions.ts';
import {
  finished,
  job,
  started,
  summary,
  totals,
  type Frame,
} from '../fixtures/api/refresh.ts';
import * as selection from '../fixtures/api/selection.ts';
import { failure, ok } from '../fixtures/api/server.ts';
import en from '../../src/locales/en.json' with { type: 'json' };
import ar from '../fixtures/locales/ar-XB.json' with { type: 'json' };

// The failures these tests provoke are logged by the browser.
test.use({ allowedHttpStatuses: [400, 404, 409] });

const fill = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
const marker = (page: Page) =>
  page
    .getByRole('navigation', { name: en.nav.label })
    .getByRole('link', { name: /^Refresh (running|finished|stopped|failed)/ });
const rows = (page: Page) => page.locator('tbody tr');
const momentum = 'sma_crossover';
const grahamNumber = 'graham_number';

test.describe('analyzing', () => {
  test('is the navigation item after Getting started, and starts one refresh of entries from the keyboard', async ({
    page,
  }) => {
    const engine = await openAnalyze(page);
    await expect(
      page
        .getByRole('navigation', { name: en.nav.label })
        .getByRole('link')
        .nth(1),
    ).toHaveText(en.nav.analyze);
    // Each visit opens an empty form with nothing chosen (D267, D269).
    await expect(ticker(page)).toHaveValue('');
    await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: en.analyze.analyze, exact: true }),
    ).toHaveAttribute('aria-disabled', 'false');
    await ticker(page).fill('ACME');
    await asOf(page).fill('2025-12-31');
    await checkbox(page, 'Graham Number').focus();
    await page.keyboard.press('Space');
    await checkbox(page, 'Momentum').focus();
    await page.keyboard.press('Space');
    await analyze(page).focus();
    await page.keyboard.press('Enter');
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.running, { subject: 'ACME' }),
    );
    expect(engine.rejected).toEqual([]);
    const [body] = bodies(starts(engine)) as [
      { entries: { ticker: string; method_id: string; selection: unknown }[] },
    ];
    // Only the entries, one for each chosen strategy in the engine's order,
    // with the shared "As of" (D272).
    expect(Object.keys(body)).toEqual(['entries']);
    expect(
      body.entries.map((entry) => [entry.ticker, entry.method_id]),
    ).toEqual([
      ['ACME', momentum],
      ['ACME', grahamNumber],
    ]);
    for (const entry of body.entries)
      expect(entry.selection).toMatchObject({ as_of: '2025-12-31' });
    // The trail leads back to the Analyze screen the refresh started from (D380).
    await expect(
      page
        .getByRole('navigation', { name: en.breadcrumb.label })
        .getByRole('link'),
    ).toHaveText([en.nav.analyze]);
  });

  test('names the ticker on the progress screen, the ended state and the comparison (D274)', async ({
    page,
  }) => {
    const script = analysisScript();
    await openAnalyze(page, script);
    await ticker(page).fill('ACME');
    await choose(page, 'Momentum');
    await choose(page, 'Graham Number');
    await analyze(page).click();
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.running, { subject: 'ACME' }),
    );
    await advance(page, script);
    await expect(rows(page)).toHaveCount(2);
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.running, { subject: 'ACME' }),
    );
    await advance(page, script, 2);
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.finished, { subject: 'ACME' }),
    );
    await page.getByRole('link', { name: en.refresh.openComparison }).click();
    await expect(heading(page)).toContainText('ACME');
    await expect(heading(page)).not.toContainText(en.refreshes.adHoc);
    await expect(rows(page)).toHaveCount(1);
    await expect(
      page.getByRole('columnheader', { name: 'Momentum' }),
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Graham Number' }),
    ).toBeVisible();
  });

  test('announces the end by the ticker on any screen', async ({ page }) => {
    const script = analysisScript();
    await openAnalyze(page, script);
    await ticker(page).fill('ACME');
    await choose(page, 'Momentum');
    await analyze(page).click();
    await navLink(page, en.nav.watchlists).click();
    await advance(page, script, 3);
    await expect(marker(page)).toHaveText(en.nav.refreshFinished);
    await expect(
      page
        .getByRole('navigation', { name: en.nav.label })
        .locator('[aria-live="polite"]'),
    ).toHaveText(fill(en.refresh.announce.finished, { subject: 'ACME' }));
  });

  test('names the ticker when the refresh is stopped or fails', async ({
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
    await openAnalyze(page, script);
    await ticker(page).fill('ACME');
    await choose(page, 'Momentum');
    await choose(page, 'Graham Number');
    await analyze(page).click();
    await advance(page, script);
    await page.getByRole('button', { name: en.actions.stop }).click();
    await expect(heading(page)).toHaveText(en.refresh.heading.stopping);
    await advance(page, script);
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.stopped, { subject: 'ACME' }),
    );
  });

  test('names the ticker of a refresh that failed', async ({ page }) => {
    const failed = failure(409, 'watchlist_empty', 'The entries failed.');
    const script = analysisScript([
      frames[0]!,
      {
        state: 'failed',
        totals: totals(2, 2, 0),
        failure: failed.body as never,
      },
    ]);
    await openAnalyze(page, script);
    await ticker(page).fill('ACME');
    await choose(page, 'Momentum');
    await analyze(page).click();
    await advance(page, script, 2);
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.failed, { subject: 'ACME' }),
    );
  });

  test('a refresh the application attached to part-way names the ticker once every entry has a row', async ({
    page,
  }) => {
    const script = analysisScript();
    await openAnalyze(page, script, {
      discovered: ok(
        job({
          refresh_id: analyzeRefreshId,
          watchlist_id: null,
          totals: totals(2, 1, 0),
          events: [started(1, 0, 'ACME', momentum)],
          next_after: 1,
        }),
      ),
    });
    await marker(page).click();
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.running, { subject: en.refresh.subject.adHoc }),
    );
    await advance(page, script);
    await expect(rows(page)).toHaveCount(2);
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.running, { subject: 'ACME' }),
    );
  });

  test('works for a made-up strategy with no application code change', async ({
    page,
  }) => {
    const engine = await openAnalyze(page);
    await ticker(page).fill('KO');
    await choose(page, 'Quality Screen');
    const box = strategy(page, 'Quality Screen');
    await field(box, 'Screen weight').fill('2');
    await analyze(page).click();
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.running, { subject: 'KO' }),
    );
    expect(bodies(starts(engine))).toEqual([
      {
        entries: [
          {
            ticker: 'KO',
            method_id: 'quality_screen',
            selection: {
              weight: 2,
              tilt: 'value',
              strict: false,
              limits: { ceiling: 80 },
              use_cache: true,
            },
          },
        ],
      },
    ]);
    expect(engine.rejected).toEqual([]);
  });
});

test.describe('checks before sending', () => {
  test('asks for a ticker, for one ticker only, and for a strategy, sending nothing', async ({
    page,
  }) => {
    const engine = await openAnalyze(page, undefined, { clock: false });
    await choose(page, 'Momentum');
    await analyze(page).click();
    const missing = page.getByText(en.analyze.errors.tickerRequired);
    await expect(missing).toBeVisible();
    await describedBy(ticker(page), missing);
    await expect(ticker(page)).toBeFocused();
    await ticker(page).fill('   ');
    await analyze(page).click();
    await expect(missing).toBeVisible();
    await ticker(page).fill('ACME, BOLT');
    await analyze(page).click();
    const several = page.getByText(en.analyze.errors.oneTicker);
    await expect(several).toBeVisible();
    await describedBy(ticker(page), several);
    await expect(missing).toHaveCount(0);
    await ticker(page).fill('ACME');
    await checkbox(page, 'Momentum').uncheck();
    await analyze(page).click();
    await expect(
      page.getByText(en.analyze.errors.strategyRequired),
    ).toBeVisible();
    await expect(page.getByText(en.analyze.errors.oneTicker)).toHaveCount(0);
    expect(starts(engine)).toHaveLength(0);
  });

  test('asks for a required option at its field and opens the options', async ({
    page,
  }) => {
    const engine = await openAnalyze(page, undefined, { clock: false });
    await ticker(page).fill('ACME');
    await choose(page, 'Quality Screen');
    await analyze(page).click();
    const box = strategy(page, 'Quality Screen');
    await expect(field(box, 'Screen weight')).toBeFocused();
    await expect(box.getByText(en.selection.errors.required)).toBeVisible();
    expect(starts(engine)).toHaveLength(0);
  });
});

test.describe('engine errors', () => {
  test("shows each error at the field of the strategy it names, by the entry's index", async ({
    page,
  }) => {
    const engine = await openAnalyze(page, undefined, {
      clock: false,
      extra: (url, request) =>
        request.method === 'POST' && url.pathname === '/v1/refreshes'
          ? selection.failures.entryErrors
          : undefined,
    });
    await ticker(page).fill('ACME');
    // The second chosen strategy is entries[1] (D272).
    await choose(page, 'Graham Number');
    await choose(page, 'Quality Screen');
    const quality = strategy(page, 'Quality Screen');
    await field(quality, 'Screen weight').fill('2');
    await page
      .getByRole('button', {
        name: en.selection.hideOptions.replace('{strategy}', 'Quality Screen'),
      })
      .click();
    await analyze(page).click();
    const blank = page.getByText('Ticker must not be empty.');
    await expect(blank).toBeVisible();
    await describedBy(ticker(page), blank);
    const weight = page.getByText(
      'Invalid Screen weight: Input should be greater than 0',
    );
    await expect(weight).toHaveCount(1);
    // The options of the strategy hold the error, so they open.
    await describedBy(field(quality, 'Screen weight'), weight);
    await expect(ticker(page)).toBeFocused();
    expect(starts(engine)).toHaveLength(1);
    // Nothing started: the form is still there.
    await expect(heading(page)).toHaveText(en.analyze.heading);
    await expect(analyze(page)).toHaveAttribute('aria-disabled', 'false');
  });

  test('shows an error that names the list of entries above the button', async ({
    page,
  }) => {
    await openAnalyze(page, undefined, {
      clock: false,
      extra: (url, request) =>
        request.method === 'POST' && url.pathname === '/v1/refreshes'
          ? selection.failures.entriesList
          : undefined,
    });
    await ticker(page).fill('ACME');
    await choose(page, 'Momentum');
    await analyze(page).click();
    await expect(page.getByText('entries must not be empty.')).toBeVisible();
    await expect(ticker(page)).not.toHaveAttribute('aria-invalid', 'true');
  });
});

test.describe('while a refresh runs', () => {
  const running = ok(
    job({
      refresh_id: analyzeRefreshId,
      watchlist_id: null,
      totals: totals(2, 2, 0),
      events: [started(1, 0, 'ACME', momentum)],
      next_after: 1,
    }),
  );

  test('blocks Analyze, says why with a link to the progress, and keeps the form editable', async ({
    page,
  }) => {
    const engine = await openAnalyze(page, undefined, { discovered: running });
    await expect(analyze(page)).toHaveAttribute('aria-disabled', 'true');
    await expect(analyze(page)).not.toHaveAttribute('disabled');
    await expect(page.getByText(en.refresh.running)).toBeVisible();
    await ticker(page).fill('ACME');
    await expect(ticker(page)).toHaveValue('ACME');
    await choose(page, 'Momentum');
    await analyze(page).click({ force: true });
    await analyze(page).focus();
    await page.keyboard.press('Enter');
    expect(starts(engine)).toHaveLength(0);
    await page.getByRole('link', { name: en.refresh.showProgress }).click();
    await expect(heading(page)).toContainText(
      fill(en.refresh.heading.running, { subject: '' }).trim(),
    );
  });

  test('a start the engine refuses shows the catalog message and the link', async ({
    page,
  }) => {
    let refused = false;
    await openAnalyze(page, undefined, {
      extra: (url, request) => {
        if (request.method === 'POST' && url.pathname === '/v1/refreshes') {
          refused = true;
          return actions.failures.refreshRunning;
        }
        if (url.pathname === '/v1/refreshes/job' && refused) return running;
        return undefined;
      },
    });
    await ticker(page).fill('ACME');
    await choose(page, 'Momentum');
    await analyze(page).click();
    await expect(page.getByText(en.actions.refreshRunning)).toBeVisible();
    await page
      .getByRole('alert')
      .getByRole('link', { name: en.refresh.showProgress })
      .click();
    // The application did not start that refresh and has one row of its two,
    // so it cannot yet say whose it is (D274).
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.running, { subject: en.refresh.subject.adHoc }),
    );
  });

  test('shows "Starting…" while the request is pending', async ({ page }) => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await openAnalyze(page, undefined, {
      extra: async (url, request) => {
        if (request.method === 'POST' && url.pathname === '/v1/refreshes')
          await held;
        return undefined;
      },
    });
    await ticker(page).fill('ACME');
    await choose(page, 'Momentum');
    await analyze(page).click();
    const pending = page.getByRole('button', { name: en.actions.starting });
    await expect(pending).toHaveAttribute('aria-disabled', 'true');
    release();
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.running, { subject: 'ACME' }),
    );
  });
});

test.describe('the SEC identity notice', () => {
  test('shows above the form when none is set up, whichever strategies are chosen', async ({
    page,
  }) => {
    await openAnalyze(page);
    await expect(page.getByText(en.refresh.secIdentity)).toBeVisible();
    await choose(page, 'Momentum');
    await expect(page.getByText(en.refresh.secIdentity)).toBeVisible();
  });

  test('is absent when the engine has an SEC identity', async ({ page }) => {
    await openAnalyze(page, undefined, {
      extra: (url) =>
        url.pathname === '/v1/info'
          ? ok({ ...info, sec_identity_configured: true })
          : undefined,
    });
    await expect(page.getByText(en.refresh.secIdentity)).toHaveCount(0);
  });
});

test.describe('both text directions', () => {
  test('follows the pseudo-locale direction and words', async ({ page }) => {
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
    await page.clock.install();
    const script = analysisScript();
    const served = selection.selectionHandler();
    await mockEngine(
      page,
      jobHandler(script, (url, request) =>
        request.method === 'GET' ? served(url) : undefined,
      ),
    );
    await page.goto(engineUrl);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.getByRole('link', { name: ar.nav.analyze }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: ar.analyze.heading }),
    ).toBeVisible();
    const button = page.getByRole('button', { name: ar.analyze.analyze });
    const input = page.getByRole('textbox', { name: ar.analyze.ticker });
    const inputBox = await input.boundingBox();
    const buttonBox = await button.boundingBox();
    // The ticker field sits at the inline start (right); the button at the end.
    expect((inputBox?.x ?? 0) > (buttonBox?.x ?? 0)).toBe(true);
  });
});
