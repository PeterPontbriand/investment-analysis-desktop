import { describe, expect, it } from 'vitest';
import { checkSequenceTables } from '../../tools/docs/sequence.ts';
import { withMarkdownFixture, writeMarkdown } from './fixtures';

const header = '| Unit | Status | Completed |\n| :--- | :--- | :--- |\n';

describe('sequence table check', () => {
  it('passes a valid table and ignores fenced examples', () => {
    withMarkdownFixture((root) => {
      writeMarkdown(
        root,
        'sequence.md',
        `${header}| GUI.0 | Complete | 2026-10-30 |\n| GUI.1a | Complete | 2026-10-31 |\n| GUI.1b | Next |  |\n| GUI.2 | Planned |  |\n\n\`\`\`md\n${header}| Example | Next | 2020-01-01 |\n\`\`\`\n`,
      );
      expect(checkSequenceTables(root)).toEqual([]);
    });
  });

  it('fails when status order is broken', () => {
    withMarkdownFixture((root) => {
      writeMarkdown(
        root,
        'sequence.md',
        `${header}| A | Planned |  |\n| B | Next |  |\n`,
      );
      expect(
        checkSequenceTables(root).some((issue) =>
          issue.reason.includes('out of order'),
        ),
      ).toBe(true);
    });
  });

  it('fails when a Complete row has no ISO date', () => {
    withMarkdownFixture((root) => {
      writeMarkdown(root, 'sequence.md', `${header}| A | Complete |  |\n`);
      expect(
        checkSequenceTables(root).some((issue) =>
          issue.reason.includes('Complete row must have an ISO date'),
        ),
      ).toBe(true);
    });
  });

  it('rejects year zero as a completion date', () => {
    withMarkdownFixture((root) => {
      writeMarkdown(
        root,
        'sequence.md',
        `${header}| A | Complete | 0000-01-01 |\n`,
      );
      expect(
        checkSequenceTables(root).some((issue) =>
          issue.reason.includes('Complete row must have an ISO date'),
        ),
      ).toBe(true);
    });
  });

  it('fails when a non-Complete row has a date', () => {
    withMarkdownFixture((root) => {
      writeMarkdown(
        root,
        'sequence.md',
        `${header}| A | Planned | 2026-10-31 |\n`,
      );
      expect(
        checkSequenceTables(root).some((issue) =>
          issue.reason.includes('must leave Completed empty'),
        ),
      ).toBe(true);
    });
  });

  it('fails on decreasing Complete dates', () => {
    withMarkdownFixture((root) => {
      writeMarkdown(
        root,
        'sequence.md',
        `${header}| A | Complete | 2026-10-31 |\n| B | Complete | 2026-10-30 |\n`,
      );
      expect(
        checkSequenceTables(root).some((issue) =>
          issue.reason.includes('non-decreasing order'),
        ),
      ).toBe(true);
    });
  });

  it('fails on two Next rows', () => {
    withMarkdownFixture((root) => {
      writeMarkdown(
        root,
        'sequence.md',
        `${header}| A | Next |  |\n| B | Next |  |\n`,
      );
      expect(
        checkSequenceTables(root).some((issue) =>
          issue.reason.includes('more than one Next row'),
        ),
      ).toBe(true);
    });
  });
});
