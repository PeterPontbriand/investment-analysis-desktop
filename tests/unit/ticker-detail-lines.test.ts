import { describe, expect, it } from 'vitest';
import {
  isDescribed,
  previewParts,
  profileLines,
  runIdentityLines,
  venueText,
} from '../../src/composables/tickerDetailLines.ts';
import { identityOf } from '../fixtures/api/compare.ts';
import { profile, venues } from '../fixtures/api/profiles.ts';
import en from '../../src/locales/en.json' with { type: 'json' };

// D290: the fields shown, and the two never shown.
describe('ticker detail lines', () => {
  it("takes a current profile's name, venue, kind, currency and check", () => {
    const lines = profileLines(
      profile('ACME', 'Acme Corp', venues.nasdaq, 'equity', 'USD'),
    );
    expect(lines).toEqual({
      name: 'Acme Corp',
      venue: venues.nasdaq,
      kind: 'equity',
      currency: 'USD',
      stamp: {
        source: 'profile',
        at: '2026-11-02T15:00:00+00:00',
        providerId: 'yahoo',
      },
    });
    expect(JSON.stringify(lines)).not.toContain('ISSUER');
    expect(JSON.stringify(lines)).not.toContain('INSTRUMENT-');
  });

  it("takes a run identity's name, venue and when it was identified", () => {
    const lines = runIdentityLines({
      ...identityOf('ACME', 'Acme Corp', venues.nasdaq),
      issuer_identifier: 'ISSUER',
      instrument_identifier: 'INSTRUMENT',
    });
    expect(lines).toEqual({
      name: 'Acme Corp',
      venue: venues.nasdaq,
      kind: null,
      currency: null,
      stamp: {
        source: 'run',
        at: '2026-10-30T18:00:00+00:00',
        providerId: 'yahoo',
      },
    });
    expect(JSON.stringify(lines)).not.toContain('ISSUER');
  });

  it('leaves out a null field, and the stamp of a run that has none', () => {
    const lines = runIdentityLines(identityOf('ACME', null));
    expect(lines).toEqual({
      name: null,
      venue: null,
      kind: null,
      currency: null,
      stamp: null,
    });
    expect(isDescribed(lines)).toBe(false);
    expect(
      isDescribed(profileLines(profile('X', null, null, null, 'USD'))),
    ).toBe(true);
  });

  it('lists the venue, kind and currency of the preview in that order', () => {
    expect(
      previewParts(
        profileLines(profile('A', 'A', venues.nasdaq, 'etf', 'USD')),
      ),
    ).toEqual([{ venue: venues.nasdaq }, { kind: 'etf' }, { text: 'USD' }]);
    expect(
      previewParts(profileLines(profile('A', 'A', null, 'etf', null))),
    ).toEqual([{ kind: 'etf' }]);
  });
});

// D360: a venue reads as its term's name, with the provider's wording when the
// two differ, or as the wording alone when the engine names no term.
describe('venue text', () => {
  const template = en.tickerDetails.venueWithWording;
  const withWording = (name: string, wording: string) =>
    template.replace('{name}', name).replace('{wording}', wording);

  it("shows the term's name alone when the wording equals it", () => {
    expect(
      venueText(venues.nyse, venues.nyse.provider_value, withWording),
    ).toBe(venues.nyse.provider_value);
  });

  it("follows the term's name with the wording when the two differ", () => {
    expect(venueText(venues.nasdaq, 'Nasdaq Stock Market', withWording)).toBe(
      withWording('Nasdaq Stock Market', venues.nasdaq.provider_value),
    );
  });

  it('shows the wording alone for a null code', () => {
    expect(venueText(venues.unmapped, null, withWording)).toBe(
      venues.unmapped.provider_value,
    );
  });

  it('shows the wording alone for a code the engine names no term for', () => {
    expect(venueText(venues.unlisted, null, withWording)).toBe(
      venues.unlisted.provider_value,
    );
  });

  it('has no venue line and no preview part for a null venue', () => {
    const lines = profileLines(profile('A', 'A', null, 'etf', null));
    expect(lines.venue).toBeNull();
    expect(previewParts(lines)).toEqual([{ kind: 'etf' }]);
  });
});
