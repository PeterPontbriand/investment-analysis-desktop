import type { Page } from '@playwright/test';

// Expected dates and times come from the browser under test, never from
// literal text. Browsers' locale data differs: macOS WebKit joins a medium
// date and a short time with " at " ("Nov 2, 2026 at 9:41 AM") where Chromium
// uses a comma ("Nov 2, 2026, 9:41 AM"). The application formats through Intl
// as D85 decides, so each helper evaluates the same Intl.DateTimeFormat call
// inside the page: the same locale and options the application uses for that
// kind of value, in the time zone the test pins. A test still checks what
// matters, because the raw value it passes is the one under test.

// No-break, thin and narrow no-break spaces.
const narrowSpaces = [160, 8201, 8239]
  .map((code) => String.fromCharCode(code))
  .join('');

// Intl separates times and ranges with narrow spaces; compare with plain ones.
export const plain = (text: string): string =>
  text.replace(new RegExp(`[${narrowSpaces}]`, 'g'), ' ').trim();

// An instant: a medium date with a short time, in the pinned time zone.
export async function instantText(
  page: Page,
  instant: string,
): Promise<string> {
  return plain(
    await page.evaluate(
      (value) =>
        new Intl.DateTimeFormat('en', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(value)),
      instant,
    ),
  );
}

// A date with no time of day: a medium date in UTC, so the day never shifts.
export async function dateText(page: Page, date: string): Promise<string> {
  return plain(
    await page.evaluate(
      (value) =>
        new Intl.DateTimeFormat('en', {
          dateStyle: 'medium',
          timeZone: 'UTC',
        }).format(new Date(`${value}T00:00:00Z`)),
      date,
    ),
  );
}

// First and last completion times a minute or more apart: a range.
export async function rangeText(
  page: Page,
  first: string,
  last: string,
): Promise<string> {
  return plain(
    await page.evaluate(
      ([start, end]) =>
        new Intl.DateTimeFormat('en', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).formatRange(new Date(start!), new Date(end!)),
      [first, last],
    ),
  );
}
