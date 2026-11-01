import { resolve } from 'node:path';
import { checkMarkdownLinks } from './docs/markdown.ts';

const root = process.cwd();
const issues = checkMarkdownLinks(root);
if (issues.length === 0) {
  process.stdout.write(
    'check_doc_links: no broken local links or anchors and no Mermaid blocks found.\n',
  );
} else {
  for (const issue of issues)
    process.stdout.write(
      `${resolve(root, issue.path)}:${issue.line}: ${issue.reason}\n`,
    );
  process.stderr.write(
    `check_doc_links: ${issues.length} violation(s) found.\n`,
  );
  process.exitCode = 1;
}
