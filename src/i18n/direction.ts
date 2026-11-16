import { catalogs, type Direction } from './catalogs.ts';

// The text direction of engine text in a language: the direction of IAD's
// catalog for that language when there is one, otherwise the browser decides.
export function directionOf(lang: string | null): Direction | 'auto' {
  if (lang === null) return 'auto';
  const exact = Object.keys(catalogs).find(
    (tag) => tag.toLowerCase() === lang.toLowerCase(),
  );
  const base = lang.split('-')[0]?.toLowerCase();
  const tag =
    exact ??
    Object.keys(catalogs).find((entry) => entry.toLowerCase() === base);
  return tag === undefined
    ? 'auto'
    : (catalogs[tag]?.meta.direction as Direction);
}
