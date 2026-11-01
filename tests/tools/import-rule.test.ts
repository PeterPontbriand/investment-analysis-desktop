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
