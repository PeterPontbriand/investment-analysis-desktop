import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';

describe('Tauri import boundary', () => {
  it('rejects Tauri API imports in src and allows them in src/platform', async () => {
    const eslint = new ESLint();
    const source = "import { invoke } from '@tauri-apps/api/core'\n";
    const srcResult = await eslint.lintText(source, {
      filePath: resolve('src/example.ts'),
    });
    const platformResult = await eslint.lintText(source, {
      filePath: resolve('src/platform/example.ts'),
    });

    expect(
      srcResult[0]?.messages.some(
        (message) =>
          message.ruleId === 'no-restricted-imports' && message.severity === 2,
      ),
    ).toBe(true);
    expect(
      platformResult[0]?.messages.some(
        (message) => message.ruleId === 'no-restricted-imports',
      ),
    ).toBe(false);
  });
});

describe('vue-i18n import boundary', () => {
  const source = "import { useI18n } from 'vue-i18n';";
  const tauri = "import { invoke } from '@tauri-apps/api/core';";

  async function restricted(code: string, path: string): Promise<boolean> {
    const [result] = await new ESLint().lintText(code, {
      filePath: resolve(path),
    });
    return (
      result?.messages.some(
        (message) =>
          message.ruleId === 'no-restricted-imports' && message.severity === 2,
      ) ?? false
    );
  }

  it('rejects vue-i18n outside src/i18n', async () => {
    expect(await restricted(source, 'src/example.ts')).toBe(true);
  });

  it('allows vue-i18n in src/i18n', async () => {
    expect(await restricted(source, 'src/i18n/example.ts')).toBe(false);
  });

  it('rejects Tauri API imports in src/i18n', async () => {
    expect(await restricted(tauri, 'src/i18n/example.ts')).toBe(true);
  });

  it('rejects vue-i18n in src/platform', async () => {
    expect(await restricted(source, 'src/platform/example.ts')).toBe(true);
  });
});
