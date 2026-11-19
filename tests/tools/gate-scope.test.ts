import { describe, expect, it } from 'vitest';
import { shellPathsChanged } from '../../tools/gate-scope.ts';

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
