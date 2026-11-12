import { describe, expect, it } from 'vitest';
import { chooseStartingLocale } from '../../src/i18n/locale.ts';

describe('starting locale', () => {
  const available = ['en', 'pt-BR'];

  it('matches the exact tag case-insensitively', () => {
    expect(chooseStartingLocale(['PT-br'], available)).toBe('pt-BR');
  });

  it('falls back to the language subtag', () => {
    expect(chooseStartingLocale(['en-US'], available)).toBe('en');
  });

  it('uses the first entry that has a catalog', () => {
    expect(chooseStartingLocale(['fr', 'pt-BR', 'en'], available)).toBe(
      'pt-BR',
    );
  });

  it('defaults to English', () => {
    expect(chooseStartingLocale(['fr', 'de'], available)).toBe('en');
    expect(chooseStartingLocale([], available)).toBe('en');
  });
});
