// Typed instrument profiles, shared by Vitest and Playwright. The types come
// from the vendored API description. The identifiers are filled in so that a
// test can check they are never shown (D290).
import type { components } from '../../../src/api/schema.ts';

type Schemas = components['schemas'];

export const profile = (
  ticker: string,
  name: string | null,
  venue: string | null,
  kind: Schemas['InstrumentKind'] | null,
  currency: string | null,
  refreshedAt = '2026-11-02T15:00:00+00:00',
): Schemas['InstrumentProfileDocument'] => ({
  schema_version: 1,
  ticker,
  refreshed_at: refreshedAt,
  instrument_name: name,
  listing_venue: venue,
  issuer_identifier: `ISSUER-${ticker}`,
  instrument_identifier: `INSTRUMENT-${ticker}`,
  kind,
  quote_currency: currency,
  provider_id: 'yahoo',
});

// The stored profiles. ZED names a different company than the runs of the
// fixtures kept for it: its ticker was reused after they were saved (D289).
// OLD has no stored profile.
export const profiles: Record<string, Schemas['InstrumentProfileDocument']> = {
  ACME: profile('ACME', 'Acme Corp', 'NASDAQ', 'equity', 'USD'),
  MSFT: profile('MSFT', 'Microsoft Corp', 'NASDAQ', 'equity', 'USD'),
  ZED: profile('ZED', 'Zedco Group', 'NYSE', 'equity', 'USD'),
  DIVI: profile('DIVI', 'Dividend Fund', 'NYSE Arca', 'etf', 'USD'),
};

// What a lookup resolves for a ticker that has no stored profile.
export const lookedUp = (ticker: string) =>
  profile(
    ticker,
    'Bolt Industries',
    'TSX',
    'equity',
    'CAD',
    '2026-11-20T15:00:00+00:00',
  );
