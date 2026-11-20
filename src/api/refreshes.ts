import {
  computed,
  ref,
  shallowRef,
  type ComputedRef,
  type Ref,
  type ShallowRef,
} from 'vue';
import { ApiError, type ApiClient } from './client.ts';
import type { components } from './schema.ts';

type Schemas = components['schemas'];

export type JobDocument = Schemas['RefreshJobDocument'];

export type JobState =
  'running' | 'stopping' | 'completed' | 'stopped' | 'failed';

const knownStates: JobState[] = [
  'running',
  'stopping',
  'completed',
  'stopped',
  'failed',
];

// Any state the description does not name is treated as running (D244).
export function normalizeState(state: string): JobState {
  return (knownStates as string[]).includes(state)
    ? (state as JobState)
    : 'running';
}

export const isEnded = (state: JobState): boolean =>
  state === 'completed' || state === 'stopped' || state === 'failed';

// One entry of the refresh, built from its events only (D246). The event's
// analysis document is never kept (D198).
export type RefreshRow = {
  position: number;
  ticker: string;
  methodId: string;
  finished: boolean;
  outcome: string | null;
  reasonCode: string | null;
  runId: string | null;
};

// What the follower holds of one refresh.
export type RefreshRecord = {
  refreshId: string;
  watchlistId: string | null;
  // The watchlist's name from the name lookup: null when it cannot be found,
  // undefined while the lookup is pending (D250).
  lookedUpName: string | null | undefined;
  state: JobState;
  totals: Schemas['RefreshTotalsDocument'];
  rows: RefreshRow[];
  summary: Schemas['RefreshSummaryDocument'] | null;
  failure: Schemas['FailureEnvelope'] | null;
  // The last event sequence taken in (D243).
  after: number;
  hasMore: boolean;
  // True once the progress screen has shown the ended refresh (D201).
  seen: boolean;
  // The tickers of the entries this application asked to refresh, as sent;
  // null for a refresh it did not start (D274).
  startedTickers: string[] | null;
};

export type RefreshView =
  | { kind: 'loading' }
  | { kind: 'gone' }
  | { kind: 'error'; error: unknown }
  | { kind: 'job'; record: RefreshRecord };

export type Follower = {
  // The refresh being followed, running or just ended; null when there is none.
  current: ShallowRef<RefreshRecord | null>;
  // Whether a refresh is known to be running (running or stopping).
  running: ComputedRef<boolean>;
  runningId: ComputedRef<string | null>;
  // The failure of the last requests once three in a row have failed (D198).
  error: ShallowRef<unknown>;
  stopPending: Ref<boolean>;
  stopError: ShallowRef<unknown>;
  // Asks the engine for its latest job once; a running one is followed (D245).
  discover(): Promise<void>;
  // Follows the job a start request answered with. `tickers` are those of the
  // entries the request named, when it named entries (D274).
  start(document: JobDocument, tickers?: string[]): void;
  // Makes the refresh available to a screen: followed when it is the one held,
  // otherwise fetched from the first event (D246).
  open(refreshId: string): void;
  viewOf(refreshId: string): RefreshView;
  stop(): Promise<void>;
  markSeen(refreshId: string): void;
};

const pollDelay = 1000;
const failuresShown = 3;

function isNotKept(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 404 &&
    error.reasonCode === 'refresh_job_not_found'
  );
}

function rowsAfter(
  previous: RefreshRow[],
  events: JobDocument['events'],
  after: number,
): RefreshRow[] {
  const byPosition = new Map(previous.map((row) => [row.position, row]));
  for (const event of events) {
    if (event.sequence <= after) continue;
    const row: RefreshRow = byPosition.get(event.position) ?? {
      position: event.position,
      ticker: event.ticker,
      methodId: event.method_id,
      finished: false,
      outcome: null,
      reasonCode: null,
      runId: null,
    };
    if (event.kind === 'finished') {
      byPosition.set(event.position, {
        ...row,
        finished: true,
        outcome: event.result?.outcome ?? null,
        reasonCode: event.result?.reason_code ?? null,
        runId: event.result?.analysis_run_id ?? null,
      });
    } else if (!row.finished) {
      byPosition.set(event.position, row);
    }
  }
  return [...byPosition.values()].sort((a, b) => a.position - b.position);
}

// A record after a job document: the events are taken in once, by sequence.
export function recordAfter(
  previous: RefreshRecord | null,
  document: JobDocument,
  startedTickers: string[] | null = null,
): RefreshRecord {
  const after = previous?.after ?? 0;
  return {
    refreshId: document.refresh_id,
    watchlistId: document.watchlist_id,
    lookedUpName: previous?.lookedUpName,
    state: normalizeState(document.state),
    totals: document.totals,
    rows: rowsAfter(previous?.rows ?? [], document.events, after),
    summary: document.summary,
    failure: document.failure,
    after: document.next_after,
    hasMore: document.has_more,
    seen: previous?.seen ?? false,
    startedTickers: previous?.startedTickers ?? startedTickers,
  };
}

// The one application-wide follower of a refresh job (D198, D243): one request
// in flight at a time, the next poll at once while the engine has more events
// and after a second otherwise. It is written for a job named by its id.
export function createFollower(
  client: () => Promise<ApiClient>,
  lookupName: (watchlistId: string) => Promise<string | null>,
  // Called once when the refresh being followed is seen to end.
  onRefreshEnded: () => void = () => {},
): Follower {
  const current = shallowRef<RefreshRecord | null>(null);
  const visited = shallowRef<{
    refreshId: string;
    view: RefreshView;
  } | null>(null);
  const error = shallowRef<unknown>(null);
  const stopPending = ref(false);
  const stopError = shallowRef<unknown>(null);
  let queue: Promise<unknown> = Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;
  // Changes when another job is followed, so a late answer is dropped.
  let generation = 0;

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function cancelTimer(): void {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  function setCurrent(record: RefreshRecord | null): void {
    const previous = current.value;
    current.value = record;
    if (
      previous !== null &&
      record !== null &&
      previous.refreshId === record.refreshId &&
      !isEnded(previous.state) &&
      isEnded(record.state)
    )
      onRefreshEnded();
  }

  function resolveName(record: RefreshRecord): void {
    const { refreshId, watchlistId } = record;
    if (watchlistId === null) return;
    void lookupName(watchlistId)
      .catch(() => null)
      .then((name) => {
        const held = current.value;
        if (held !== null && held.refreshId === refreshId)
          setCurrent({ ...held, lookedUpName: name });
      });
  }

  // Follows a job from the record its first document makes.
  function begin(document: JobDocument, tickers: string[] | null = null): void {
    cancelTimer();
    generation += 1;
    failures = 0;
    error.value = null;
    const record = recordAfter(null, document, tickers);
    setCurrent(record);
    resolveName(record);
    scheduleNext(record);
  }

  function scheduleNext(record: RefreshRecord): void {
    cancelTimer();
    const gen = generation;
    if (isEnded(record.state) && !record.hasMore) return;
    if (record.hasMore) {
      void enqueue(() => tick(gen));
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      void enqueue(() => tick(gen));
    }, pollDelay);
  }

  async function tick(gen: number): Promise<void> {
    const held = current.value;
    if (gen !== generation || held === null) return;
    try {
      const api = await client();
      const result = await api.get('/v1/refreshes/{refresh_id}/job', {
        path: { refresh_id: held.refreshId },
        query: { after: String(held.after) },
      });
      if (gen !== generation) return;
      failures = 0;
      error.value = null;
      const next = recordAfter(current.value, result.data);
      setCurrent(next);
      scheduleNext(next);
    } catch (problem) {
      if (gen !== generation) return;
      if (isNotKept(problem)) {
        // The engine no longer keeps the job it was following.
        visited.value = { refreshId: held.refreshId, view: { kind: 'gone' } };
        setCurrent(null);
        return;
      }
      failures += 1;
      if (failures >= failuresShown) error.value = problem;
      cancelTimer();
      timer = setTimeout(() => {
        timer = null;
        void enqueue(() => tick(gen));
      }, pollDelay);
    }
  }

  async function discover(): Promise<void> {
    await enqueue(async () => {
      try {
        const api = await client();
        const result = await api.get('/v1/refreshes/job', {
          query: { after: '0' },
        });
        const state = normalizeState(result.data.state);
        // A job that has already ended is ignored (D245).
        if (isEnded(state)) return;
        const held = current.value;
        if (
          held !== null &&
          held.refreshId === result.data.refresh_id &&
          !isEnded(held.state)
        )
          return;
        begin(result.data);
      } catch {
        // There is none, or the engine could not answer: nothing to follow.
      }
    });
  }

  function start(document: JobDocument, tickers?: string[]): void {
    visited.value = null;
    begin(document, tickers ?? null);
  }

  function open(refreshId: string): void {
    const held = current.value;
    if (held !== null && held.refreshId === refreshId) return;
    if (visited.value?.refreshId === refreshId) {
      const kind = visited.value.view.kind;
      if (kind === 'loading' || kind === 'gone') return;
    }
    visited.value = { refreshId, view: { kind: 'loading' } };
    void enqueue(async () => {
      try {
        const api = await client();
        const result = await api.get('/v1/refreshes/{refresh_id}/job', {
          path: { refresh_id: refreshId },
          query: { after: '0' },
        });
        if (visited.value?.refreshId !== refreshId) return;
        const document = result.data;
        const now = current.value;
        if (now === null || isEnded(now.state)) {
          visited.value = null;
          begin(document);
        } else {
          visited.value = {
            refreshId,
            view: { kind: 'job', record: recordAfter(null, document) },
          };
        }
      } catch (problem) {
        if (visited.value?.refreshId !== refreshId) return;
        visited.value = {
          refreshId,
          view: isNotKept(problem)
            ? { kind: 'gone' }
            : { kind: 'error', error: problem },
        };
      }
    });
  }

  function viewOf(refreshId: string): RefreshView {
    const held = current.value;
    if (held !== null && held.refreshId === refreshId)
      return { kind: 'job', record: held };
    if (visited.value?.refreshId === refreshId) return visited.value.view;
    return { kind: 'loading' };
  }

  async function stop(): Promise<void> {
    if (stopPending.value) return;
    stopPending.value = true;
    stopError.value = null;
    try {
      await enqueue(async () => {
        const held = current.value;
        if (held === null || isEnded(held.state)) return;
        const gen = generation;
        try {
          const api = await client();
          const result = await api.post('/v1/refreshes/{refresh_id}/job/stop', {
            path: { refresh_id: held.refreshId },
            query: { after: String(held.after) },
          });
          if (gen !== generation) return;
          const next = recordAfter(current.value, result.data);
          setCurrent(next);
          scheduleNext(next);
        } catch (problem) {
          stopError.value = problem;
        }
      });
    } finally {
      stopPending.value = false;
    }
  }

  function markSeen(refreshId: string): void {
    const held = current.value;
    if (held !== null && held.refreshId === refreshId && !held.seen)
      setCurrent({ ...held, seen: true });
  }

  return {
    current,
    running: computed(
      () => current.value !== null && !isEnded(current.value.state),
    ),
    runningId: computed(() =>
      current.value !== null && !isEnded(current.value.state)
        ? current.value.refreshId
        : null,
    ),
    error,
    stopPending,
    stopError,
    discover,
    start,
    open,
    viewOf,
    stop,
    markSeen,
  };
}

// The watchlist's name through the existing lookup of the watchlist list
// (D215): null when the list does not hold it.
export async function lookUpWatchlistName(
  client: () => Promise<ApiClient>,
  watchlistId: string,
): Promise<string | null> {
  const list = (await (await client()).get('/v1/watchlists')).data;
  return (
    list.items.find((item) => item.watchlist_id === watchlistId)
      ?.display_name ?? null
  );
}
