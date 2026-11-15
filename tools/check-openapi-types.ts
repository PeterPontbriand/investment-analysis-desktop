import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateTypes } from './openapi-types.ts';

// Regenerates src/api/schema.ts from the vendored OpenAPI document and fails
// when the checked-in types differ.
const vendored = join('vendor', 'ian', 'openapi.json');
const checkedIn = join('src', 'api', 'schema.ts');

const regenerated = generateTypes(vendored);
if (regenerated === null) {
  process.stderr.write('openapi-typescript failed.\n');
  process.exitCode = 1;
} else if (
  regenerated !== readFileSync(checkedIn, 'utf8').replace(/\r\n/g, '\n')
) {
  process.stderr.write(
    `${checkedIn} differs from the types generated from ${vendored}. Regenerate it with: pnpm exec openapi-typescript ${vendored} -o ${checkedIn}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(`${checkedIn} matches ${vendored}.\n`);
}
