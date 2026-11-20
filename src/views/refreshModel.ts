import type { MessageKey } from '../i18n/index.ts';
import { isEnded, type RefreshRecord } from '../api/refreshes.ts';

// Who a refresh is of, for headings and announcements (D200, D250, D274): the
// watchlist's name, "a watchlist" when it cannot be found, the one ticker that
// all the entries of an ad hoc refresh share, or "ad hoc entries".
export type Subject =
  | { kind: 'name'; name: string }
  | { kind: 'unknown' }
  | { kind: 'ticker'; ticker: string }
  | { kind: 'adHoc' };

// The ticker all of these share, or null when there are none or they differ.
export function sharedTicker(tickers: string[]): string | null {
  const first = tickers[0];
  return first !== undefined && tickers.every((ticker) => ticker === first)
    ? first
    : null;
}

// The one ticker of an ad hoc refresh (D274). When the application started it,
// the ticker it sent, spelled as the engine's rows spell it once there is one;
// otherwise the ticker of the rows, once every entry has a row.
function adHocTicker(record: RefreshRecord): string | null {
  const rows = record.rows.map((row) => row.ticker);
  const sent = record.startedTickers;
  if (sent !== null) {
    const ticker = sharedTicker(sent);
    if (ticker === null) return null;
    const served = rows.find(
      (row) => row.toLowerCase() === ticker.toLowerCase(),
    );
    return served ?? ticker;
  }
  if (record.totals.total === 0 || rows.length < record.totals.total)
    return null;
  return sharedTicker(rows);
}

export function subjectOf(record: RefreshRecord): Subject {
  if (record.watchlistId === null) {
    const ticker = adHocTicker(record);
    return ticker === null ? { kind: 'adHoc' } : { kind: 'ticker', ticker };
  }
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

// The subject as a heading or an announcement words it.
export function subjectText(
  subject: Subject,
  t: (key: Extract<MessageKey, `refresh.subject.${string}`>) => string,
): string {
  const key = subjectKey(subject);
  if (key !== null) return t(key);
  return subject.kind === 'name'
    ? subject.name
    : subject.kind === 'ticker'
      ? subject.ticker
      : '';
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
