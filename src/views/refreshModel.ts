import type { MessageKey } from '../i18n/index.ts';
import { isEnded, type RefreshRecord } from '../api/refreshes.ts';

// Who a refresh is of, for headings and announcements (D200, D250): the
// watchlist's name, "a watchlist" when it cannot be found, or "ad hoc entries".
export type Subject =
  { kind: 'name'; name: string } | { kind: 'unknown' } | { kind: 'adHoc' };

export function subjectOf(record: RefreshRecord): Subject {
  if (record.watchlistId === null) return { kind: 'adHoc' };
  // Once it has ended the summary names the watchlist; until then the lookup does.
  const name = record.summary?.watchlist_name ?? record.lookedUpName ?? null;
  return name === null ? { kind: 'unknown' } : { kind: 'name', name };
}

export function subjectKey(
  subject: Subject,
): Extract<MessageKey, `refresh.subject.${string}`> | null {
  if (subject.kind === 'unknown') return 'refresh.subject.unknownWatchlist';
  if (subject.kind === 'adHoc') return 'refresh.subject.adHoc';
  return null;
}

export type EndKey = 'finished' | 'stopped' | 'failed';

// The ended state as the heading and the announcement name it.
export function endOf(record: RefreshRecord): EndKey | null {
  if (!isEnded(record.state)) return null;
  return record.state === 'completed' ? 'finished' : (record.state as EndKey);
}

// The outcome counts to show as pills (D248): the outcomes with a nonzero
// count in the order the engine serves them, then the entries that stopped
// because of an unexpected problem. Any other key in the counts is left out.
export function pillsOf(
  counts: Record<string, number>,
  order: string[],
): { outcomes: { code: string; count: number }[]; unexpected: number } {
  return {
    outcomes: order
      .filter((code) => (counts[code] ?? 0) > 0)
      .map((code) => ({ code, count: counts[code] ?? 0 })),
    unexpected: counts.error ?? 0,
  };
}
