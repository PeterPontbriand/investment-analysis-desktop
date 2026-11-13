import { describe, expect, it } from 'vitest';
import {
  formatCellNumber,
  formatCompletion,
  formatDate,
  formatDateOrInstant,
  formatInstant,
  formatMultiple,
  formatPercent,
  formatPerShare,
  formatPoints,
} from '../../src/i18n/format.ts';
import en from '../../src/locales/en.json';

// Intl separates times and ranges with narrow spaces; compare with plain ones.
const plain = (text: string) =>
  text.replace(new RegExp('[\u00a0\u2009\u202f]', 'g'), ' ');
const suffix = (formatted: string) =>
  en.common.multiple.replace('{value}', formatted);

describe('time zone', () => {
  it('is pinned to America/Toronto', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(
      'America/Toronto',
    );
  });
});

describe('number units', () => {
  it('formats percent as the percentage itself with one decimal', () => {
    expect(formatPercent('en', 18.4)).toBe('18.4%');
    expect(formatPercent('en', 18)).toBe('18.0%');
  });

  it('formats points with one decimal', () => {
    expect(formatPoints('en', 100)).toBe('100.0');
  });

  it('formats a multiple with one decimal and the catalog suffix', () => {
    expect(formatMultiple('en', 12.34, suffix)).toBe('12.3×');
  });

  it('formats per_share with a currency as its code', () => {
    expect(plain(formatPerShare('en', 36.69, 'USD'))).toBe('USD 36.69');
  });

  it('formats per_share with no currency as two decimals', () => {
    expect(formatPerShare('en', 36.693, null)).toBe('36.69');
    expect(formatPerShare('en', 36.6, null)).toBe('36.60');
  });

  it('chooses the format by unit', () => {
    expect(formatCellNumber('en', 5, 'percent', null, suffix)).toBe('5.0%');
    expect(formatCellNumber('en', 5, 'points', null, suffix)).toBe('5.0');
    expect(formatCellNumber('en', 5, 'multiple', null, suffix)).toBe('5.0×');
    expect(formatCellNumber('en', 5, 'per_share', 'USD', suffix)).toContain(
      'USD',
    );
  });

  it('follows the locale', () => {
    expect(formatPoints('de', 1234.5)).toBe('1.234,5');
  });
});

describe('dates and instants', () => {
  it('shows an instant in the user time zone', () => {
    expect(plain(formatInstant('en', '2026-10-30T18:02:00+00:00'))).toBe(
      'Oct 30, 2026, 2:02 PM',
    );
  });

  it('shows a date-only value in UTC so the day never shifts', () => {
    expect(formatDate('en', '2024-06-30')).toBe('Jun 30, 2024');
    expect(formatDate('en', '2024-01-01')).toBe('Jan 1, 2024');
  });

  it('chooses between a date and an instant', () => {
    expect(formatDateOrInstant('en', '2025-06-30')).toBe('Jun 30, 2025');
    expect(plain(formatDateOrInstant('en', '2026-10-30T18:02:00+00:00'))).toBe(
      'Oct 30, 2026, 2:02 PM',
    );
  });
});

describe('completion time range', () => {
  it('shows the last time alone when they differ by under a minute', () => {
    expect(
      plain(
        formatCompletion(
          'en',
          '2026-10-30T18:00:00+00:00',
          '2026-10-30T18:00:59+00:00',
        ),
      ),
    ).toBe('Oct 30, 2026, 2:00 PM');
  });

  it('shows a range when they differ by a minute or more', () => {
    expect(
      plain(
        formatCompletion(
          'en',
          '2026-10-30T17:58:00+00:00',
          '2026-10-30T18:02:00+00:00',
        ),
      ).replace(/\s*[–-]\s*/, ' – '),
    ).toBe('Oct 30, 2026, 1:58 – 2:02 PM');
    expect(
      plain(
        formatCompletion(
          'en',
          '2026-10-30T18:00:00+00:00',
          '2026-10-30T18:01:00+00:00',
        ),
      ),
    ).toContain('2:00');
  });
});
