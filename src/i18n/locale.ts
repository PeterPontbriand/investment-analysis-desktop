import { catalogs } from './catalogs.ts';
import { getPlatform } from '../platform/index.ts';
import type { AppI18n } from './index.ts';

export const fallbackLocale = 'en';

export function chooseStartingLocale(
  languages: readonly string[],
  available: readonly string[] = Object.keys(catalogs),
): string {
  for (const language of languages) {
    const exact = available.find(
      (tag) => tag.toLowerCase() === language.toLowerCase(),
    );
    if (exact) return exact;
    const subtag = language.split('-')[0]?.toLowerCase();
    const base = available.find((tag) => tag.toLowerCase() === subtag);
    if (base) return base;
  }
  return fallbackLocale;
}

export function applyLocale(i18n: AppI18n, tag: string): void {
  const catalog = catalogs[tag] ?? catalogs[fallbackLocale];
  i18n.global.locale.value = catalogs[tag] ? tag : fallbackLocale;
  document.documentElement.lang = i18n.global.locale.value;
  document.documentElement.dir = catalog.meta.direction;
  document.title = catalog.app.name;
  // The window title follows the locale through the platform module (R5).
  getPlatform()
    .setWindowTitle(catalog.app.name)
    .catch(() => {});
}
