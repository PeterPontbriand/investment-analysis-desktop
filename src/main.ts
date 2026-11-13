import { createApp } from 'vue';
import App from './App.vue';
import { createEngine, engineKey } from './api/engine.ts';
import { createAppI18n } from './i18n/index.ts';
import { applyLocale, chooseStartingLocale } from './i18n/locale.ts';
import { getPlatform } from './platform/index.ts';
import { createAppRouter } from './router.ts';

const i18n = createAppI18n();
applyLocale(i18n, chooseStartingLocale(navigator.languages));

createApp(App)
  .use(i18n)
  .use(createAppRouter())
  .provide(
    engineKey,
    createEngine(getPlatform(), () => i18n.global.locale.value),
  )
  .mount('#app');
