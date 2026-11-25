import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  comparisons,
  runDetails,
  textFor,
  textModes,
} from '../fixtures/api/compare.ts';
import * as data from '../fixtures/api/data.ts';
import { lookedUp, profiles } from '../fixtures/api/profiles.ts';

// Every fixture API document is walked with its schema from the vendored API
// description, and each string with a `date` or `date-time` format must be in
// that format. A fixture that is easier to read than the engine's own output
// would hide a formatting bug (a period end is served as an instant, not a
// bare date). Only formats are checked: the types are checked by the type
// check, and a strategy's own document, which the GUI prints and never reads
// (D93), is checked only through the part every strategy shares.

type Schema = {
  $ref?: string;
  anyOf?: Schema[];
  oneOf?: Schema[];
  allOf?: Schema[];
  format?: string;
  properties?: Record<string, Schema>;
  additionalProperties?: Schema | boolean;
  items?: Schema;
  type?: string;
};
const description = JSON.parse(
  readFileSync('vendor/ian/openapi.json', 'utf8'),
) as { components: { schemas: Record<string, Schema> } };

// Whether a value is of the JSON type a schema names, so a union picks the
// branch the value belongs to.
function hasType(type: string | undefined, value: unknown): boolean {
  switch (type) {
    case undefined:
      return true;
    case 'null':
      return value === null;
    case 'string':
      return typeof value === 'string';
    case 'integer':
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return (
        typeof value === 'object' && value !== null && !Array.isArray(value)
      );
    default:
      return true;
  }
}

function resolve(schema: Schema): Schema {
  if (schema.$ref === undefined) return schema;
  const name = schema.$ref.replace('#/components/schemas/', '');
  const found = description.components.schemas[name];
  if (!found) throw new Error(`The schema ${name} is not in the description.`);
  return resolve(found);
}

const dateFormat = /^\d{4}-\d{2}-\d{2}$/;
const instantFormat =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

// The places where a string is not in its schema's format.
function violations(input: Schema, value: unknown, path: string): string[] {
  const schema = resolve(input);
  const branches = [...(schema.anyOf ?? []), ...(schema.oneOf ?? [])];
  if (branches.length > 0) {
    // A value fits a union when it fits one branch.
    const results = branches.map((branch) => violations(branch, value, path));
    return results.some((found) => found.length === 0)
      ? []
      : (results[0] ?? []);
  }
  if (!hasType(schema.type, value))
    return [`${path}: not of the type ${schema.type}`];
  const own: string[] = [];
  if (typeof value === 'string') {
    if (schema.format === 'date' && !dateFormat.test(value))
      own.push(`${path}: "${value}" is not a date (YYYY-MM-DD)`);
    if (schema.format === 'date-time' && !instantFormat.test(value))
      own.push(`${path}: "${value}" is not an instant with an offset`);
    return own;
  }
  if (Array.isArray(value) && schema.items)
    return value.flatMap((item, index) =>
      violations(schema.items!, item, `${path}[${index}]`),
    );
  if (typeof value === 'object' && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      const known = schema.properties?.[key];
      const extra =
        typeof schema.additionalProperties === 'object'
          ? schema.additionalProperties
          : undefined;
      const next = known ?? extra;
      if (next) own.push(...violations(next, item, `${path}.${key}`));
    }
  }
  return own;
}

const schemaNamed = (name: string): Schema => ({
  $ref: `#/components/schemas/${name}`,
});

const documents: [string, string, unknown][] = [
  ['info', 'InfoDocument', data.info],
  ['strategies', 'StrategiesDocument', data.strategies],
  ['helpIndex', 'HelpIndexDocument', data.helpIndex],
  ['references', 'HelpReferencesDocument', data.references],
  ['watchlists', 'WatchlistListDocument', data.watchlists],
  ...Object.entries(data.watchlistDocuments).map(
    ([id, document]): [string, string, unknown] => [
      `watchlist ${id}`,
      'WatchlistDocument',
      document,
    ],
  ),
  ...data.refreshes.map((item, index): [string, string, unknown] => [
    `refreshes[${index}]`,
    'RefreshSummaryItemDocument',
    item,
  ]),
  ...data.runs.map((item, index): [string, string, unknown] => [
    `runs[${index}]`,
    'RunSummaryDocument',
    item,
  ]),
  ...Object.entries(comparisons).map(
    ([id, document]): [string, string, unknown] => [
      `comparison ${id}`,
      'RunsCompareDocument',
      document,
    ],
  ),
  ...Object.entries(profiles).map(
    ([ticker, document]): [string, string, unknown] => [
      `profile ${ticker}`,
      'InstrumentProfileDocument',
      document,
    ],
  ),
  ['looked-up profile', 'InstrumentProfileDocument', lookedUp('BOLT')],
  ...Object.entries(runDetails).flatMap(
    ([id, detail]): [string, string, unknown][] => [
      [`overview ${id}`, 'RunOverviewDocument', detail.overview],
      // The part every strategy's document shares.
      [
        `document ${id} security identity`,
        'SecurityIdentityPart',
        (detail.document as { security_identity?: unknown } | null)
          ?.security_identity ?? {},
      ],
    ],
  ),
  ...Object.keys(runDetails).flatMap((id): [string, string, unknown][] =>
    textModes.map((mode) => [
      `text ${id} ${mode}`,
      'ReplayTextDocument',
      textFor(id, mode),
    ]),
  ),
];

describe('fixture documents', () => {
  it('has fixtures to check', () => {
    expect(documents.length).toBeGreaterThan(60);
  });

  it('recognises a bare date where an instant is required', () => {
    expect(
      violations(
        schemaNamed('CompareHeadlineDocument'),
        { cells: [], period_end: '2025-12-31' },
        'x',
      ),
    ).toHaveLength(1);
    expect(
      violations(
        schemaNamed('CompareHeadlineDocument'),
        { cells: [], period_end: '2025-12-31T00:00:00+00:00' },
        'x',
      ),
    ).toEqual([]);
  });

  it.each(documents)(
    '%s uses the formats the engine serves',
    (name, schema, document) => {
      expect(violations(schemaNamed(schema), document, name)).toEqual([]);
    },
  );
});
