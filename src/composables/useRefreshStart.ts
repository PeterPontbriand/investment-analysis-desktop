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
import { progressLocation } from '../views/navigation.ts';
import { useAction } from './useAction.ts';

export type RefreshStart = {
  pending: Ref<boolean>;
  failure: ShallowRef<unknown>;
  // True when the start was refused because a refresh is already running.
  refused: Ref<boolean>;
  // A refresh is known to be running (D251).
  running: ComputedRef<boolean>;
  runningId: ComputedRef<string | null>;
  start(watchlistId: string): Promise<void>;
};

// Starting a refresh of a watchlist (D197, D251): the request names only the
// watchlist; on success the progress screen of the returned refresh opens.
export function useRefreshStart(): RefreshStart {
  const engine = useEngine();
  const router = useRouter();
  const action = useAction();
  const refused = ref(false);

  async function start(watchlistId: string): Promise<void> {
    if (action.pending.value || engine.follower.running.value) return;
    refused.value = false;
    const result = await action.run((client) =>
      client.post('/v1/refreshes', {
        // Only the watchlist: the engine's defaults apply to the rest (D197).
        body: { watchlist_id: watchlistId },
      }),
    );
    if (result === null) return;
    if (!result.ok) {
      if (
        result.error instanceof ApiError &&
        result.error.reasonCode === 'refresh_job_running'
      ) {
        refused.value = true;
        // Find the refresh that is running, to link to its progress.
        await engine.follower.discover();
      }
      return;
    }
    engine.follower.start(result.value.data);
    await router.push(progressLocation(result.value.data.refresh_id));
  }

  return {
    pending: action.pending,
    failure: action.failure,
    refused,
    running: computed(() => engine.follower.running.value),
    runningId: computed(() => engine.follower.runningId.value),
    start,
  };
}
