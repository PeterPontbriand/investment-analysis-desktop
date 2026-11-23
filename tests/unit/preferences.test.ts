import { describe, expect, it } from 'vitest';
import { createPreferences } from '../../src/preferences.ts';

function memoryStore(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe('preferences', () => {
  it('shows previews by default', () => {
    expect(createPreferences(() => memoryStore()).showPreviews.value).toBe(
      true,
    );
  });

  it('reads an explicit "off", and treats anything else as on', () => {
    const key = 'iad.showPreviews';
    expect(
      createPreferences(() => memoryStore({ [key]: 'off' })).showPreviews.value,
    ).toBe(false);
    expect(
      createPreferences(() => memoryStore({ [key]: 'on' })).showPreviews.value,
    ).toBe(true);
    expect(
      createPreferences(() => memoryStore({ [key]: 'garbage' })).showPreviews
        .value,
    ).toBe(true);
  });

  it('writes the choice, which a later start reads back', () => {
    const store = memoryStore();
    const first = createPreferences(() => store);
    first.setShowPreviews(false);
    expect(first.showPreviews.value).toBe(false);
    expect(createPreferences(() => store).showPreviews.value).toBe(false);
    first.setShowPreviews(true);
    expect(createPreferences(() => store).showPreviews.value).toBe(true);
  });

  it('falls back to on when the store cannot be read or reached', () => {
    const unreadable = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => undefined,
    };
    expect(createPreferences(() => unreadable).showPreviews.value).toBe(true);
    expect(
      createPreferences(() => {
        throw new Error('no storage');
      }).showPreviews.value,
    ).toBe(true);
  });

  it('keeps the choice for the session when a write fails', () => {
    const unwritable = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    const preferences = createPreferences(() => unwritable);
    expect(() => preferences.setShowPreviews(false)).not.toThrow();
    expect(preferences.showPreviews.value).toBe(false);
  });
});
