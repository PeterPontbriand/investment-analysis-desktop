import { afterEach, describe, expect, it } from 'vitest';
import { effectScope, ref } from 'vue';
import {
  currentScreen,
  nextTrail,
  registerScreen,
  type TrailCrumb,
} from '../../src/composables/useTrail.ts';

const crumb = (path: string, query: Record<string, string> = {}) =>
  ({
    label: path,
    path,
    to: { path, query },
  }) satisfies TrailCrumb;

describe('the navigation trail rules (D380, D381)', () => {
  it('appends the screen being left when a link opens another screen', () => {
    const trail = [crumb('/runs')];
    expect(nextTrail(trail, crumb('/runs/1'), '/help', false)).toEqual([
      crumb('/runs'),
      crumb('/runs/1'),
    ]);
  });

  it('keeps the full location of the screen left, query included', () => {
    const left = crumb('/runs', { ticker: 'KO', outcome: 'failed' });
    expect(nextTrail([], left, '/runs/1', false)).toEqual([left]);
  });

  it('changes nothing when the path stays the same, whatever the query or hash', () => {
    const trail = [crumb('/watchlists')];
    expect(
      nextTrail(trail, crumb('/runs', { ticker: 'KO' }), '/runs', false),
    ).toBe(trail);
  });

  it('cuts the trail back to before a screen it already holds', () => {
    const trail = [
      crumb('/refreshes'),
      crumb('/refreshes/a'),
      crumb('/runs/1'),
    ];
    expect(nextTrail(trail, crumb('/help'), '/refreshes/a', false)).toEqual([
      crumb('/refreshes'),
    ]);
    expect(nextTrail(trail, crumb('/help'), '/refreshes', false)).toEqual([]);
  });

  it('starts afresh for a navigation the sidebar caused', () => {
    const trail = [crumb('/runs'), crumb('/runs/1')];
    expect(nextTrail(trail, crumb('/help'), '/watchlists', true)).toEqual([]);
    // Also when the sidebar opens the screen already shown with another query.
    expect(
      nextTrail(trail, crumb('/runs', { ticker: 'KO' }), '/runs', true),
    ).toEqual([]);
  });

  it('has nothing to append for the first navigation', () => {
    expect(nextTrail([], null, '/watchlists', false)).toEqual([]);
  });

  it('never drops a crumb, however long the trail grows', () => {
    let trail: TrailCrumb[] = [];
    for (let index = 0; index < 30; index += 1)
      trail = nextTrail(trail, crumb(`/s/${index}`), `/s/${index + 1}`, false);
    expect(trail).toHaveLength(30);
  });
});

describe('the current screen', () => {
  afterEach(() => currentScreen.value?.release());

  it('is the screen that registered last, with a label that follows its data', () => {
    const scope = effectScope();
    const name = ref<string | null>(null);
    scope.run(() =>
      registerScreen({
        label: () => name.value ?? 'Watchlist',
        parents: () => [crumb('/watchlists')],
      }),
    );
    expect(currentScreen.value?.label()).toBe('Watchlist');
    name.value = 'Core';
    expect(currentScreen.value?.label()).toBe('Core');
    expect(currentScreen.value?.parents()).toEqual([crumb('/watchlists')]);
    scope.stop();
    expect(currentScreen.value).toBeNull();
  });

  it('is not cleared by a screen that went away after another registered', () => {
    const first = effectScope();
    const second = effectScope();
    first.run(() => registerScreen({ label: () => 'One', parents: () => [] }));
    second.run(() => registerScreen({ label: () => 'Two', parents: () => [] }));
    first.stop();
    expect(currentScreen.value?.label()).toBe('Two');
    second.stop();
  });
});
