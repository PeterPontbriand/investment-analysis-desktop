import { expect, type Page } from '@playwright/test';
import { engineUrl, mockEngine, type Handler } from './engine-mock.ts';
import { coreId } from '../fixtures/api/data.ts';
import {
  finished,
  job,
  notFound,
  savedRunId,
  started,
  summary,
  totals,
  type Frame,
  type JobScript,
} from '../fixtures/api/refresh.ts';
import type { Reply } from '../fixtures/api/server.ts';

export const momentum = 'sma_crossover';
export const grahamNumber = 'graham_number';
export const qualityScreen = 'quality_screen';
export const failedRunId = '00000000-0000-4000-8000-000000000004';

// Four entries of the Core watchlist, played one frame per poll.
export const frames: Frame[] = [
  {
    totals: totals(4, 2, 0),
    events: [
      started(1, 0, 'ACME', momentum),
      started(2, 1, 'ACME', grahamNumber),
    ],
  },
  {
    totals: totals(4, 3, 1),
    events: [
      finished(3, 0, 'ACME', momentum, {
        outcome: 'completed',
        saved: true,
        analysis_run_id: savedRunId,
      }),
      started(4, 2, 'ZED', qualityScreen),
    ],
  },
  {
    totals: totals(4, 4, 3),
    events: [
      finished(5, 1, 'ACME', grahamNumber, { outcome: 'unavailable' }),
      finished(6, 2, 'ZED', qualityScreen, {
        outcome: 'failed',
        reason_code: 'provider_error',
        saved: true,
        analysis_run_id: failedRunId,
      }),
      started(7, 3, 'BOLT', momentum),
    ],
  },
  {
    state: 'completed',
    totals: totals(4, 4, 4),
    events: [finished(8, 3, 'BOLT', momentum)],
    summary: summary({
      completed: 2,
      unavailable: 1,
      not_applicable: 0,
      failed: 1,
    }),
  },
];

// Answers a refresh start, the job's polls and its stop from a script; every
// other request falls to `extra` and then to the fixtures.
export function jobHandler(script: JobScript, extra?: Handler): Handler {
  return async (url, request) => {
    const first = await extra?.(url, request);
    if (first !== undefined) return first;
    if (request.method === 'POST' && url.pathname === '/v1/refreshes')
      return {
        status: 202,
        body: job({ totals: totals(4, 0, 0) }),
        language: 'en',
      } satisfies Reply;
    const match = /^\/v1\/refreshes\/[^/]+\/job(\/stop)?$/.exec(url.pathname);
    if (match) {
      const after = Number(url.searchParams.get('after') ?? 0);
      return match[1] ? script.stop(after) : script.poll(after);
    }
    return undefined;
  };
}

export { notFound };

export async function openApp(
  page: Page,
  script: JobScript,
  extra?: Handler,
  discovered?: Reply,
) {
  await page.clock.install();
  const engine = await mockEngine(
    page,
    discovered === undefined
      ? jobHandler(script, extra)
      : (url, request) =>
          url.pathname === '/v1/refreshes/job'
            ? discovered
            : jobHandler(script, extra)(url, request),
  );
  await page.goto(engineUrl);
  return engine;
}

// Moves the clock one second and waits for the engine to have answered one more
// poll or stop, so the next step sees what that answer showed.
export async function advance(page: Page, script: JobScript, polls = 1) {
  for (let i = 0; i < polls; i += 1) {
    const before = script.afters.length;
    await page.clock.runFor(1000);
    await expect.poll(() => script.afters.length).toBeGreaterThan(before);
  }
}

export async function openCore(page: Page) {
  await page.getByRole('link', { name: 'Core' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Core');
}

export { coreId };
