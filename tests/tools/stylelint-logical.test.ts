import { join } from 'node:path';
import stylelint from 'stylelint';
import { describe, expect, it } from 'vitest';

const configFile = join(process.cwd(), 'stylelint.config.js');

async function lint(code: string, codeFilename: string) {
  const result = await stylelint.lint({
    code,
    codeFilename,
    configFile,
  });
  return result.results[0].warnings.map((warning) => warning.rule);
}

const root = process.cwd();
const css = (property: string) => `a { ${property}: 1rem; }\n`;
const vue = (property: string) =>
  `<template><a>x</a></template>\n<style scoped>\n${css(property)}</style>\n`;

describe('logical properties rule', () => {
  it('reports a physical property in plain CSS', async () => {
    expect(
      await lint(css('margin-left'), join(root, 'src', 'a.css')),
    ).toContain('csstools/use-logical');
  });

  it('reports a physical property in a .vue style block', async () => {
    expect(
      await lint(vue('margin-left'), join(root, 'src', 'A.vue')),
    ).toContain('csstools/use-logical');
  });

  it('accepts the logical equivalent in both', async () => {
    expect(
      await lint(css('margin-inline-start'), join(root, 'src', 'a.css')),
    ).toEqual([]);
    expect(
      await lint(vue('margin-inline-start'), join(root, 'src', 'A.vue')),
    ).toEqual([]);
  });
});
