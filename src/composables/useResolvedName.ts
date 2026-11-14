import { ref, watch, type Ref, type WatchSource } from 'vue';
import type { ResolvedName } from '../api/terms.ts';
import { useMessages } from '../i18n/index.ts';

// A name resolved through the engine's help documents, resolved again when the
// locale or any of the sources change. It is null until the first answer.
export function useResolvedName(
  resolve: () => Promise<ResolvedName>,
  sources: WatchSource[],
): Ref<ResolvedName | null> {
  const { locale } = useMessages();
  const name = ref<ResolvedName | null>(null);
  let latest = 0;

  async function load(): Promise<void> {
    const current = ++latest;
    // A failed request is shown by the screen that preloaded the documents.
    const resolved = await resolve().catch(() => null);
    if (current === latest) name.value = resolved;
  }

  watch([locale, ...sources], load, { immediate: true });
  return name;
}
