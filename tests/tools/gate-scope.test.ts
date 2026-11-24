import { describe, expect, it } from 'vitest';
import { selectSteps, shellPathsChanged } from '../../tools/gate-scope.ts';

describe('shellPathsChanged', () => {
  it('returns nothing for an empty list', () => {
    expect(shellPathsChanged([])).toEqual([]);
  });

  it('ignores paths outside the shell paths', () => {
    expect(
      shellPathsChanged([
        'src/views/AboutView.vue',
        'tools/gate.ts',
        'docs/project/README.md',
        'package.json',
      ]),
    ).toEqual([]);
  });

  it.each([
    'src-tauri/src/lib.rs',
    'src/platform/tauri.ts',
    'tests/shell/window.spec.js',
    'wdio.conf.js',
    'rust-toolchain.toml',
    'pnpm-lock.yaml',
  ])('returns %s', (path) => {
    expect(shellPathsChanged([path])).toEqual([path]);
  });

  it('needs the slash for a prefix match', () => {
    expect(
      shellPathsChanged(['src-tauri-notes.md', 'src/platformer.ts']),
    ).toEqual([]);
  });

  it('returns a repeated path once and keeps input order', () => {
    expect(
      shellPathsChanged([
        'wdio.conf.js',
        'docs/a.md',
        'src-tauri/a.rs',
        'wdio.conf.js',
      ]),
    ).toEqual(['wdio.conf.js', 'src-tauri/a.rs']);
  });
});

describe('selectSteps', () => {
  it('runs every step in full mode, whatever changed', () => {
    for (const changed of [true, false])
      expect(selectSteps('full', changed)).toEqual({
        install: true,
        web: true,
        shell: true,
      });
  });

  it('runs the shell steps in slice mode only when shell paths changed', () => {
    expect(selectSteps('slice', true)).toEqual({
      install: true,
      web: true,
      shell: true,
    });
    expect(selectSteps('slice', false)).toEqual({
      install: true,
      web: true,
      shell: false,
    });
  });

  it('runs no shell step in web mode', () => {
    for (const changed of [true, false])
      expect(selectSteps('web', changed)).toEqual({
        install: true,
        web: true,
        shell: false,
      });
  });

  it('runs only the install and the shell steps in shell mode', () => {
    for (const changed of [true, false])
      expect(selectSteps('shell', changed)).toEqual({
        install: true,
        web: false,
        shell: true,
      });
  });
});
