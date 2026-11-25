// Typed instrument profiles, shared by Vitest and Playwright. The types come
// from the vendored API description. The identifiers are filled in so that a
// test can check they are never shown (D290).
import type { components } from '../../../src/api/schema.ts';

type Schemas = components['schemas'];

export const profile = (
  ticker: string,
  name: string | null,
  venue: Schemas['ListingVenuePart'] | null,
  kind: Schemas['InstrumentKind'] | null,
  currency: string | null,
  refreshedAt = '2026-11-02T15:00:00+00:00',
): Schemas['InstrumentProfileDocument'] => ({
  schema_version: 2,
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

// The venues the fixtures use (D360): a wording that differs from the venue
// term's name, one equal to it, and one the engine maps to no code.
export const venues = {
  nasdaq: { code: 'nasdaq', provider_value: 'NMS' },
  nyse: { code: 'nyse', provider_value: 'New York Stock Exchange' },
  unmapped: { code: null, provider_value: 'PNK' },
  // A code the references do not map: the codes are an open vocabulary, so a
  // newer engine can serve one this application's types do not list.
  unlisted: {
    code: 'xetra' as Schemas['ListingVenue'],
    provider_value: 'XETRA',
  },
} satisfies Record<string, Schemas['ListingVenuePart']>;

// The stored profiles. ZED names a different company than the runs of the
// fixtures kept for it: its ticker was reused after they were saved (D289).
// OLD has no stored profile.
export const profiles: Record<string, Schemas['InstrumentProfileDocument']> = {
  ACME: profile('ACME', 'Acme Corp', venues.nasdaq, 'equity', 'USD'),
  MSFT: profile('MSFT', 'Microsoft Corp', venues.nasdaq, 'equity', 'USD'),
  ZED: profile('ZED', 'Zedco Group', venues.nyse, 'equity', 'USD'),
  DIVI: profile('DIVI', 'Dividend Fund', venues.unmapped, 'etf', 'USD'),
};

// What a lookup resolves for a ticker that has no stored profile.
export const lookedUp = (ticker: string) =>
  profile(
    ticker,
    'Bolt Industries',
    venues.unlisted,
    'equity',
    'CAD',
    '2026-11-20T15:00:00+00:00',
  );

// A profile identified by SEC EDGAR, which serves no listing venue (D306).
export const withoutVenue = (ticker: string, name: string) => ({
  ...profile(ticker, name, null, 'equity', 'USD'),
  provider_id: 'sec_edgar',
});
