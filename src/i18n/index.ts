import { createI18n, useI18n } from 'vue-i18n';
import { catalogs, type MessageSchema } from './catalogs.ts';

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

// Displayed message keys, typed from en.json: an unknown key fails the type
// check. The non-displayed meta group is not a message.
export type MessageKey = Exclude<Paths<MessageSchema>, `meta.${string}`>;

export function createAppI18n() {
  return createI18n({
    legacy: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: catalogs,
  });
}

export type AppI18n = ReturnType<typeof createAppI18n>;

export function useMessages() {
  const { t } = useI18n();
  return { t: (key: MessageKey): string => t(key) };
}
