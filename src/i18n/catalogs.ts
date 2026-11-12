import testCatalogs from '@test-locales';
import type en from '../locales/en.json';

export type MessageSchema = typeof en;
export type Direction = 'ltr' | 'rtl';

// Every src/locales/*.json file is a catalog; the file name is the locale tag.
const modules = import.meta.glob<MessageSchema>('../locales/*.json', {
  eager: true,
  import: 'default',
});

function tagOf(path: string): string {
  return path.replace(/^.*\//, '').replace(/\.json$/, '');
}

export const catalogs: Record<string, MessageSchema> = {
  ...Object.fromEntries(
    Object.entries(modules).map(([path, catalog]) => [tagOf(path), catalog]),
  ),
  ...(testCatalogs as Record<string, MessageSchema>),
};
