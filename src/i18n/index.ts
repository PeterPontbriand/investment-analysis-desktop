import { createI18n, useI18n } from 'vue-i18n';
import { catalogs, type MessageSchema } from './catalogs.ts';

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

// Displayed message keys, typed from en.json: an unknown key fails the type
// check. The non-displayed meta group is not a message.
export type MessageKey = Exclude<Paths<MessageSchema>, `meta.${string}`>;

export type MessageParameters = Record<string, string | number>;

export function createAppI18n() {
  return createI18n({
    legacy: false,
    globalInjection: false,
    locale: 'en',
    fallbackLocale: 'en',
    messages: catalogs,
  });
}

export type AppI18n = ReturnType<typeof createAppI18n>;

export function useMessages() {
  const { t, locale } = useI18n();
  return {
    // A message, with named parameters such as {date}.
    t: (key: MessageKey, parameters?: MessageParameters): string =>
      parameters ? t(key, parameters) : t(key),
    // A message with plural forms separated by "|"; {count} is the count.
    plural: (
      key: MessageKey,
      count: number,
      parameters: MessageParameters = {},
    ): string => t(key, { ...parameters, count }, count),
    locale,
  };
}
