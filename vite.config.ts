import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import tauriConf from './src-tauri/tauri.conf.json' with { type: 'json' };

const testCatalogs = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url));

export default defineConfig(({ mode }) => {
  const browserTest = mode === 'browser-test';
  return {
    plugins: [vue()],
    define: {
      __VUE_I18N_LEGACY_API__: false,
      __VUE_I18N_FULL_INSTALL__: true,
      __INTLIFY_PROD_DEVTOOLS__: false,
    },
    resolve: {
      alias: {
        '@test-locales': testCatalogs(
          browserTest
            ? './tests/fixtures/test-catalogs.ts'
            : './src/i18n/no-test-catalogs.ts',
        ),
      },
    },
    build: { outDir: browserTest ? 'dist-browser-test' : 'dist' },
    preview: {
      headers: { 'Content-Security-Policy': tauriConf.app.security.csp },
    },
  };
});
