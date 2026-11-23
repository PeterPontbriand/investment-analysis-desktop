import { describe, expect, it } from 'vitest';
import { isDocsOnly, parsePaths } from '../../tools/ci/changes.ts';

describe('isDocsOnly', () => {
  it('is docs-only for Markdown files only', () => {
    expect(isDocsOnly(['README.md', 'AGENTS.md'])).toBe(true);
  });

  it('is docs-only for files under docs/ only', () => {
    expect(
      isDocsOnly(['docs/design/mock.html', 'docs/project/CHARTER.md']),
    ).toBe(true);
  });

  it('is not docs-only when one source file is mixed in', () => {
    expect(isDocsOnly(['README.md', 'src/App.vue'])).toBe(false);
  });

  it('is not docs-only for a workflow change', () => {
    expect(isDocsOnly(['.github/workflows/ci.yaml'])).toBe(false);
    expect(isDocsOnly(['docs/a.md', '.github/workflows/ci.yaml'])).toBe(false);
  });

  it('is not docs-only for a lockfile change', () => {
    expect(isDocsOnly(['pnpm-lock.yaml'])).toBe(false);
  });

  it.each(['package.json', 'tools/gate.ts', 'src/locales/en.json'])(
    'is not docs-only for %s',
    (path) => {
      expect(isDocsOnly([path])).toBe(false);
    },
  );

  it('is not docs-only for an empty list', () => {
    expect(isDocsOnly([])).toBe(false);
  });

  it('is docs-only for a Markdown file under src/', () => {
    expect(isDocsOnly(['src/components/NOTES.md'])).toBe(true);
  });

  it('is not docs-only for any path under vendor/, Markdown included', () => {
    expect(isDocsOnly(['vendor/ian/SOURCE.md'])).toBe(false);
  });

  it('does not treat a name that merely contains md as Markdown', () => {
    expect(isDocsOnly(['src/md', 'notes.mdx', 'documents/a.txt'])).toBe(false);
  });
});

describe('parsePaths', () => {
  it('splits NUL-separated paths and drops the trailing empty entry', () => {
    expect(parsePaths('a.md\0docs/b.md\0')).toEqual(['a.md', 'docs/b.md']);
  });

  it('returns nothing for empty input', () => {
    expect(parsePaths('')).toEqual([]);
  });

  it('keeps spaces and newlines inside a path', () => {
    expect(parsePaths('docs/a b.md\0docs/c\nd.md\0')).toEqual([
      'docs/a b.md',
      'docs/c\nd.md',
    ]);
  });
});
