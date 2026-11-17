import { ref, shallowRef, type Ref, type ShallowRef } from 'vue';
import type { ApiClient } from '../api/client.ts';
import { useEngine } from '../api/engine.ts';

export type ActionResult<T> =
  { ok: true; value: T } | { ok: false; error: unknown };

export type Action = {
  // True while a request is in flight.
  pending: Ref<boolean>;
  // The failure of the last request, shown where the action was started.
  failure: ShallowRef<unknown>;
  // Sends one request through the shared client. A second call while one is
  // pending sends nothing and returns null.
  run<T>(
    send: (client: ApiClient) => Promise<T>,
  ): Promise<ActionResult<T> | null>;
  clear(): void;
};

// The state every action shares: pending while the request is sent, and the
// failure it ended in. The screen decides what to show from the answer; the
// application never edits its own copy of a document (D183, D214).
export function useAction(): Action {
  const engine = useEngine();
  const pending = ref(false);
  const failure = shallowRef<unknown>(null);

  async function run<T>(
    send: (client: ApiClient) => Promise<T>,
  ): Promise<ActionResult<T> | null> {
    if (pending.value) return null;
    pending.value = true;
    failure.value = null;
    try {
      const value = await send(await engine.client());
      return { ok: true, value };
    } catch (error) {
      failure.value = error;
      return { ok: false, error };
    } finally {
      pending.value = false;
    }
  }

  return {
    pending,
    failure,
    run,
    clear: () => {
      failure.value = null;
    },
  };
}
