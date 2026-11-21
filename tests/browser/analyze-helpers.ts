// Shared by the Analyze a ticker spec (GUI.3d): opening the screen against the
// engine mock, which answers the start of a refresh of entries and plays a
// scripted job for it.
import type { Locator, Page } from '@playwright/test';
import { expect } from './fixtures.ts';
import {
  engineUrl,
  mockEngine,
  type Handler,
  type RecordedRequest,
} from './engine-mock.ts';
import {
  jobHandler,
  grahamNumber,
  momentum,
  openApp,
} from './refresh-helpers.ts';
import { analyzeRefreshId } from '../fixtures/api/compare.ts';
import {
  finished,
  job,
  scriptedJob,
  started,
  summary,
  totals,
  type Frame,
  type JobScript,
} from '../fixtures/api/refresh.ts';
import * as selection from '../fixtures/api/selection.ts';
import type { Reply } from '../fixtures/api/server.ts';
import en from '../../src/locales/en.json' with { type: 'json' };

// The catalog a test reads names from: English unless it runs in another
// locale.
export type Words = typeof en;

export const analyzedRun = '00000000-0000-4000-8000-000000000003';

// One ticker under two strategies, one frame for each poll.
export const frames: Frame[] = [
  {
    totals: totals(2, 2, 0),
    events: [
      started(1, 0, 'ACME', momentum),
      started(2, 1, 'ACME', grahamNumber),
    ],
  },
  {
    totals: totals(2, 2, 1),
    events: [
      finished(3, 0, 'ACME', momentum, {
        outcome: 'completed',
        saved: true,
        analysis_run_id: analyzedRun,
      }),
    ],
  },
  {
    state: 'completed',
    totals: totals(2, 2, 2),
    events: [finished(4, 1, 'ACME', grahamNumber)],
    summary: summary(
      { completed: 2 },
      {
        refresh_id: analyzeRefreshId,
        watchlist_id: null,
        watchlist_name: null,
      },
    ),
  },
];

export const analysisScript = (
  list: Frame[] = frames,
  stopFrame?: number,
): JobScript =>
  scriptedJob(list, {
    watchlistId: null,
    refreshId: analyzeRefreshId,
    ...(stopFrame === undefined ? {} : { stopFrame }),
  });

// What the engine answers a start with: a running refresh of two entries that
// belong to no watchlist.
export const started202 = (): Reply => ({
  status: 202,
  body: job({
    refresh_id: analyzeRefreshId,
    watchlist_id: null,
    totals: totals(2, 0, 0),
  }),
  language: 'en',
});

export type Options = {
  strategies?: Parameters<typeof selection.selectionHandler>[0];
  // Answers a request before the defaults do.
  extra?: Handler;
  // A refresh the engine reports as running when the application starts.
  discovered?: Reply;
  // Moves time only when the test says so; the default. A test that waits for
  // the form to focus a field on its own turns it off.
  clock?: boolean;
  // The catalog of the locale under test.
  words?: Words;
};

export async function openAnalyze(
  page: Page,
  script: JobScript = analysisScript(),
  options: Options = {},
) {
  const served = selection.selectionHandler(options.strategies);
  const handler: Handler = async (url, request) => {
    const extra = await options.extra?.(url, request);
    if (extra !== undefined) return extra;
    if (request.method === 'POST' && url.pathname === '/v1/refreshes')
      return started202();
    return request.method === 'GET' ? served(url) : undefined;
  };
  let engine;
  if (options.clock === false) {
    engine = await mockEngine(page, jobHandler(script, handler));
    await page.goto(engineUrl);
  } else {
    engine = await openApp(page, script, handler, options.discovered);
  }
  const words = options.words ?? en;
  await navLink(page, words.nav.analyze, words).click();
  await expect(heading(page)).toHaveText(words.analyze.heading);
  return engine;
}

export const heading = (page: Page) => page.getByRole('heading', { level: 1 });
export const navLink = (page: Page, name: string, words: Words = en) =>
  page
    .getByRole('navigation', { name: words.nav.label })
    .getByRole('link', { name, exact: true });
// By accessible name: the label's required mark is hidden from it.
export const ticker = (page: Page, words: Words = en) =>
  page.getByRole('textbox', { name: words.analyze.ticker, exact: true });
export const asOf = (page: Page) =>
  page.getByLabel(en.analyze.asOf, { exact: true });
export const analyze = (page: Page, words: Words = en) =>
  page.getByRole('button', { name: words.analyze.analyze, exact: true });
export const strategy = (page: Page, name: string) =>
  page.locator('.strategy').filter({ hasText: name }).first();
export const checkbox = (page: Page, name: string) =>
  page.getByRole('checkbox', { name, exact: true });
export const choose = (page: Page, name: string) =>
  checkbox(page, name).check();
export const field = (box: Locator, label: string) => box.getByLabel(label);

export const starts = (engine: Awaited<ReturnType<typeof mockEngine>>) =>
  engine.actions('POST', '/v1/refreshes');
export const bodies = (requests: RecordedRequest[]) =>
  requests.map((request) => request.body);

// The control is invalid and described by the message.
export async function describedBy(control: Locator, message: Locator) {
  const id = await message.getAttribute('id');
  expect(id).toBeTruthy();
  expect(await control.getAttribute('aria-describedby')).toContain(id ?? '');
  await expect(control).toHaveAttribute('aria-invalid', 'true');
}
