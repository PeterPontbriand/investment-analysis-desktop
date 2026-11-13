import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.vue';
import { createEngine, engineKey } from '../../src/api/engine.ts';
import { createAppI18n } from '../../src/i18n/index.ts';
import { applyLocale } from '../../src/i18n/locale.ts';
import type { EngineConnection, Platform } from '../../src/platform/index.ts';
import { createAppRouter } from '../../src/router.ts';
import { respond } from '../fixtures/api/server.ts';
import en from '../../src/locales/en.json';

function platform(
  connection: Promise<EngineConnection>,
  status: 'running' | 'exited' = 'running',
): Platform {
  return {
    engineConnection: () => connection,
    engineStatus: () => Promise.resolve(status),
    setWindowTitle: () => Promise.resolve(),
  };
}

async function mountApp(host: Platform, path = '/') {
  const i18n = createAppI18n();
  applyLocale(i18n, 'en');
  const router = createAppRouter();
  await router.push(path);
  await router.isReady();
  const engine = createEngine(host, () => i18n.global.locale.value);
  const wrapper = mount(App, {
    global: {
      plugins: [i18n, router],
      provide: { [engineKey as symbol]: engine },
    },
  });
  await flushPromises();
  return { wrapper, router, i18n };
}

const ready: EngineConnection = {
  state: 'ready',
  baseUrl: 'http://127.0.0.1:1',
  token: 't',
};

function stubEngine() {
  const stub = vi.fn((input: string | URL | Request) => {
    const reply = respond(new URL(String(input)));
    return Promise.resolve(
      new Response(JSON.stringify(reply.body), {
        status: reply.status,
        headers: { 'Content-Language': 'en' },
      }),
    );
  });
  vi.stubGlobal('fetch', stub);
  return stub;
}

afterEach(() => vi.unstubAllGlobals());

describe('app shell', () => {
  it('shows the product name, the notice and the navigation, and starts on Watchlists', async () => {
    stubEngine();
    const { wrapper, router } = await mountApp(
      platform(Promise.resolve(ready)),
    );

    expect(router.currentRoute.value.name).toBe('watchlists');
    expect(wrapper.get('.product').text()).toBe(en.app.name);
    expect(wrapper.get('.notice').text()).toBe(en.app.preReleaseNotice);
    expect(wrapper.findAll('nav a').map((link) => link.text())).toEqual([
      en.nav.watchlists,
      en.nav.refreshes,
      en.nav.runs,
      en.nav.about,
    ]);
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe(en.meta.direction);
    expect(document.title).toBe(en.app.name);
  });

  it('shows the connecting message while the connection is pending, then the data', async () => {
    stubEngine();
    let connect: (connection: EngineConnection) => void = () => {};
    const pending = new Promise<EngineConnection>((resolve) => {
      connect = resolve;
    });
    const { wrapper } = await mountApp(platform(pending));
    expect(wrapper.get('[role="status"]').text()).toBe(en.engine.loading);

    connect(ready);
    await flushPromises();
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.findAll('tbody tr')).toHaveLength(3);
  });

  it('shows the no-engine message on every screen and makes no request', async () => {
    const fetchStub = stubEngine();
    const { wrapper, router } = await mountApp(
      platform(Promise.resolve({ state: 'no_engine' })),
    );
    for (const path of ['/watchlists', '/refreshes', '/runs', '/about']) {
      await router.push(path);
      await flushPromises();
      expect(wrapper.get('[role="status"]').text()).toBe(en.engine.noEngine);
    }
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('shows the catalog message for a launch failure, never the engine text', async () => {
    const { wrapper } = await mountApp(
      platform(
        Promise.resolve({
          state: 'launch_failed',
          reasonCode: 'database_busy',
        }),
      ),
    );

    expect(wrapper.get('[role="status"]').text()).toBe(
      en.engine.state.databaseBusy,
    );
  });

  it('shows the exited message after a network error from an exited engine', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('x')));

    const { wrapper } = await mountApp(
      platform(Promise.resolve(ready), 'exited'),
    );

    expect(wrapper.get('[role="status"]').text()).toBe(en.engine.state.exited);
  });

  it('reloads a screen when the locale changes, sending the new Accept-Language', async () => {
    const fetchStub = stubEngine();
    const { i18n } = await mountApp(platform(Promise.resolve(ready)));
    const before = fetchStub.mock.calls.length;

    i18n.global.locale.value = 'ar-XB';
    await flushPromises();

    expect(fetchStub.mock.calls.length).toBeGreaterThan(before);
  });
});

describe('About screen', () => {
  it('shows /v1/info values with catalog labels and the served language', async () => {
    stubEngine();
    const { wrapper } = await mountApp(
      platform(Promise.resolve(ready)),
      '/about',
    );

    expect(wrapper.get('h2').text()).toBe(en.engine.heading);
    const text = wrapper.get('dl').text();
    for (const expected of [
      en.engine.labels.version,
      '4.5.6',
      en.engine.labels.apiVersions,
      'v1',
      en.engine.labels.schemaVersion,
      en.engine.labels.secIdentity,
      en.engine.secIdentity.notConfigured,
      en.engine.labels.languages,
      'English',
    ])
      expect(text).toContain(expected);
    expect(wrapper.findAll('dd').at(-1)?.attributes('lang')).toBe('en');
    expect(wrapper.get('dl').attributes('lang')).toBeUndefined();
  });
});
