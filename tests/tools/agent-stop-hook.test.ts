import { describe, expect, it } from 'vitest';
import {
  chooseChecks,
  fingerprint,
  shouldCheck,
  summarizeFailure,
} from '../../tools/agent-stop-hook.ts';

const paths = ['src/App.vue'];

describe('shouldCheck', () => {
  it('never checks when a hook run is already active', () => {
    expect(shouldCheck({ stop_hook_active: true }, paths, 'new', 'old')).toBe(
      false,
    );
  });

  it('does not check when no path changed', () => {
    expect(shouldCheck({}, [], 'new', 'old')).toBe(false);
  });

  it('does not check when the fingerprint equals the last pass', () => {
    expect(shouldCheck({}, paths, 'same', 'same')).toBe(false);
  });

  it('checks changed paths with a new fingerprint', () => {
    expect(shouldCheck({}, paths, 'new', 'old')).toBe(true);
    expect(shouldCheck({}, paths, 'new', null)).toBe(true);
  });

  it('checks when the changed paths could not be listed', () => {
    expect(shouldCheck({}, null, 'new', 'old')).toBe(true);
  });
});

describe('fingerprint', () => {
  const diff = new Uint8Array([1, 2, 3]);
  const file = new Uint8Array([4, 5]);

  it('is stable for the same inputs, whatever the key order', () => {
    const a = fingerprint('abc', diff, { 'a.ts': file, 'b.ts': file });
    const b = fingerprint('abc', diff, { 'b.ts': file, 'a.ts': file });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes with HEAD, the diff, or an untracked file', () => {
    const base = fingerprint('abc', diff, { 'a.ts': file });
    expect(fingerprint('abd', diff, { 'a.ts': file })).not.toBe(base);
    expect(fingerprint('abc', new Uint8Array([9]), { 'a.ts': file })).not.toBe(
      base,
    );
    expect(fingerprint('abc', diff, { 'a.ts': new Uint8Array([6]) })).not.toBe(
      base,
    );
    expect(fingerprint('abc', diff, { 'b.ts': file })).not.toBe(base);
  });
});

describe('chooseChecks', () => {
  it('chooses the documentation checks for a docs-only change', () => {
    expect(chooseChecks(['README.md', 'docs/project/CHARTER.md'])).toEqual([
      ['docs:check'],
      ['format:check'],
    ]);
  });

  it('chooses the slice check for any other change', () => {
    expect(chooseChecks(['README.md', 'src/App.vue'])).toEqual([
      ['gate:slice'],
    ]);
  });

  it('chooses the slice check when the paths are unknown', () => {
    expect(chooseChecks(null)).toEqual([['gate:slice']]);
  });
});

describe('summarizeFailure', () => {
  const output = [
    'Gate summary',
    '| Step | Result | Duration |',
    '| :--- | :--- | ---: |',
    '| Prettier check | PASS | 2.3s |',
    '| ESLint | FAIL | 4.0s |',
    '| Vitest | FAIL | 8.0s |',
    '| Tauri shell smoke test | SKIP | - |',
  ].join('\n');

  it('names the failing steps and the complete output file', () => {
    expect(summarizeFailure(output, '/repo/gate-output.txt')).toBe(
      'Failing steps: ESLint, Vitest\nComplete output: /repo/gate-output.txt',
    );
  });

  it('falls back to the last 40 lines when no row failed', () => {
    const lines = Array.from({ length: 60 }, (_, index) => `line ${index + 1}`);
    const summary = summarizeFailure(lines.join('\n')).split('\n');
    expect(summary[0]).toBe('Last 40 lines of output:');
    expect(summary).toHaveLength(41);
    expect(summary[1]).toBe('line 21');
    expect(summary[40]).toBe('line 60');
  });
});
