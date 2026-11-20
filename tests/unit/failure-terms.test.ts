import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { helpIndex, references } from '../fixtures/api/data.ts';

// Every failure reason code the vendored description lists has a term in the
// references fixture, and that term is in the help index. The fixture follows
// the engine's FAILURE_REASON_CODE_TERMS, so a code the engine adds shows up
// here when the description is re-vendored (D262).
const description = JSON.parse(
  readFileSync('vendor/ian/openapi.json', 'utf8'),
) as { components: { schemas: { FailureReasonCode: { enum: string[] } } } };

const codes = description.components.schemas.FailureReasonCode.enum;
const terms = references.code_sets.FailureReasonCode ?? {};
const indexed = new Set(
  helpIndex.groups.flatMap((group) => group.terms.map((term) => term.id)),
);

it('has a term for every failure reason code', () => {
  expect(codes.filter((code) => terms[code] === undefined)).toEqual([]);
});

it('lists only codes the description has', () => {
  expect(Object.keys(terms).filter((code) => !codes.includes(code))).toEqual(
    [],
  );
});

it('has every term in the help index', () => {
  expect(Object.values(terms).filter((term) => !indexed.has(term))).toEqual([]);
});
