import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import App from '../../src/App.vue';
import { createAppI18n } from '../../src/i18n/index.ts';
import { applyLocale } from '../../src/i18n/locale.ts';
import { createAppRouter } from '../../src/router.ts';
import en from '../../src/locales/en.json';

async function mountApp() {
  const i18n = createAppI18n();
  applyLocale(i18n, 'en');
  const router = createAppRouter();
  await router.push('/');
  await router.isReady();
  return mount(App, { global: { plugins: [i18n, router] } });
}

describe('static screen', () => {
  it('shows the product heading and pre-release notice from the catalog', async () => {
    const wrapper = await mountApp();

    expect(wrapper.get('h1').text()).toBe(en.app.name);
    expect(wrapper.get('p').text()).toBe(en.app.preReleaseNotice);
  });

  it('sets lang, dir and the page title from the catalog', async () => {
    await mountApp();

    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe(en.meta.direction);
    expect(document.title).toBe(en.app.name);
  });

  it('serves the screen at / through memory history', async () => {
    const router = createAppRouter();
    await router.push('/');
    expect(router.currentRoute.value.name).toBe('home');
    expect(window.location.pathname).toBe('/');
  });
});
