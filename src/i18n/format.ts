// A list in the separator style of the given locale (D28, D44).
export function formatList(locale: string, items: string[]): string {
  return new Intl.ListFormat(locale, { type: 'unit' }).format(items);
}
