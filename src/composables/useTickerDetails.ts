import { shallowRef, watch, type ShallowRef } from 'vue';
import { useEngine } from '../api/engine.ts';
import type { IdentitySource } from '../api/identitySource.ts';
import {
  profileLines,
  runIdentityLines,
  type DetailLines,
} from './tickerDetailLines.ts';
import type { InstrumentProfile } from '../api/tickerIdentities.ts';

// What the engine holds for a ticker, from the source D289 names.
export type TickerDetails =
  | { kind: 'loading' }
  // No profile is stored for the ticker (D291).
  | { kind: 'none' }
  | { kind: 'error'; error: unknown }
  | { kind: 'described'; lines: DetailLines; current: boolean };

// Loads a source's details through the caches (D294) and loads them again when
// the source changes. Nothing here asks a provider; that is a lookup, which
// only the user starts.
export function useTickerDetails(source: () => IdentitySource): {
  details: ShallowRef<TickerDetails>;
  reload: () => Promise<void>;
  // Shows a profile a lookup answered with.
  showProfile: (profile: InstrumentProfile) => void;
} {
  const engine = useEngine();
  const details = shallowRef<TickerDetails>({ kind: 'loading' });
  let latest = 0;

  async function reload(): Promise<void> {
    const current = ++latest;
    const wanted = source();
    details.value = { kind: 'loading' };
    // The provider names come from the engine information; its failure only
    // leaves the identifier in their place.
    void engine.info.load().catch(() => {});
    try {
      const next: TickerDetails =
        wanted.kind === 'runIdentity'
          ? {
              kind: 'described',
              lines: runIdentityLines(
                await engine.identities.runIdentity(wanted.runId),
              ),
              current: false,
            }
          : await currentDetails(wanted.ticker);
      if (current === latest) details.value = next;
    } catch (error) {
      if (current === latest) details.value = { kind: 'error', error };
    }
  }

  async function currentDetails(ticker: string): Promise<TickerDetails> {
    const held = await engine.identities.currentProfile(ticker);
    return held.kind === 'none'
      ? { kind: 'none' }
      : { kind: 'described', lines: profileLines(held.profile), current: true };
  }

  function showProfile(profile: InstrumentProfile): void {
    latest += 1;
    details.value = {
      kind: 'described',
      lines: profileLines(profile),
      current: true,
    };
  }

  watch(
    () => {
      const wanted = source();
      return `${wanted.kind}|${wanted.ticker}|${wanted.kind === 'runIdentity' ? wanted.runId : ''}`;
    },
    reload,
    { immediate: true },
  );
  return { details, reload, showProfile };
}
