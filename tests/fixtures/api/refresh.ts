// Typed refresh job documents and a scripted job, shared by Vitest and
// Playwright. The types come from the vendored API description.
import type { components } from '../../../src/api/schema.ts';
import { coreId } from './data.ts';
import { failure, ok, type Reply } from './server.ts';

type Schemas = components['schemas'];

export type JobDocument = Schemas['RefreshJobDocument'];
type Event = Schemas['RefreshEventDocument'];
type Result = Schemas['RefreshResultDocument'];

export const refreshId = '99999999-9999-4999-8999-999999999999';
export const savedRunId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

export const totals = (
  total: number,
  admitted: number,
  finished: number,
): Schemas['RefreshTotalsDocument'] => ({
  total,
  admitted,
  finished,
  remaining: total - admitted,
});

export const started = (
  sequence: number,
  position: number,
  ticker: string,
  methodId: string,
): Event => ({
  sequence,
  kind: 'started',
  position,
  ticker,
  method_id: methodId,
  result: null,
  analysis: null,
});

export const result = (
  ticker: string,
  methodId: string,
  fields: Partial<Result> = {},
): Result => ({
  ticker,
  method_id: methodId,
  analysis_run_id: null,
  saved: false,
  outcome: 'completed',
  error: null,
  reason_code: null,
  ...fields,
});

export const finished = (
  sequence: number,
  position: number,
  ticker: string,
  methodId: string,
  fields: Partial<Result> = {},
): Event => ({
  sequence,
  kind: 'finished',
  position,
  ticker,
  method_id: methodId,
  result: result(ticker, methodId, fields),
  analysis: null,
});

export const summary = (
  counts: Record<string, number>,
  fields: Partial<Schemas['RefreshSummaryDocument']> = {},
): Schemas['RefreshSummaryDocument'] => ({
  schema_version: 4,
  refresh_id: refreshId,
  watchlist_id: coreId,
  watchlist_name: 'Core',
  results: [],
  counts,
  provider_check: null,
  ...fields,
});

export const job = (fields: Partial<JobDocument> = {}): JobDocument => ({
  schema_version: 3,
  refresh_id: refreshId,
  watchlist_id: coreId,
  state: 'running',
  totals: totals(4, 0, 0),
  events: [],
  next_after: 0,
  has_more: false,
  summary: null,
  failure: null,
  ...fields,
});

export const notFound = (): Reply =>
  failure(404, 'refresh_job_not_found', 'No such refresh job.');

// One step of a scripted job: the state and totals the engine reports at that
// poll, and the events that become available at it.
export type Frame = {
  state?: string;
  totals: Schemas['RefreshTotalsDocument'];
  events?: Event[];
  summary?: Schemas['RefreshSummaryDocument'];
  failure?: Schemas['FailureEnvelope'];
  // Whether the engine says more events remain after the ones it returns.
  hasMore?: boolean;
};

export type JobScript = {
  // The answer to a poll after the given sequence; the script moves on.
  poll(after: number): Reply;
  // The answer to a stop request: the script moves to its stopping frame.
  stop(after: number): Reply;
  // How many polls and stop requests were answered, and the `after` of each.
  afters: number[];
  // The frame the next poll answers with.
  index(): number;
};

// A job that plays its frames, one per poll, and then stays on the last. Each
// answer holds the events after the sequence the client named, as the engine's.
export function scriptedJob(
  frames: Frame[],
  options: { stopFrame?: number; watchlistId?: string | null } = {},
): JobScript {
  let next = 0;
  const afters: number[] = [];
  const all: Event[] = [];
  const available: number[] = [];
  for (const frame of frames) {
    all.push(...(frame.events ?? []));
    available.push(all.length);
  }
  function answer(after: number, index: number): Reply {
    const frame = frames[Math.min(index, frames.length - 1)]!;
    const shown = Math.min(index, frames.length - 1);
    const events = all
      .slice(0, available[shown])
      .filter((event) => event.sequence > after);
    return ok(
      job({
        watchlist_id:
          options.watchlistId === undefined ? coreId : options.watchlistId,
        state: frame.state ?? 'running',
        totals: frame.totals,
        events,
        next_after: events.at(-1)?.sequence ?? after,
        has_more: frame.hasMore ?? false,
        summary: frame.summary ?? null,
        failure: frame.failure ?? null,
      }),
    );
  }
  return {
    afters,
    index: () => next,
    poll(after) {
      afters.push(after);
      const reply = answer(after, next);
      next += 1;
      return reply;
    },
    stop(after) {
      afters.push(after);
      next = options.stopFrame ?? next;
      const reply = answer(after, next);
      next += 1;
      return reply;
    },
  };
}
