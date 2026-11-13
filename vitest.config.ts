import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

// Dates are checked in this zone; worker processes inherit it.
process.env.TZ = 'America/Toronto';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@test-locales': fileURLToPath(
        new URL('./src/i18n/no-test-catalogs.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts', 'tests/tools/**/*.test.ts'],
  },
});
