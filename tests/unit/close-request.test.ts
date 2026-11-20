/* global HTMLDialogElement -- DOM types; tests/unit configures no browser globals */
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.vue';
import { createEngine, engineKey } from '../../src/api/engine.ts';
import { createAppI18n } from '../../src/i18n/index.ts';
import { applyLocale } from '../../src/i18n/locale.ts';
import type { Platform } from '../../src/platform/index.ts';
import { createAppRouter } from '../../src/router.ts';
import { job, totals } from '../fixtures/api/refresh.ts';
import { respond } from '../fixtures/api/server.ts';
import en from '../../src/locales/en.json';

// The close request of D255, with the host's window faked.
function host() {
  const state = { handler: null as null | (() => boolean), closed: 0 };
  const platform: Platform = {
    engineConnection: () =>
      Promise.resolve({
        state: 'ready',
        baseUrl: 'http://127.0.0.1:1',
        token: 't',
      }),
    engineStatus: () => Promise.resolve('running'),
    setWindowTitle: () => Promise.resolve(),
    onCloseRequested: (handler) => {
      state.handler = handler;
    },
    closeWindow: () => {
      state.closed += 1;
      return Promise.resolve();
    },
  };
  return { state, platform };
}

// What the followed job's poll answers; changed by a test to end the refresh.
let pollAnswer: ReturnType<typeof job> = job();

async function mountApp(platform: Platform) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string | URL | Request) => {
      const url = new URL(String(input));
      const reply = /\/v1\/refreshes\/[^/]+\/job$/.test(url.pathname)
        ? { status: 200, body: pollAnswer }
        : respond(url);
      return Promise.resolve(
        new Response(JSON.stringify(reply.body), {
          status: reply.status,
          headers: { 'Content-Language': 'en' },
        }),
      );
    }),
  );
  const i18n = createAppI18n();
  applyLocale(i18n, 'en');
  const router = createAppRouter();
  await router.push('/');
  await router.isReady();
  const engine = createEngine(platform, () => 'en');
  const wrapper = mount(App, {
    attachTo: document.body,
    global: {
      plugins: [i18n, router],
      provide: { [engineKey as symbol]: engine },
    },
  });
  await flushPromises();
  return { wrapper, engine };
}

beforeAll(() => {
  // jsdom has no modal dialog support.
  HTMLDialogElement.prototype.showModal ??= function showModal() {
    this.setAttribute('open', '');
  };
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  pollAnswer = job();
});

const button = (text: string) =>
  [...document.querySelectorAll('dialog button')].find(
    (element) => element.textContent?.trim() === text,
  );

describe('closing the window (D255)', () => {
  it('closes with no question when no refresh is running', async () => {
    const { state, platform } = host();
    const { wrapper } = await mountApp(platform);
    expect(state.handler?.()).toBe(false);
    await flushPromises();
    expect(document.querySelector('dialog')).toBeNull();
    wrapper.unmount();
  });

  it('asks first while a refresh runs, and "Keep open" keeps the window', async () => {
    const { state, platform } = host();
    const { wrapper, engine } = await mountApp(platform);
    engine.follower.start(job());
    expect(state.handler?.()).toBe(true);
    await flushPromises();
    expect(document.querySelector('dialog h2')?.textContent).toBe(
      en.close.title,
    );
    button(en.actions.keepOpen)?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await flushPromises();
    expect(document.querySelector('dialog')).toBeNull();
    expect(state.closed).toBe(0);
    // Asked again the next time.
    expect(state.handler?.()).toBe(true);
    wrapper.unmount();
  });

  it('"Close anyway" closes the window', async () => {
    const { state, platform } = host();
    const { wrapper, engine } = await mountApp(platform);
    engine.follower.start(job());
    state.handler?.();
    await flushPromises();
    button(en.close.closeAnyway)?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await flushPromises();
    expect(state.closed).toBe(1);
    expect(button(en.close.closeAnyway)?.classList.contains('danger')).toBe(
      true,
    );
    wrapper.unmount();
  });

  // D264: the refresh ends, or a stop takes effect, while the question is open.
  for (const [name, ended] of [
    ['finishes', job({ state: 'completed', totals: totals(4, 4, 0) })],
    ['is stopped', job({ state: 'stopped', totals: totals(4, 2, 0) })],
  ] as const) {
    it(`closes the window and the question when the refresh ${name} while it is open`, async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const { state, platform } = host();
      const { wrapper, engine } = await mountApp(platform);
      engine.follower.start(job());
      expect(state.handler?.()).toBe(true);
      await flushPromises();
      expect(document.querySelector('dialog')).not.toBeNull();
      // Still running at the next poll: the question stays.
      await vi.advanceTimersByTimeAsync(1000);
      await flushPromises();
      expect(document.querySelector('dialog')).not.toBeNull();
      expect(state.closed).toBe(0);
      pollAnswer = ended;
      await vi.advanceTimersByTimeAsync(1000);
      await flushPromises();
      expect(document.querySelector('dialog')).toBeNull();
      expect(state.closed).toBe(1);
      wrapper.unmount();
    });
  }

  it('does not close the window when a refresh ends with no question open', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { state, platform } = host();
    const { wrapper, engine } = await mountApp(platform);
    engine.follower.start(job());
    pollAnswer = job({ state: 'completed', totals: totals(4, 4, 0) });
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    expect(state.closed).toBe(0);
    wrapper.unmount();
  });

  it('does not close the window after "Keep open" when the refresh then ends', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { state, platform } = host();
    const { wrapper, engine } = await mountApp(platform);
    engine.follower.start(job());
    state.handler?.();
    await flushPromises();
    button(en.actions.keepOpen)?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await flushPromises();
    pollAnswer = job({ state: 'completed', totals: totals(4, 4, 0) });
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    expect(state.closed).toBe(0);
    wrapper.unmount();
  });
});
