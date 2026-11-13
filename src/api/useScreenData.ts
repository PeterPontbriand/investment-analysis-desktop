import {
  ref,
  shallowRef,
  watch,
  type Ref,
  type ShallowRef,
  type WatchSource,
} from 'vue';
import { useMessages, type MessageKey } from '../i18n/index.ts';
import type { ApiClient } from './client.ts';
import { useEngine } from './engine.ts';

export type ScreenState<T> =
  // The connection to the engine is pending.
  | { kind: 'connecting' }
  // The engine is not usable: its state's message.
  | { kind: 'engine'; key: MessageKey }
  | { kind: 'loading' }
  | { kind: 'error'; error: unknown }
  | { kind: 'ready'; data: T };

// Loads a screen's data through the shared client, and loads it again when the
// locale or any of the extra sources change.
export function useScreenData<T>(
  load: (client: ApiClient) => Promise<T>,
  sources: WatchSource[] = [],
): { state: ShallowRef<ScreenState<T>>; reload: () => Promise<void> } {
  const engine = useEngine();
  const { locale } = useMessages();
  const state = shallowRef<ScreenState<T>>({ kind: 'connecting' });
  let latest = 0;

  async function reload(): Promise<void> {
    const current = ++latest;
    const engineState = engine.state.value;
    if (engineState.kind === 'pending') {
      state.value = { kind: 'connecting' };
      return;
    }
    if (engineState.kind === 'not_ready') {
      state.value = { kind: 'engine', key: engineState.key };
      return;
    }
    state.value = { kind: 'loading' };
    try {
      const data = await load(await engine.client());
      if (current === latest) state.value = { kind: 'ready', data };
    } catch (error) {
      if (current === latest) state.value = { kind: 'error', error };
    }
  }

  watch([engine.state, locale, ...sources], reload, { immediate: true });
  return { state, reload };
}

export type Page<Item> = { items: Item[]; has_more: boolean };

export type PagedList<Item> = {
  state: ShallowRef<ScreenState<{ items: Item[]; hasMore: boolean }>>;
  reload: () => Promise<void>;
  showMore: () => Promise<void>;
  // True while a following page loads; the failure of one, kept for the screen.
  loadingMore: Ref<boolean>;
  moreError: Ref<unknown>;
};

export const pageSize = 50;

// A list read a page at a time: "Show more" appends the next page. A reload,
// from a locale or filter change, starts again at the first page.
export function usePagedList<Item>(
  fetchPage: (client: ApiClient, offset: number) => Promise<Page<Item>>,
  sources: WatchSource[] = [],
): PagedList<Item> {
  const engine = useEngine();
  const loadingMore = ref(false);
  const moreError = ref<unknown>(null);
  const { state, reload } = useScreenData(async (client) => {
    moreError.value = null;
    const page = await fetchPage(client, 0);
    return { items: page.items, hasMore: page.has_more };
  }, sources);

  async function showMore(): Promise<void> {
    const current = state.value;
    if (current.kind !== 'ready' || loadingMore.value) return;
    loadingMore.value = true;
    moreError.value = null;
    try {
      const page = await fetchPage(
        await engine.client(),
        current.data.items.length,
      );
      // Ignore a page that arrives after a reload replaced the list.
      if (state.value === current)
        state.value = {
          kind: 'ready',
          data: {
            items: [...current.data.items, ...page.items],
            hasMore: page.has_more,
          },
        };
    } catch (error) {
      moreError.value = error;
    } finally {
      loadingMore.value = false;
    }
  }

  return { state, reload, showMore, loadingMore, moreError };
}
