import { resolve } from 'node:path';
import { checkSequenceTables } from './sequence.ts';

const root = process.cwd();
const issues = checkSequenceTables(root);
if (issues.length === 0) {
  process.stdout.write(
    'check_sequence_tables: all sequence tables are valid.\n',
  );
} else {
  for (const issue of issues)
    process.stdout.write(
      `${resolve(root, issue.path)}:${issue.line}: ${issue.reason}\n`,
    );
  process.stderr.write(
    `check_sequence_tables: ${issues.length} violation(s) found.\n`,
  );
  process.exitCode = 1;
}
