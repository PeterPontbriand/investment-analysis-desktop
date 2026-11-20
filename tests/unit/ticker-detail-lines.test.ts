import { describe, expect, it } from 'vitest';
import {
  isDescribed,
  previewParts,
  profileLines,
  runIdentityLines,
} from '../../src/composables/tickerDetailLines.ts';
import { identityOf } from '../fixtures/api/compare.ts';
import { profile } from '../fixtures/api/profiles.ts';

// D290: the fields shown, and the two never shown.
describe('ticker detail lines', () => {
  it("takes a current profile's name, venue, kind, currency and check", () => {
    const lines = profileLines(
      profile('ACME', 'Acme Corp', 'NASDAQ', 'equity', 'USD'),
    );
    expect(lines).toEqual({
      name: 'Acme Corp',
      venue: 'NASDAQ',
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
      ...identityOf('ACME', 'Acme Corp', 'NASDAQ'),
      issuer_identifier: 'ISSUER',
      instrument_identifier: 'INSTRUMENT',
    });
    expect(lines).toEqual({
      name: 'Acme Corp',
      venue: 'NASDAQ',
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
      previewParts(profileLines(profile('A', 'A', 'NASDAQ', 'etf', 'USD'))),
    ).toEqual([{ text: 'NASDAQ' }, { kind: 'etf' }, { text: 'USD' }]);
    expect(
      previewParts(profileLines(profile('A', 'A', null, 'etf', null))),
    ).toEqual([{ kind: 'etf' }]);
  });
});
