import {
  computed,
  ref,
  type ComputedRef,
  type Ref,
  type ShallowRef,
} from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '../api/client.ts';
import { useEngine } from '../api/engine.ts';
import type { components } from '../api/schema.ts';
import { progressLocation } from '../views/navigation.ts';
import { useAction } from './useAction.ts';

// What the line beside a start button shows (D251, D270): the failure, whether
// a refresh is running and the link to it.
export type RefreshNote = Pick<
  RefreshStart,
  'refused' | 'running' | 'runningId'
> & { failure: Readonly<Ref<unknown>> };

export type RefreshStart = {
  pending: Ref<boolean>;
  failure: ShallowRef<unknown>;
  // True when the start was refused because a refresh is already running.
  refused: Ref<boolean>;
  // A refresh is known to be running (D251).
  running: ComputedRef<boolean>;
  runningId: ComputedRef<string | null>;
  start(watchlistId: string): Promise<void>;
  // Forgets the last failure and refusal.
  clear(): void;
  // Starts a refresh of entries that belong to no watchlist, one for each
  // strategy chosen (D272). Resolves to the failure when the engine refuses it.
  startEntries(entries: RefreshEntries): Promise<unknown>;
};

export type RefreshEntries = components['schemas']['RefreshEntryRequest'][];

// Starting a refresh (D197, D251, D272): the request names only a watchlist or
// only entries; on success the progress screen of the returned refresh opens.
export function useRefreshStart(): RefreshStart {
  const engine = useEngine();
  const router = useRouter();
  const action = useAction();
  const refused = ref(false);

  // The engine's defaults apply to everything the body leaves out (D197).
  async function send(
    body: components['schemas']['RefreshRequest'],
    tickers?: string[],
  ): Promise<unknown> {
    if (action.pending.value || engine.follower.running.value) return null;
    refused.value = false;
    const result = await action.run((client) =>
      client.post('/v1/refreshes', { body }),
    );
    if (result === null) return null;
    if (!result.ok) {
      if (
        result.error instanceof ApiError &&
        result.error.reasonCode === 'refresh_job_running'
      ) {
        refused.value = true;
        // Find the refresh that is running, to link to its progress.
        await engine.follower.discover();
      }
      return result.error;
    }
    engine.follower.start(result.value.data, tickers);
    await router.push(progressLocation(result.value.data.refresh_id));
    return null;
  }

  async function start(watchlistId: string): Promise<void> {
    await send({ watchlist_id: watchlistId });
  }

  async function startEntries(entries: RefreshEntries): Promise<unknown> {
    return send(
      { entries },
      entries.map((entry) => entry.ticker),
    );
  }

  return {
    pending: action.pending,
    failure: action.failure,
    refused,
    running: computed(() => engine.follower.running.value),
    runningId: computed(() => engine.follower.runningId.value),
    start,
    startEntries,
    clear: () => {
      refused.value = false;
      action.clear();
    },
  };
}
