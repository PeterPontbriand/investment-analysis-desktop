import { ref, watch, type Ref, type WatchSource } from 'vue';
import type { TermEntry } from '../api/terms.ts';
import { useMessages } from '../i18n/index.ts';

// A term's entry from the help index, resolved again when the locale or a
// source changes. It is null until the index answers, and for a term the index
// does not list or a failed request (the screen that preloaded the help index
// shows that failure).
export function useResolvedEntry(
  resolve: () => Promise<TermEntry | null>,
  sources: WatchSource[],
): Ref<TermEntry | null> {
  const { locale } = useMessages();
  const entry = ref<TermEntry | null>(null);
  let latest = 0;

  async function load(): Promise<void> {
    const current = ++latest;
    const resolved = await resolve().catch(() => null);
    if (current === latest) entry.value = resolved;
  }

  watch([locale, ...sources], load, { immediate: true });
  return entry;
}
