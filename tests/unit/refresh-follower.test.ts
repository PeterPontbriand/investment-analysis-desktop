import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../src/api/client.ts';
import { createFollower } from '../../src/api/refreshes.ts';
import {
  finished,
  job,
  notFound,
  refreshId,
  started,
  summary,
  totals,
  type JobDocument,
} from '../fixtures/api/refresh.ts';

type Call = { method: string; path: string; after: string | undefined };

// A client whose answers the test supplies, one call at a time. A function may
// return a promise, so a test can hold a request open.
function fakeClient(
  answers: (
    call: Call,
  ) => JobDocument | Promise<JobDocument> | 'not_found' | 'fail',
) {
  const calls: Call[] = [];
  let inFlight = 0;
  let mostInFlight = 0;
  async function send(
    method: string,
    path: string,
    options?: { query?: { after?: string } },
  ) {
    const call = { method, path, after: options?.query?.after };
    calls.push(call);
    inFlight += 1;
    mostInFlight = Math.max(mostInFlight, inFlight);
    try {
      const answer = await answers(call);
      if (answer === 'not_found')
        throw new ApiError('failure', {
          status: 404,
          reasonCode: 'refresh_job_not_found',
        });
      if (answer === 'fail') throw new ApiError('unreachable');
      return { data: answer, contentLanguage: 'en', status: 200 };
    } finally {
      inFlight -= 1;
    }
  }
  const client = {
    get: (path: string, options?: never) => send('get', path, options),
    post: (path: string, options?: never) => send('post', path, options),
  } as unknown as ApiClient;
  return {
    client: () => Promise.resolve(client),
    calls,
    mostInFlight: () => mostInFlight,
  };
}

const lookup = () => Promise.resolve<string | null>('Core');

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('refresh follower', () => {
  it('polls again at once when the engine has more, and after a second otherwise', async () => {
    const answers: JobDocument[] = [
      job({
        totals: totals(3, 2, 0),
        events: [started(1, 0, 'T0', 'm'), started(2, 1, 'T1', 'm')],
        next_after: 2,
        has_more: true,
      }),
      job({
        totals: totals(3, 2, 1),
        events: [finished(3, 0, 'T0', 'm')],
        next_after: 3,
        has_more: false,
      }),
      job({ totals: totals(3, 3, 1), next_after: 3 }),
    ];
    let served = 0;
    const fake = fakeClient(() => answers[served++]!);
    const follower = createFollower(fake.client, lookup);
    follower.start(job({ totals: totals(3, 0, 0) }));

    await vi.advanceTimersByTimeAsync(999);
    expect(fake.calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    // The first poll said "more", so the second went at once.
    expect(fake.calls.map((call) => call.after)).toEqual(['0', '2']);
    // The third waits a second.
    await vi.advanceTimersByTimeAsync(999);
    expect(fake.calls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fake.calls.map((call) => call.after)).toEqual(['0', '2', '3']);
    expect(follower.current.value?.rows).toHaveLength(2);
  });

  it('keeps the tickers of a refresh it started, and has none for one it did not (D274)', async () => {
    const fake = fakeClient(() =>
      job({
        watchlist_id: null,
        totals: totals(2, 1, 0),
        events: [started(1, 0, 'ACME', 'm')],
        next_after: 1,
      }),
    );
    const follower = createFollower(fake.client, lookup);
    follower.start(job({ watchlist_id: null, totals: totals(2, 0, 0) }), [
      'ACME',
    ]);
    expect(follower.current.value?.startedTickers).toEqual(['ACME']);
    await vi.advanceTimersByTimeAsync(1000);
    expect(follower.current.value?.rows).toHaveLength(1);
    expect(follower.current.value?.startedTickers).toEqual(['ACME']);
    // A refresh started without tickers, as one of a watchlist is, has none.
    follower.start(job({ totals: totals(2, 0, 0) }));
    expect(follower.current.value?.startedTickers).toBeNull();
  });

  it('has one request in flight and takes the stop answer as a poll', async () => {
    let release: (document: JobDocument) => void = () => {};
    const slow = new Promise<JobDocument>((resolve) => (release = resolve));
    const fake = fakeClient((call) => {
      if (call.method === 'post')
        return job({
          state: 'stopping',
          totals: totals(2, 1, 1),
          events: [finished(2, 0, 'T0', 'm')],
          next_after: 2,
        });
      return slow;
    });
    const follower = createFollower(fake.client, lookup);
    follower.start(job({ totals: totals(2, 0, 0) }));
    await vi.advanceTimersByTimeAsync(1000);
    // The poll is in flight; the stop waits for it.
    const stopping = follower.stop();
    await vi.advanceTimersByTimeAsync(0);
    expect(fake.calls.map((call) => call.method)).toEqual(['get']);
    release(
      job({
        totals: totals(2, 1, 0),
        events: [started(1, 0, 'T0', 'm')],
        next_after: 1,
      }),
    );
    await stopping;
    expect(fake.calls[1]).toMatchObject({
      method: 'post',
      path: '/v1/refreshes/{refresh_id}/job/stop',
      after: '1',
    });
    expect(fake.mostInFlight()).toBe(1);
    // Every event once: the started one, then the finished one, in one row.
    const held = follower.current.value!;
    expect(held.state).toBe('stopping');
    expect(held.after).toBe(2);
    expect(held.rows).toEqual([
      expect.objectContaining({ position: 0, finished: true }),
    ]);
    // The next poll names the stop answer's sequence.
    await vi.advanceTimersByTimeAsync(1000);
    expect(fake.calls.at(-1)).toMatchObject({ method: 'get', after: '2' });
  });

  it('shows an event once even when a poll repeats it', async () => {
    const event = started(1, 0, 'T0', 'm');
    const fake = fakeClient(() =>
      job({ totals: totals(1, 1, 0), events: [event], next_after: 1 }),
    );
    const follower = createFollower(fake.client, lookup);
    follower.start(job({ totals: totals(1, 0, 0) }));
    await vi.advanceTimersByTimeAsync(3000);
    expect(follower.current.value?.rows).toHaveLength(1);
  });

  it('shows the failure after three in a row, keeps trying and clears it on success', async () => {
    let attempt = 0;
    const fake = fakeClient(() => {
      attempt += 1;
      return attempt <= 3 ? 'fail' : job({ totals: totals(1, 1, 0) });
    });
    const follower = createFollower(fake.client, lookup);
    follower.start(job({ totals: totals(1, 0, 0) }));
    await vi.advanceTimersByTimeAsync(2000);
    expect(follower.error.value).toBeNull();
    await vi.advanceTimersByTimeAsync(1000);
    expect(follower.error.value).toBeInstanceOf(ApiError);
    await vi.advanceTimersByTimeAsync(1000);
    expect(attempt).toBe(4);
    expect(follower.error.value).toBeNull();
  });

  it('stops polling once the job has ended and its events are in', async () => {
    const fake = fakeClient(() =>
      job({
        state: 'completed',
        totals: totals(1, 1, 1),
        events: [finished(1, 0, 'T0', 'm')],
        next_after: 1,
        summary: summary({ completed: 1 }),
      }),
    );
    const follower = createFollower(fake.client, lookup);
    follower.start(job({ totals: totals(1, 0, 0) }));
    await vi.advanceTimersByTimeAsync(5000);
    expect(fake.calls).toHaveLength(1);
    expect(follower.running.value).toBe(false);
    expect(follower.current.value?.summary?.counts).toEqual({ completed: 1 });
  });

  // D294: the profile cache is cleared when a refresh is seen to end.
  describe('when a refresh ends', () => {
    const ending = job({
      state: 'completed',
      totals: totals(1, 1, 1),
      events: [finished(1, 0, 'T0', 'm')],
      next_after: 1,
      summary: summary({ completed: 1 }),
    });

    it('tells its caller once, when the job it follows ends', async () => {
      const fake = fakeClient(() => ending);
      const ended = vi.fn();
      const follower = createFollower(fake.client, lookup, ended);
      follower.start(job({ totals: totals(1, 0, 0) }));
      expect(ended).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(5000);
      expect(ended).toHaveBeenCalledTimes(1);
    });

    it('does not tell it for a refresh that was already over when first seen', async () => {
      const fake = fakeClient(() => ending);
      const ended = vi.fn();
      const follower = createFollower(fake.client, lookup, ended);
      follower.start(ending);
      await vi.advanceTimersByTimeAsync(5000);
      expect(ended).not.toHaveBeenCalled();
    });

    it('tells it when a stop request answers with the ended job', async () => {
      const fake = fakeClient((call) =>
        call.method === 'post' ? job({ ...ending, state: 'stopped' }) : job(),
      );
      const ended = vi.fn();
      const follower = createFollower(fake.client, lookup, ended);
      follower.start(job({ totals: totals(1, 0, 0) }));
      await follower.stop();
      expect(ended).toHaveBeenCalledTimes(1);
    });
  });

  it('treats a state it does not know as running', async () => {
    const fake = fakeClient(() => job());
    const follower = createFollower(fake.client, lookup);
    follower.start(job({ state: 'paused' }));
    expect(follower.running.value).toBe(true);
    expect(follower.runningId.value).toBe(refreshId);
  });

  it('keeps no analysis document from an event', async () => {
    const event = {
      ...finished(1, 0, 'T0', 'm'),
      analysis: { marker: 'KEEP-OUT' },
    } as unknown as JobDocument['events'][number];
    const fake = fakeClient(() =>
      job({ totals: totals(1, 1, 1), events: [event], next_after: 1 }),
    );
    const follower = createFollower(fake.client, lookup);
    follower.start(job({ totals: totals(1, 0, 0) }));
    await vi.advanceTimersByTimeAsync(1000);
    const held = follower.current.value!;
    expect(held.rows).toHaveLength(1);
    expect(JSON.stringify(held)).not.toContain('KEEP-OUT');
    expect(held.rows[0]).not.toHaveProperty('analysis');
  });

  describe('finding a refresh at start-up', () => {
    it('follows a running job from the events the engine already holds', async () => {
      const fake = fakeClient(() =>
        job({
          totals: totals(2, 1, 0),
          events: [started(1, 0, 'T0', 'm')],
          next_after: 1,
        }),
      );
      const follower = createFollower(fake.client, lookup);
      await follower.discover();
      expect(fake.calls[0]).toMatchObject({
        path: '/v1/refreshes/job',
        after: '0',
      });
      expect(follower.running.value).toBe(true);
      expect(follower.current.value?.rows).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1000);
      expect(fake.calls[1]).toMatchObject({
        path: '/v1/refreshes/{refresh_id}/job',
        after: '1',
      });
    });

    it('follows a stopping job', async () => {
      const fake = fakeClient(() => job({ state: 'stopping' }));
      const follower = createFollower(fake.client, lookup);
      await follower.discover();
      expect(follower.running.value).toBe(true);
    });

    it('holds nothing when there is no job', async () => {
      const fake = fakeClient(() => 'not_found');
      const follower = createFollower(fake.client, lookup);
      await follower.discover();
      expect(follower.current.value).toBeNull();
      await vi.advanceTimersByTimeAsync(5000);
      expect(fake.calls).toHaveLength(1);
    });

    it('ignores a job that has already ended', async () => {
      const fake = fakeClient(() =>
        job({
          state: 'completed',
          totals: totals(1, 1, 1),
          summary: summary({ completed: 1 }),
        }),
      );
      const follower = createFollower(fake.client, lookup);
      await follower.discover();
      expect(follower.current.value).toBeNull();
      expect(follower.running.value).toBe(false);
    });
  });

  describe('opening a refresh', () => {
    it('polls a refresh it holds nothing for from the first event', async () => {
      const fake = fakeClient(() =>
        job({
          state: 'completed',
          totals: totals(1, 1, 1),
          events: [started(1, 0, 'T0', 'm'), finished(2, 0, 'T0', 'm')],
          next_after: 2,
          summary: summary({ completed: 1 }),
        }),
      );
      const follower = createFollower(fake.client, lookup);
      follower.open(refreshId);
      expect(follower.viewOf(refreshId).kind).toBe('loading');
      await vi.advanceTimersByTimeAsync(0);
      expect(fake.calls[0]).toMatchObject({ after: '0' });
      const view = follower.viewOf(refreshId);
      expect(view.kind).toBe('job');
      expect(view.kind === 'job' && view.record.rows).toHaveLength(1);
    });

    it('does not ask again for the refresh it follows', async () => {
      const fake = fakeClient(() => job());
      const follower = createFollower(fake.client, lookup);
      follower.start(job());
      follower.open(refreshId);
      await vi.advanceTimersByTimeAsync(0);
      expect(fake.calls).toHaveLength(0);
    });

    it('says a refresh the engine no longer keeps is gone', async () => {
      const fake = fakeClient(() => 'not_found');
      const follower = createFollower(fake.client, lookup);
      follower.open(refreshId);
      await vi.advanceTimersByTimeAsync(0);
      expect(follower.viewOf(refreshId)).toEqual({ kind: 'gone' });
    });
  });

  it('looks the watchlist name up once', async () => {
    const lookupName = vi.fn(lookup);
    const fake = fakeClient(() => job());
    const follower = createFollower(fake.client, lookupName);
    follower.start(job());
    await vi.advanceTimersByTimeAsync(0);
    expect(lookupName).toHaveBeenCalledTimes(1);
    expect(follower.current.value?.lookedUpName).toBe('Core');
  });

  it('marks an ended refresh seen', async () => {
    const fake = fakeClient(() => job());
    const follower = createFollower(fake.client, lookup);
    follower.start(job({ state: 'completed', summary: summary({}) }));
    expect(follower.current.value?.seen).toBe(false);
    follower.markSeen(refreshId);
    expect(follower.current.value?.seen).toBe(true);
  });

  it('is written for a job named by its id', () => {
    expect(notFound().status).toBe(404);
  });
});
