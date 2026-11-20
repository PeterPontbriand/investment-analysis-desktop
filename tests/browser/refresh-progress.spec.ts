// Refresh with progress and stop (GUI.3c), against the engine mock playing a
// scripted job across polls. The clock is moved by the test, a poll at a time.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { mockEngine, engineUrl } from './engine-mock.ts';
import {
  advance,
  failedRunId,
  frames,
  grahamNumber,
  jobHandler,
  momentum,
  openApp,
  openCore,
} from './refresh-helpers.ts';
import { coreComparison } from '../fixtures/api/compare.ts';
import { coreId, info } from '../fixtures/api/data.ts';
import * as actions from '../fixtures/api/actions.ts';
import {
  finished,
  job,
  notFound,
  refreshId,
  savedRunId,
  scriptedJob,
  started,
  summary,
  totals,
  type Frame,
} from '../fixtures/api/refresh.ts';
import { failure, ok } from '../fixtures/api/server.ts';
import en from '../../src/locales/en.json' with { type: 'json' };
import ar from '../fixtures/locales/ar-XB.json' with { type: 'json' };

test.use({ allowedHttpStatuses: [404, 409] });

const fill = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
// The catalog's plural forms are separated by "|"; the second is the plural.
const plural = (template: string, count: number, values = {}) =>
  fill((template.split(' | ')[count === 1 ? 0 : 1] ?? template).trim(), {
    count,
    ...values,
  });

const counts = (finishedCount: number, total: number) =>
  plural(en.refresh.counts, total, { finished: finishedCount, total });
const heading = (page: Page) => page.getByRole('heading', { level: 1 });
const refreshNow = (page: Page) =>
  page.getByRole('button', { name: en.refresh.now });
const stopButton = (page: Page) =>
  page.getByRole('button', { name: en.actions.stop });
const marker = (page: Page) =>
  page
    .getByRole('navigation', { name: en.nav.label })
    .getByRole('link', { name: /^Refresh (running|finished|stopped|failed)/ });
const navLink = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: en.nav.label })
    .getByRole('link', { name, exact: true });
const rows = (page: Page) => page.locator('tbody tr');
const running = (finishedCount: number, total: number) =>
  fill(en.nav.refreshRunning, { finished: finishedCount, total });

async function startFromCore(page: Page) {
  await openCore(page);
  await refreshNow(page).focus();
  await page.keyboard.press('Enter');
  await expect(heading(page)).toHaveText(
    fill(en.refresh.heading.running, { subject: 'Core' }),
  );
}

test.describe('starting', () => {
  test('starts from the watchlist screen, by keyboard, and opens the progress screen', async ({
    page,
  }) => {
    const script = scriptedJob(frames);
    const engine = await openApp(page, script);
    await startFromCore(page);
    expect(engine.actions('POST', '/v1/refreshes')[0]?.body).toEqual({
      watchlist_id: coreId,
    });
    expect(engine.rejected).toEqual([]);
    await expect(
      page.getByText(counts(0, 4), { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: en.breadcrumb.label }),
    ).toContainText(en.nav.refreshes);
  });

  test('starts from the comparison of a refresh that has a watchlist', async ({
    page,
  }) => {
    const script = scriptedJob(frames);
    const engine = await openApp(page, script);
    await navLink(page, en.nav.refreshes).click();
    await page
      .getByRole('row')
      .filter({ hasText: 'Core (as it was)' })
      .getByRole('link')
      .first()
      .click();
    await expect(refreshNow(page)).toBeVisible();
    await refreshNow(page).click();
    expect(engine.actions('POST', '/v1/refreshes')[0]?.body).toEqual({
      watchlist_id: coreComparison.watchlist_id,
    });
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.running, { subject: 'Core' }),
    );
  });

  test('is not offered on the comparison of entries that belong to no watchlist, or on an empty watchlist', async ({
    page,
  }) => {
    await openApp(page, scriptedJob(frames));
    await navLink(page, en.nav.refreshes).click();
    await page
      .getByRole('row')
      .filter({ hasText: en.refreshes.adHoc })
      .getByRole('link')
      .first()
      .click();
    await expect(heading(page)).toBeVisible();
    await expect(refreshNow(page)).toHaveCount(0);
    await navLink(page, en.nav.watchlists).click();
    await page.getByRole('link', { name: 'Empty' }).click();
    await expect(heading(page)).toHaveText('Empty');
    await expect(refreshNow(page)).toHaveCount(0);
  });

  test('shows the engine message for an empty watchlist it refuses', async ({
    page,
  }) => {
    const script = scriptedJob(frames);
    await openApp(page, script, (url, { method }) =>
      method === 'POST' && url.pathname === '/v1/refreshes'
        ? actions.failures.empty
        : undefined,
    );
    await openCore(page);
    await refreshNow(page).click();
    await expect(page.getByText('The watchlist has no entries.')).toBeVisible();
    await expect(heading(page)).toHaveText('Core');
  });

  test('a start refused because a refresh runs shows the catalog message and a link to its progress', async ({
    page,
  }) => {
    const script = scriptedJob(frames);
    let startRefused = true;
    await page.clock.install();
    await mockEngine(page, (url, request) => {
      if (url.pathname === '/v1/refreshes' && request.method === 'POST')
        return actions.failures.refreshRunning;
      if (url.pathname === '/v1/refreshes/job' && !startRefused)
        return ok(job({ totals: totals(4, 2, 0) }));
      return jobHandler(script)(url, request);
    });
    await page.goto(engineUrl);
    await openCore(page);
    startRefused = false;
    await refreshNow(page).click();
    const message = page.getByText(en.actions.refreshRunning);
    await expect(message).toBeVisible();
    // The engine's own text names a raw identifier and is never shown.
    await expect(page.getByText('is already running.')).toHaveCount(1);
    await page
      .getByRole('alert')
      .getByRole('link', { name: en.refresh.showProgress })
      .click();
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.running, { subject: 'Core' }),
    );
  });
});

test.describe('progress', () => {
  test('advances from the engine, shows each event once, and ends in the finished state', async ({
    page,
  }) => {
    const script = scriptedJob(frames);
    await openApp(page, script);
    await startFromCore(page);
    await advance(page, script);
    await expect(rows(page)).toHaveCount(2);
    await expect(rows(page).nth(0)).toContainText('ACME');
    await expect(rows(page).nth(0)).toContainText('Momentum');
    await expect(rows(page).nth(0)).toContainText(en.refresh.rowRunning);
    await expect(
      page.getByText(plural(en.refresh.notStartedYet, 2)),
    ).toBeVisible();
    await advance(page, script);
    await expect(
      page.getByText(counts(1, 4), { exact: true }).first(),
    ).toBeVisible();
    // A finished row's outcome is a pill linked to its saved run.
    await expect(
      rows(page).nth(0).getByRole('link', { name: 'Completed' }),
    ).toHaveAttribute('href', `/runs/${savedRunId}`);
    await advance(page, script);
    await expect(rows(page)).toHaveCount(4);
    // A failed outcome shows only its pill, linked to its run; the reason is
    // on the run's own screen.
    const failed = rows(page).nth(2);
    await expect(failed.getByRole('link', { name: 'Failed' })).toHaveAttribute(
      'href',
      `/runs/${failedRunId}`,
    );
    await expect(failed).not.toContainText('Provider error');
    await advance(page, script);
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.finished, { subject: 'Core' }),
    );
    await expect(
      page.getByText(counts(4, 4), { exact: true }).first(),
    ).toBeVisible();
    for (const pill of ['Completed 2', 'Unavailable 1', 'Failed 1'])
      await expect(page.getByText(pill, { exact: true })).toBeVisible();
    await expect(page.getByText(en.refresh.unexpected)).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: en.refresh.openComparison }),
    ).toHaveAttribute('href', `/refreshes/${refreshId}`);
    await expect(stopButton(page)).toHaveCount(0);
    // Every event once: the client named the last sequence each time.
    expect(script.afters).toEqual([0, 2, 4, 7]);
    await expect(rows(page)).toHaveCount(4);
    // Nothing more is asked once the refresh has ended.
    await page.clock.runFor(5000);
    expect(script.afters).toHaveLength(4);
  });

  test('the navigation marker shows progress and returns to the screen without losing a row', async ({
    page,
  }) => {
    const script = scriptedJob(frames);
    await openApp(page, script);
    await startFromCore(page);
    await advance(page, script, 2);
    await expect(rows(page)).toHaveCount(3);
    await navLink(page, en.nav.watchlists).click();
    await expect(marker(page)).toHaveText(running(1, 4));
    await advance(page, script);
    await expect(marker(page)).toHaveText(running(3, 4));
    await marker(page).click();
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.running, { subject: 'Core' }),
    );
    await expect(rows(page)).toHaveCount(4);
    await expect(
      page.getByText(counts(3, 4), { exact: true }).first(),
    ).toBeVisible();
    expect(script.afters).toEqual([0, 2, 4]);
  });

  test('the marker says how the refresh ended until the progress screen has shown it, and the end is announced on any screen', async ({
    page,
  }) => {
    const script = scriptedJob(frames);
    await openApp(page, script);
    await startFromCore(page);
    await navLink(page, en.nav.watchlists).click();
    await advance(page, script, 4);
    await expect(marker(page)).toHaveText(en.nav.refreshFinished);
    await expect(
      page
        .getByRole('navigation', { name: en.nav.label })
        .locator('[aria-live="polite"]'),
    ).toHaveText(fill(en.refresh.announce.finished, { subject: 'Core' }));
    await marker(page).click();
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.finished, { subject: 'Core' }),
    );
    await navLink(page, en.nav.watchlists).click();
    await expect(marker(page)).toHaveCount(0);
  });

  test('the marker does not announce the end while the progress screen of that refresh is open (D263)', async ({
    page,
  }) => {
    const script = scriptedJob(frames);
    await openApp(page, script);
    await startFromCore(page);
    await advance(page, script, 4);
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.finished, { subject: 'Core' }),
    );
    await expect(page.locator('main [aria-live="polite"]')).toContainText(
      fill(en.refresh.heading.finished, { subject: 'Core' }),
    );
    await expect(
      page
        .getByRole('navigation', { name: en.nav.label })
        .locator('[aria-live="polite"]'),
    ).toHaveText('');
  });

  test('announces the counts line politely from a region of its own', async ({
    page,
  }) => {
    const script = scriptedJob(frames);
    await openApp(page, script);
    await startFromCore(page);
    const region = page.locator('main [aria-live="polite"]');
    await expect(region).toHaveText('');
    await advance(page, script);
    await advance(page, script);
    await expect(region).toHaveText(counts(1, 4));
    // The next change comes within ten seconds: held back.
    await advance(page, script);
    await expect(region).toHaveText(counts(1, 4));
    await advance(page, script);
    await expect(region).toContainText(
      fill(en.refresh.heading.finished, { subject: 'Core' }),
    );
  });

  test('Show progress works while the refresh runs, and Refresh now is blocked meanwhile', async ({
    page,
  }) => {
    const script = scriptedJob(frames);
    const engine = await openApp(page, script);
    await startFromCore(page);
    await navLink(page, en.nav.watchlists).click();
    await openCore(page);
    await expect(refreshNow(page)).toHaveAttribute('aria-disabled', 'true');
    await expect(refreshNow(page)).not.toHaveAttribute('disabled');
    await expect(page.getByText(en.refresh.running)).toBeVisible();
    await refreshNow(page).click({ force: true });
    await refreshNow(page).focus();
    await page.keyboard.press('Enter');
    expect(engine.actions('POST', '/v1/refreshes')).toHaveLength(1);
    await page.getByRole('link', { name: en.refresh.showProgress }).click();
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.running, { subject: 'Core' }),
    );
  });

  test('a refresh found at start-up is followed, and one that has ended is ignored', async ({
    page,
  }) => {
    const script = scriptedJob(frames);
    await openApp(
      page,
      script,
      undefined,
      ok(
        job({
          totals: totals(4, 2, 0),
          events: [started(1, 0, 'ACME', momentum)],
          next_after: 1,
        }),
      ),
    );
    await expect(marker(page)).toHaveText(running(0, 4));
    await marker(page).click();
    await expect(rows(page)).toHaveCount(1);
    await advance(page, script);
    expect(script.afters[0]).toBe(1);
  });

  test('a refresh that had already ended at start-up shows no marker', async ({
    page,
  }) => {
    await openApp(
      page,
      scriptedJob(frames),
      undefined,
      ok(
        job({
          state: 'completed',
          totals: totals(4, 4, 4),
          summary: summary({ completed: 4 }),
        }),
      ),
    );
    await expect(navLink(page, en.nav.watchlists)).toBeVisible();
    await expect(marker(page)).toHaveCount(0);
  });

  test('says a refresh the engine no longer keeps is not available and links to its comparison', async ({
    page,
  }) => {
    const script = scriptedJob(frames);
    await openApp(page, script, (url) =>
      /\/job$/.test(url.pathname) && script.afters.length >= 1
        ? notFound()
        : undefined,
    );
    await startFromCore(page);
    await advance(page, script);
    // The next poll is answered with "no such refresh job".
    const gone = page.getByText(en.refresh.gone);
    await expect
      .poll(async () => {
        if (!(await gone.isVisible())) await page.clock.runFor(1000);
        return gone.isVisible();
      })
      .toBe(true);
    await expect(
      page.getByRole('link', { name: en.refresh.openComparison }),
    ).toHaveAttribute('href', `/refreshes/${refreshId}`);
  });
});

test.describe('stopping', () => {
  const stopFrames: Frame[] = [
    frames[0]!,
    { state: 'stopping', totals: totals(4, 2, 0) },
    {
      state: 'stopped',
      totals: totals(4, 2, 2),
      events: [
        finished(3, 0, 'ACME', momentum, {
          outcome: 'completed',
          saved: true,
          analysis_run_id: savedRunId,
        }),
        finished(4, 1, 'ACME', grahamNumber, { outcome: 'failed' }),
      ],
      summary: summary({ completed: 1, failed: 1, error: 0 }),
    },
  ];

  test('Stop asks the engine, says it is stopping, and ends in the stopped state', async ({
    page,
  }) => {
    const script = scriptedJob(stopFrames, { stopFrame: 1 });
    const engine = await openApp(page, script);
    await startFromCore(page);
    await advance(page, script);
    await expect(rows(page)).toHaveCount(2);
    await stopButton(page).focus();
    await page.keyboard.press('Enter');
    await expect(heading(page)).toHaveText(en.refresh.heading.stopping);
    expect(
      engine.actions('POST', `/v1/refreshes/${refreshId}/job/stop`),
    ).toHaveLength(1);
    // The stop names the last sequence taken in, and the next poll the stop's.
    expect(script.afters).toEqual([0, 2]);
    await expect(stopButton(page)).toHaveAttribute('aria-disabled', 'true');
    await stopButton(page).click({ force: true });
    expect(
      engine.actions('POST', `/v1/refreshes/${refreshId}/job/stop`),
    ).toHaveLength(1);
    await advance(page, script);
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.stopped, { subject: 'Core' }),
    );
    await expect(
      page.getByText(counts(2, 4), { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText(plural(en.refresh.notStarted, 2)),
    ).toBeVisible();
    for (const pill of ['Completed 1', 'Failed 1'])
      await expect(page.getByText(pill, { exact: true })).toBeVisible();
    await expect(rows(page)).toHaveCount(2);
    await expect(
      page.getByRole('link', { name: en.refresh.openComparison }),
    ).toBeVisible();
  });

  test('a stop made by another client shows as stopping, even after leaving and returning', async ({
    page,
  }) => {
    const script = scriptedJob([
      frames[0]!,
      { state: 'stopping', totals: totals(4, 2, 0) },
      stopFrames[2]!,
    ]);
    await openApp(page, script);
    await startFromCore(page);
    await advance(page, script, 2);
    await expect(marker(page)).toHaveText(running(0, 4));
    await navLink(page, en.nav.runs).click();
    await marker(page).click();
    await expect(heading(page)).toHaveText(en.refresh.heading.stopping);
    await expect(stopButton(page)).toHaveAttribute('aria-disabled', 'true');
  });
});

test.describe('ended states', () => {
  test('a refresh that failed shows its failure, keeps its rows and offers no comparison', async ({
    page,
  }) => {
    const failed = failure(
      409,
      'watchlist_empty',
      'The watchlist has no entries.',
    );
    const script = scriptedJob([
      frames[0]!,
      {
        state: 'failed',
        totals: totals(4, 2, 0),
        failure: failed.body as never,
      },
    ]);
    await openApp(page, script);
    await startFromCore(page);
    await advance(page, script, 2);
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.failed, { subject: 'Core' }),
    );
    await expect(page.getByText('The watchlist has no entries.')).toBeVisible();
    await expect(rows(page)).toHaveCount(2);
    await expect(
      page.getByRole('link', { name: en.refresh.openComparison }),
    ).toHaveCount(0);
    await expect(marker(page)).toHaveCount(0);
  });

  test('an entry that stopped on an unexpected problem shows its reason code by name, and the summary adds a pill', async ({
    page,
  }) => {
    const script = scriptedJob([
      frames[0]!,
      {
        state: 'completed',
        totals: totals(4, 4, 4),
        events: [
          finished(3, 0, 'ACME', momentum, {
            outcome: null,
            reason_code: 'execution_error',
            error: 'Run ian refresh --debug to see the problem.',
          }),
          finished(4, 1, 'ACME', grahamNumber, { outcome: 'completed' }),
        ],
        summary: summary({ completed: 1, error: 1 }),
      },
    ]);
    await openApp(page, script);
    await startFromCore(page);
    await advance(page, script, 2);
    await expect(rows(page).nth(0)).toContainText('Execution error');
    await expect(page.getByText('--debug')).toHaveCount(0);
    await expect(
      page.getByText(`${en.refresh.unexpected} 1`, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Completed 1', { exact: true })).toBeVisible();
  });

  test('shows the provider check with the provider name and the verdict as its term', async ({
    page,
  }) => {
    const script = scriptedJob([
      frames[0]!,
      {
        state: 'completed',
        totals: totals(4, 4, 4),
        summary: summary(
          { completed: 3, failed: 1 },
          {
            provider_check: [{ provider_id: 'yahoo', verdict: 'unreachable' }],
          },
        ),
      },
    ]);
    await openApp(page, script, (url) =>
      url.pathname === '/v1/info'
        ? ok({ ...info, providers: [{ id: 'yahoo', name: 'Yahoo Finance' }] })
        : undefined,
    );
    await startFromCore(page);
    await advance(page, script, 2);
    await expect(page.getByText(en.refresh.providersHeading)).toBeVisible();
    const verdict = page.getByText('Unreachable', { exact: true });
    await expect(verdict).toHaveAttribute(
      'data-term-id',
      'verdict-unreachable',
    );
    await expect(page.getByText('Yahoo Finance')).toBeVisible();
  });

  test('a refresh of entries that belong to no watchlist says so', async ({
    page,
  }) => {
    const script = scriptedJob(
      [
        frames[0]!,
        {
          ...frames[3]!,
          summary: summary(
            { completed: 4 },
            { watchlist_id: null, watchlist_name: null },
          ),
        },
      ],
      { watchlistId: null },
    );
    await openApp(page, script, (url, { method }) =>
      method === 'POST' && url.pathname === '/v1/refreshes'
        ? {
            status: 202,
            body: job({ watchlist_id: null, totals: totals(4, 0, 0) }),
            language: 'en',
          }
        : undefined,
    );
    await startFromCore(page).catch(() => undefined);
    await expect(heading(page)).toContainText(en.refresh.subject.adHoc);
  });

  test('names a watchlist that was deleted during the refresh as "a watchlist"', async ({
    page,
  }) => {
    const script = scriptedJob(frames);
    let listed = true;
    await openApp(page, script, (url) =>
      url.pathname === '/v1/watchlists' && !listed
        ? ok({ schema_version: 1, items: [] })
        : undefined,
    );
    await openCore(page);
    listed = false;
    await refreshNow(page).click();
    await expect(heading(page)).toHaveText(
      fill(en.refresh.heading.running, {
        subject: en.refresh.subject.unknownWatchlist,
      }),
    );
  });
});

test.describe('elsewhere', () => {
  test('the Refreshes table and the comparison show a refresh that is still running', async ({
    page,
  }) => {
    const script = scriptedJob(frames);
    await openApp(page, script);
    await startFromCore(page);
    await navLink(page, en.nav.refreshes).click();
    const row = page.getByRole('row').filter({ hasText: 'Core (as it was)' });
    await expect(
      row.getByRole('link', { name: en.refresh.runningTag }),
    ).toHaveAttribute('href', `/refreshes/${refreshId}/progress`);
    await row.getByRole('link').first().click();
    await expect(page.getByText(en.refresh.stillRunning)).toBeVisible();
    const statusLink = page
      .getByRole('status')
      .getByRole('link', { name: en.refresh.showProgress });
    await expect(statusLink).toHaveAttribute(
      'href',
      `/refreshes/${refreshId}/progress`,
    );
    await statusLink.click();
    await advance(page, script, 4);
    await navLink(page, en.nav.refreshes).click();
    await expect(
      page.getByRole('link', { name: en.refresh.runningTag }),
    ).toHaveCount(0);
  });
});

test.describe('the SEC identity notice', () => {
  test('shows on the watchlist screen, empty or not, and on the comparison when none is set up', async ({
    page,
  }) => {
    await openApp(page, scriptedJob(frames));
    await navLink(page, en.nav.watchlists).click();
    await page.getByRole('link', { name: 'Empty' }).click();
    await expect(page.getByText(en.refresh.secIdentity)).toBeVisible();
    await navLink(page, en.nav.watchlists).click();
    await openCore(page);
    await expect(page.getByText(en.refresh.secIdentity)).toBeVisible();
    await navLink(page, en.nav.refreshes).click();
    await page
      .getByRole('row')
      .filter({ hasText: 'Core (as it was)' })
      .getByRole('link')
      .first()
      .click();
    await expect(page.getByText(en.refresh.secIdentity)).toBeVisible();
  });

  test('is absent when the engine has an SEC identity', async ({ page }) => {
    await openApp(page, scriptedJob(frames), (url) =>
      url.pathname === '/v1/info'
        ? ok({ ...info, sec_identity_configured: true })
        : undefined,
    );
    await openCore(page);
    await expect(refreshNow(page)).toBeVisible();
    await expect(page.getByText(en.refresh.secIdentity)).toHaveCount(0);
  });

  test('is absent on the comparison of entries that belong to no watchlist', async ({
    page,
  }) => {
    await openApp(page, scriptedJob(frames));
    await navLink(page, en.nav.refreshes).click();
    await page
      .getByRole('row')
      .filter({ hasText: en.refreshes.adHoc })
      .getByRole('link')
      .first()
      .click();
    await expect(heading(page)).toBeVisible();
    await expect(page.getByText(en.refresh.secIdentity)).toHaveCount(0);
  });
});

test.describe('both text directions', () => {
  test('the progress screen follows the pseudo-locale direction', async ({
    page,
  }) => {
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
    const script = scriptedJob(frames);
    await openApp(page, script);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.getByRole('link', { name: /Core/ }).click();
    await page.getByRole('button', { name: ar.refresh.now }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      fill(ar.refresh.heading.running, { subject: 'Core' }),
    );
    await advance(page, script);
    const stop = page.getByRole('button', { name: ar.actions.stop });
    const title = page.getByRole('heading', { level: 1 });
    const stopBox = await stop.boundingBox();
    const titleBox = await title.boundingBox();
    // The heading sits at the inline start (right); the button at the end.
    expect((titleBox?.x ?? 0) > (stopBox?.x ?? 0)).toBe(true);
    const table = page.getByRole('table');
    expect(
      await table.evaluate((element) => getComputedStyle(element).direction),
    ).toBe('rtl');
  });
});
