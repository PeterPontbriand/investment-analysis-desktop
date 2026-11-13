// Pure formatting of raw API values by the active locale. Nothing here
// computes a financial value: each function only presents the value it is
// given, in the unit the API document names for it.
import type { components } from '../api/schema.ts';

// A list in the separator style of the given locale (D28, D44).
export function formatList(locale: string, items: string[]): string {
  return new Intl.ListFormat(locale, { type: 'unit' }).format(items);
}

export type CellUnit = components['schemas']['CellUnit'];

function fixed(locale: string, value: number, digits: number): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

// A whole count, such as an entry count.
export function formatCount(locale: string, value: number): string {
  return new Intl.NumberFormat(locale).format(value);
}

// A percent value is the percentage itself: 18.4 is 18.4%.
export function formatPercent(locale: string, value: number): string {
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPoints(locale: string, value: number): string {
  return fixed(locale, value, 1);
}

// The number of a multiple; the catalog supplies the suffix.
export function formatMultiple(
  locale: string,
  value: number,
  withSuffix: (formatted: string) => string,
): string {
  return withSuffix(fixed(locale, value, 1));
}

// A per-share value: with its currency as an ISO 4217 code, otherwise a plain
// number with two decimal places.
export function formatPerShare(
  locale: string,
  value: number,
  currency: string | null,
): string {
  if (currency === null) return fixed(locale, value, 2);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
  }).format(value);
}

// A number cell by its unit and currency.
export function formatCellNumber(
  locale: string,
  value: number,
  unit: CellUnit,
  currency: string | null,
  withMultipleSuffix: (formatted: string) => string,
): string {
  switch (unit) {
    case 'percent':
      return formatPercent(locale, value);
    case 'points':
      return formatPoints(locale, value);
    case 'multiple':
      return formatMultiple(locale, value, withMultipleSuffix);
    case 'per_share':
      return formatPerShare(locale, value, currency);
  }
}

const instantFormat: Intl.DateTimeFormatOptions = {
  dateStyle: 'medium',
  timeStyle: 'short',
};

// An instant, in the user's time zone: a medium date with a short time.
export function formatInstant(locale: string, instant: string): string {
  return new Intl.DateTimeFormat(locale, instantFormat).format(
    new Date(instant),
  );
}

// A date with no time of day (a period end, an as-of date), formatted in UTC so
// the day never shifts with the user's time zone.
export function formatDate(locale: string, date: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

// A value that is a date or an instant, such as an entry's as-of. Null is the
// caller's catalog text.
export function formatDateOrInstant(locale: string, value: string): string {
  return dateOnly.test(value)
    ? formatDate(locale, value)
    : formatInstant(locale, value);
}

// First and last completion times: the last alone, unless they differ by a
// minute or more, when they are shown as a range.
export function formatCompletion(
  locale: string,
  first: string,
  last: string,
): string {
  const start = new Date(first);
  const end = new Date(last);
  if (Math.abs(end.getTime() - start.getTime()) < 60_000)
    return formatInstant(locale, last);
  return new Intl.DateTimeFormat(locale, instantFormat).formatRange(start, end);
}
