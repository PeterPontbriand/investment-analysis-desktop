// Presents a stored selection value for reading (D233). Nothing is computed:
// each function shows the value it is given.
export function formatConjunction(locale: string, items: string[]): string {
  return new Intl.ListFormat(locale, {
    style: 'long',
    type: 'conjunction',
  }).format(items);
}

export function formatPlainNumber(locale: string, value: number): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 20 }).format(
    value,
  );
}

// A stored value as the options list shows it, by the kind of its field.
export type StoredValue =
  | { kind: 'notSet' }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'text'; text: string }
  | { kind: 'choice'; value: string };

export function readStoredValue(
  field: { kind: string },
  value: unknown,
  locale: string,
): StoredValue {
  if (value === null || value === undefined) return { kind: 'notSet' };
  if (field.kind === 'boolean' && typeof value === 'boolean')
    return { kind: 'boolean', value };
  if (field.kind === 'number' && typeof value === 'number')
    return { kind: 'text', text: formatPlainNumber(locale, value) };
  if (field.kind === 'choice' && typeof value === 'string')
    return { kind: 'choice', value };
  if (typeof value === 'string') return { kind: 'text', text: value };
  return { kind: 'text', text: JSON.stringify(value) };
}
