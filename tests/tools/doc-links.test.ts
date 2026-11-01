import { describe, expect, it } from 'vitest';
import { checkMarkdownLinks } from '../../tools/docs/markdown.ts';
import { withMarkdownFixture, writeMarkdown } from './fixtures';

describe('Markdown links and Mermaid check', () => {
  it('passes valid same-file, cross-file, and non-Markdown targets', () => {
    withMarkdownFixture((root) => {
      writeMarkdown(
        root,
        'index.md',
        '# Home\n\n[home](#home) [guide](docs/guide.md#start) [dir](docs/) [image](image.png#ignored) [web](https://example.test)\n\n`[fake](missing.md)`\n\n~~~md\n[also fake](missing.md)\n~~~\n',
      );
      writeMarkdown(root, 'docs/guide.md', '# Start\n');
      writeMarkdown(root, 'image.png', 'not a markdown anchor target');
      expect(checkMarkdownLinks(root)).toEqual([]);
    });
  });

  it('fails on a broken local link', () => {
    withMarkdownFixture((root) => {
      writeMarkdown(root, 'index.md', '[missing](missing.md)\n');
      expect(
        checkMarkdownLinks(root).some((issue) =>
          issue.reason.includes('target path does not exist'),
        ),
      ).toBe(true);
    });
  });

  it('fails on a missing heading anchor', () => {
    withMarkdownFixture((root) => {
      writeMarkdown(root, 'index.md', '# Present\n\n[missing](#absent)\n');
      expect(
        checkMarkdownLinks(root).some((issue) =>
          issue.reason.includes('no heading produces anchor #absent'),
        ),
      ).toBe(true);
    });
  });

  it('fails on a Mermaid block', () => {
    withMarkdownFixture((root) => {
      writeMarkdown(root, 'index.md', '```mermaid\ngraph TD\n```\n');
      expect(
        checkMarkdownLinks(root).some((issue) =>
          issue.reason.startsWith('mermaid block'),
        ),
      ).toBe(true);
    });
  });
});
