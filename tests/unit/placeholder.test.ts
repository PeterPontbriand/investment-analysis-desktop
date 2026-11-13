import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.vue';
import type { components } from '../../src/api/schema.ts';
import { platformKey } from '../../src/api/useEngineInfo.ts';
import { createAppI18n } from '../../src/i18n/index.ts';
import { applyLocale } from '../../src/i18n/locale.ts';
import type { EngineConnection, Platform } from '../../src/platform/index.ts';
import { createAppRouter } from '../../src/router.ts';
import en from '../../src/locales/en.json';

const info: components['schemas']['InfoDocument'] = {
  api_versions: ['v1', 'v2'],
  engine_version: '9.8.7',
  locales: [
    { tag: 'en', name: 'English' },
    { tag: 'pt-BR', name: 'Portugues' },
  ],
  schema_version: 2,
  sec_identity_configured: true,
};

function platform(
  connection: EngineConnection,
  status: 'running' | 'exited' = 'running',
): Platform {
  return {
    engineConnection: () => Promise.resolve(connection),
    engineStatus: () => Promise.resolve(status),
    setWindowTitle: () => Promise.resolve(),
  };
}

async function mountApp(host: Platform) {
  const i18n = createAppI18n();
  applyLocale(i18n, 'en');
  const router = createAppRouter();
  await router.push('/');
  await router.isReady();
  const wrapper = mount(App, {
    global: {
      plugins: [i18n, router],
      provide: { [platformKey as symbol]: host },
    },
  });
  await flushPromises();
  return wrapper;
}

const ready: EngineConnection = {
  state: 'ready',
  baseUrl: 'http://127.0.0.1:1',
  token: 't',
};

afterEach(() => vi.unstubAllGlobals());

describe('placeholder screen', () => {
  it('shows /v1/info values with catalog labels and the served language', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(info), {
          headers: { 'Content-Language': 'en' },
        }),
      ),
    );

    const wrapper = await mountApp(platform(ready));

    expect(wrapper.get('h2').text()).toBe(en.engine.heading);
    const text = wrapper.get('dl').text();
    for (const expected of [
      en.engine.labels.version,
      '9.8.7',
      en.engine.labels.apiVersions,
      'v1, v2',
      en.engine.labels.schemaVersion,
      '2',
      en.engine.labels.secIdentity,
      en.engine.secIdentity.configured,
      en.engine.labels.languages,
      'English, Portugues',
    ])
      expect(text).toContain(expected);
    expect(wrapper.get('dl').attributes('lang')).toBe('en');
  });

  it('shows "Not configured" when no SEC identity is configured', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ ...info, sec_identity_configured: false }),
          ),
        ),
    );

    const wrapper = await mountApp(platform(ready));

    expect(wrapper.get('dl').text()).toContain(
      en.engine.secIdentity.notConfigured,
    );
  });

  it('shows only the no-engine message and makes no request without an engine', async () => {
    const fetchStub = vi.fn();
    vi.stubGlobal('fetch', fetchStub);

    const wrapper = await mountApp(platform({ state: 'no_engine' }));

    expect(wrapper.get('[role="status"]').text()).toBe(en.engine.noEngine);
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('shows the catalog message for a launch failure, never the engine text', async () => {
    const wrapper = await mountApp(
      platform({ state: 'launch_failed', reasonCode: 'database_busy' }),
    );

    expect(wrapper.get('[role="status"]').text()).toBe(
      en.engine.state.databaseBusy,
    );
  });

  it('shows the exited message after a network error from an exited engine', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('x')));

    const wrapper = await mountApp(platform(ready, 'exited'));

    expect(wrapper.get('[role="status"]').text()).toBe(en.engine.state.exited);
  });
});
