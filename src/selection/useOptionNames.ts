import { ref, watch, type Ref } from 'vue';
import { useEngine } from '../api/engine.ts';
import type { ResolvedName } from '../api/terms.ts';
import { useMessages } from '../i18n/index.ts';

// The names of a closed set's values, through the help references (D191):
// each value as its term's name with the term id kept, or as served when the
// engine lists no term for it. Empty until the names arrive.
export function useOptionNames(
  codeSet: () => string | null,
  values: () => string[],
): Ref<Record<string, ResolvedName>> {
  const engine = useEngine();
  const { locale } = useMessages();
  const names = ref<Record<string, ResolvedName>>({});
  let latest = 0;

  async function load(): Promise<void> {
    const current = ++latest;
    const set = codeSet();
    const entries = await Promise.all(
      values().map(
        async (value) =>
          [
            value,
            set === null
              ? { text: value, termId: null, lang: null }
              : await engine.terms.term(set, value),
          ] as const,
      ),
    ).catch(() => null);
    if (current === latest && entries !== null)
      names.value = Object.fromEntries(entries);
  }

  watch([locale, codeSet, values], load, { immediate: true });
  return names;
}
