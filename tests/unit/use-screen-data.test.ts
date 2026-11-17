import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it } from 'vitest';
import { createEngine, engineKey } from '../../src/api/engine.ts';
import { useScreenData } from '../../src/api/useScreenData.ts';
import { createAppI18n } from '../../src/i18n/index.ts';
import { applyLocale } from '../../src/i18n/locale.ts';

describe('useScreenData.replace', () => {
  it('shows a replaced document and drops a load still pending', async () => {
    const i18n = createAppI18n();
    applyLocale(i18n, 'en');
    const engine = createEngine(
      {
        engineConnection: () =>
          Promise.resolve({
            state: 'ready',
            baseUrl: 'http://127.0.0.1:1',
            token: 't',
          }),
        engineStatus: () => Promise.resolve('running'),
        setWindowTitle: () => Promise.resolve(),
      },
      () => 'en',
    );
    let finish: (value: string) => void = () => {};
    let calls = 0;
    let api: ReturnType<typeof useScreenData<string>> | null = null;
    const Probe = defineComponent({
      setup() {
        api = useScreenData<string>(
          () =>
            ++calls === 1
              ? Promise.resolve('first')
              : new Promise<string>((resolve) => {
                  finish = resolve;
                }),
          [],
        );
        return () => h('div');
      },
    });
    mount(Probe, {
      global: {
        plugins: [i18n],
        provide: { [engineKey as symbol]: engine },
      },
    });
    await flushPromises();
    expect(api!.state.value).toEqual({ kind: 'ready', data: 'first' });

    const reloading = api!.reload();
    await flushPromises();
    api!.replace('from the action');
    finish('stale');
    await reloading;
    await flushPromises();

    expect(api!.state.value).toEqual({
      kind: 'ready',
      data: 'from the action',
    });
  });
});
