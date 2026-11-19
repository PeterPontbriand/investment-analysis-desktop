import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  flattenFields,
  hasRequiredUnsupported,
  readSelectionSchema,
  type Field,
  type SchemaNode,
} from '../../src/selection/schema.ts';
import * as selection from '../fixtures/api/selection.ts';

type Description = {
  components: { schemas: Record<string, SchemaNode> };
};
const description = JSON.parse(
  readFileSync('vendor/ian/openapi.json', 'utf8'),
) as Description;
const components = description.components.schemas;

// The vendored description names a schema `#/components/schemas/<name>`; the
// engine serves the same schema with its own `$defs` (D228).
const resolveComponent = (ref: string): SchemaNode | undefined =>
  ref.startsWith('#/components/schemas/')
    ? components[ref.slice('#/components/schemas/'.length)]
    : undefined;

const names = (fields: Field[]) => fields.map((field) => field.name);
const served = (document: { schema: unknown; defaults: unknown }) =>
  readSelectionSchema(document.schema as SchemaNode, document.defaults);

describe('the vendored selection schemas', () => {
  const form = components.SelectionFormDocument as {
    properties: { schema: { anyOf: { $ref: string }[] } };
  };
  const refs = form.properties.schema.anyOf.map((entry) => entry.$ref);

  it('lists the five strategies the engine declares', () => {
    expect(refs).toHaveLength(5);
  });

  it.each(refs)('%s uses only constructs the form supports', (ref) => {
    const read = readSelectionSchema(
      resolveComponent(ref) ?? {},
      {},
      resolveComponent,
    );
    const fields = flattenFields(read.fields);
    // as_of is the shared "As of" field: exempt from the walk (D228).
    expect(read.declaresAsOf).toBe(true);
    expect(names(fields)).not.toContain('as_of');
    expect(fields.length).toBeGreaterThan(0);
    for (const field of fields) {
      expect(field.kind, `${ref} ${field.key}`).not.toBe('unsupported');
      // The engine's label and term come with every field (D189, D192).
      expect(field.label, `${ref} ${field.key} label`).not.toBe(field.name);
      expect(field.termId, `${ref} ${field.key} term`).not.toBeNull();
      if (field.kind === 'choice') {
        expect(field.codeSet, `${ref} ${field.key} code set`).not.toBeNull();
        expect(
          components[field.codeSet ?? ''],
          field.codeSet ?? '',
        ).toBeTruthy();
        expect(field.values.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('reading a served selection schema', () => {
  it('keeps the field order the engine serves, never sorted', () => {
    expect(names(served(selection.grahamGrowthForm).fields)).toEqual([
      'eps_basis',
      'eps_override',
      'quote_override',
      'expected_growth',
      'aaa_yield_override',
      'use_cache',
    ]);
    expect(names(served(selection.momentumForm).fields)).toEqual([
      'short_window',
      'long_window',
      'rsi_period',
      'use_cache',
    ]);
  });

  it('leaves as_of out and says whether the schema declares it', () => {
    expect(served(selection.piotroskiForm).declaresAsOf).toBe(true);
    expect(
      served({
        schema: { properties: { use_cache: { type: 'boolean' } } },
        defaults: {},
      }).declaresAsOf,
    ).toBe(false);
  });

  it('reads labels, hints, terms, bounds and required from the schema', () => {
    const [basis, , , growth, yieldField] = served(
      selection.grahamGrowthForm,
    ).fields;
    expect(growth).toMatchObject({
      kind: 'number',
      label: 'Expected growth rate',
      termId: 'expected-growth-rate',
      description: 'Expected annual earnings growth, in percentage points.',
      required: true,
      integer: false,
      initial: '',
    });
    expect(yieldField).toMatchObject({
      required: true,
      label: 'AAA corporate bond yield',
    });
    expect(basis).toMatchObject({
      kind: 'choice',
      codeSet: 'GrahamGrowthSelectionEPSBasis',
      values: ['three_year_average', 'fiscal_year'],
      initial: 'three_year_average',
      required: false,
    });
  });

  it('reads whole numbers with an exclusive bound and the configured value', () => {
    const [short] = served(selection.momentumForm).fields;
    expect(short).toMatchObject({
      kind: 'number',
      integer: true,
      exclusiveMin: 0,
      min: null,
      initial: '50',
      required: false,
    });
  });

  it('reads a nested group, its fields and a configured value under the group', () => {
    const fcf = served(selection.fcfGrowthForm);
    const policy = fcf.fields[0];
    expect(policy).toMatchObject({ kind: 'group', label: 'Growth policy' });
    if (policy?.kind !== 'group') throw new Error('not a group');
    expect(policy.fields.map((field) => field.key)).toEqual([
      'policy.historical_horizon',
      'policy.classification_basis',
      'policy.forward_policy',
    ]);
    expect(policy.fields[0]).toMatchObject({
      kind: 'choice',
      codeSet: 'HistoricalHorizon',
      values: ['longest_available', '3', '4', '5'],
      initial: 'longest_available',
    });
    const made = served(selection.madeUpForm);
    const limits = made.fields.find((field) => field.name === 'limits');
    if (limits?.kind !== 'group') throw new Error('not a group');
    // `defaults` is read by the field's path.
    expect(limits.fields[0]).toMatchObject({
      key: 'limits.ceiling',
      initial: '80',
      required: true,
      max: 99,
      exclusiveMax: 100,
    });
  });

  it('reads every supported construct of the made-up strategy', () => {
    const fields = served(selection.madeUpForm).fields;
    const byName = Object.fromEntries(
      fields.map((field) => [field.name, field]),
    );
    expect(byName.min_score).toMatchObject({
      kind: 'number',
      integer: true,
      min: 1,
      max: 9,
    });
    expect(byName.weight).toMatchObject({
      kind: 'number',
      required: true,
      exclusiveMin: 0,
    });
    expect(byName.tilt).toMatchObject({
      kind: 'choice',
      codeSet: 'Tilt',
      initial: 'value',
    });
    expect(byName.sector).toMatchObject({
      kind: 'choice',
      codeSet: null,
      values: ['energy', 'health'],
      initial: '',
    });
    expect(byName.target).toMatchObject({
      kind: 'number',
      required: false,
      initial: '',
    });
    expect(byName.strict).toMatchObject({ kind: 'boolean', initial: false });
    expect(byName.use_cache).toMatchObject({ kind: 'boolean', initial: true });
    expect(fields.some((field) => field.kind === 'unsupported')).toBe(false);
  });

  it('marks an array as unsupported, and only a required one blocks', () => {
    const required = served(selection.unsupportedForm);
    expect(required.fields[0]).toMatchObject({
      kind: 'unsupported',
      required: true,
    });
    expect(hasRequiredUnsupported(required.fields)).toBe(true);
    const optional = served(selection.unsupportedOptionalForm);
    expect(optional.fields[0]).toMatchObject({
      kind: 'unsupported',
      required: false,
    });
    expect(hasRequiredUnsupported(optional.fields)).toBe(false);
  });

  it('marks a reference outside its own $defs, an unknown type and "one of several" as unsupported', () => {
    const read = readSelectionSchema(
      {
        properties: {
          outside: { $ref: '#/components/schemas/X', title: 'Outside' },
          either: {
            anyOf: [{ type: 'string' }, { type: 'number' }],
            title: 'Either',
          },
          mixed: { enum: [1, 2], title: 'Mixed' },
          bounded: { type: 'number', exclusiveMinimum: true, title: 'Bounded' },
          nothing: { title: 'Nothing' },
        },
      },
      {},
    );
    expect(read.fields.map((field) => field.kind)).toEqual([
      'unsupported',
      'unsupported',
      'unsupported',
      'unsupported',
      'unsupported',
    ]);
  });

  it('lets a field own its title over the schema it points to', () => {
    const read = readSelectionSchema(
      {
        $defs: { Pick: { enum: ['a'], title: 'Pick', type: 'string' } },
        properties: { chosen: { $ref: '#/$defs/Pick', title: 'Chosen one' } },
      },
      {},
    );
    expect(read.fields[0]).toMatchObject({
      label: 'Chosen one',
      codeSet: 'Pick',
    });
  });
});
