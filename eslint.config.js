import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const vueI18nMessage = 'Read messages through useMessages() from src/i18n/.';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-browser-test/**',
      'node_modules/**',
      'src-tauri/target/**',
      'src-tauri/gen/**',
      'playwright-report/**',
      'test-results/**',
      'src/api/schema.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,vue}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'vue-i18n', message: vueI18nMessage }],
          patterns: ['@tauri-apps/*'],
        },
      ],
    },
  },
  {
    files: ['**/*.vue'],
    rules: { 'vue/no-bare-strings-in-template': 'error' },
  },
  {
    files: ['src/i18n/**/*.{js,mjs,cjs,ts,tsx,vue}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['@tauri-apps/*'] }],
    },
  },
  {
    files: ['src/platform/**/*.{js,mjs,cjs,ts,tsx,vue}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [{ name: 'vue-i18n', message: vueI18nMessage }] },
      ],
    },
  },
  {
    files: ['*.config.{js,ts}', 'tools/**', 'tests/**'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
