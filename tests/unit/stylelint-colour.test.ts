import { join } from 'node:path';
import stylelint from 'stylelint';
import { describe, expect, it } from 'vitest';

const configFile = join(process.cwd(), 'stylelint.config.js');
const root = process.cwd();

async function rules(code: string, path: string[]): Promise<string[]> {
  const result = await stylelint.lint({
    code,
    codeFilename: join(root, ...path),
    configFile,
  });
  return result.results[0].warnings.map((warning) => warning.rule);
}

const literals = [
  'a { color: #fff; }\n',
  'a { color: red; }\n',
  'a { color: rgb(0 0 0); }\n',
  'a { color: rgba(0, 0, 0, 0.5); }\n',
  'a { color: hsl(0 0% 0%); }\n',
  'a { color: hsla(0, 0%, 0%, 0.5); }\n',
];

describe('colour literals', () => {
  for (const code of literals) {
    it(`reports ${code.trim()} outside the token file`, async () => {
      expect(
        (await rules(code, ['src', 'components', 'a.css'])).length,
      ).toBeGreaterThan(0);
    });

    it(`allows ${code.trim()} in the token file`, async () => {
      expect(await rules(code, ['src', 'styles', 'tokens.css'])).toEqual([]);
    });
  }

  it('accepts a token reference anywhere', async () => {
    expect(
      await rules('a { color: var(--color-text); }\n', ['src', 'a.css']),
    ).toEqual([]);
  });
});
