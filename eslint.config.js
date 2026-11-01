import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import vue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.{ts,vue}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['@tauri-apps/*'] }],
    },
  },
  {
    files: ['src/platform/**/*.{ts,vue}'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: { globals: { process: 'readonly' } },
  },
  prettier,
);
