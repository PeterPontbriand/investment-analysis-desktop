import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { helpIndex, references } from '../fixtures/api/data.ts';

// Every code of the vendored description that the engine explains has a term in
// the references fixture, and that term is in the help index. The fixture
// follows the engine's FAILURE_REASON_CODE_TERMS, ENTRY_WARNING_CODE_TERMS and
// INSTRUMENT_KIND_TERMS, so a code the engine adds shows up here when the
// description is re-vendored (D262, D282).
const description = JSON.parse(
  readFileSync('vendor/ian/openapi.json', 'utf8'),
) as { components: { schemas: Record<string, { enum: string[] }> } };

const indexed = new Set(
  helpIndex.groups.flatMap((group) => group.terms.map((term) => term.id)),
);

describe.each(['FailureReasonCode', 'EntryWarningCode', 'InstrumentKind'])(
  '%s',
  (codeSet) => {
    const codes = description.components.schemas[codeSet]?.enum ?? [];
    const terms = references.code_sets[codeSet] ?? {};

    it('is in the vendored description', () => {
      expect(codes.length).toBeGreaterThan(0);
    });

    it('has a term for every code', () => {
      expect(codes.filter((code) => terms[code] === undefined)).toEqual([]);
    });

    it('lists only codes the description has', () => {
      expect(
        Object.keys(terms).filter((code) => !codes.includes(code)),
      ).toEqual([]);
    });

    it('has every term in the help index', () => {
      expect(Object.values(terms).filter((term) => !indexed.has(term))).toEqual(
        [],
      );
    });
  },
);
