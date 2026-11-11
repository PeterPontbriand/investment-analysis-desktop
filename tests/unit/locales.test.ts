import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import en from '../../src/locales/en.json';

type Node = Record<string, unknown>;

function keysOf(node: Node, prefix = ''): string[] {
  return Object.entries(node).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? keysOf(value as Node, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

function valueAt(node: Node, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>((value, part) => (value as Node)[part], node);
}

const directories = ['src/locales', 'tests/fixtures/locales'];
const files = directories.flatMap((directory) =>
  readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .map((name) => `${directory}/${name}`),
);

describe('message catalogs', () => {
  it('finds the English catalog and the test pseudo-locale', () => {
    expect(files).toContain('src/locales/en.json');
    expect(files).toContain('tests/fixtures/locales/ar-XB.json');
  });

  it.each(files)(
    '%s has exactly the English key set and a direction',
    (file) => {
      const catalog = JSON.parse(readFileSync(file, 'utf8')) as Node;
      expect(keysOf(catalog).sort()).toEqual(keysOf(en).sort());
      expect(['ltr', 'rtl']).toContain((catalog.meta as Node).direction);
    },
  );

  it('prefixes every displayed ar-XB value with its tag', () => {
    const catalog = JSON.parse(
      readFileSync('tests/fixtures/locales/ar-XB.json', 'utf8'),
    ) as Node;
    const displayed = keysOf(en).filter((key) => !key.startsWith('meta.'));
    expect(displayed.length).toBeGreaterThan(0);
    for (const key of displayed)
      expect(valueAt(catalog, key)).toBe(`[ar-XB] ${valueAt(en, key)}`);
  });
});
