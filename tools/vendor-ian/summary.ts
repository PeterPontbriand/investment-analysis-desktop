// What changed between two copies of IAN's OpenAPI description: operations and
// component schemas, computed from the two documents and nothing else.

export type Changes = { added: string[]; removed: string[]; changed: string[] };
export type Summary = { operations: Changes; schemas: Changes };

const methods = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
];

type Json = unknown;
type Document = {
  paths?: Record<string, Record<string, Json>>;
  components?: { schemas?: Record<string, Json> };
};

// JSON text with object keys sorted, so two equal values give equal text.
function canonical(value: Json): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object' && value !== null)
    return `{${Object.entries(value as Record<string, Json>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

function operations(document: Document): Map<string, string> {
  const found = new Map<string, string>();
  for (const [path, item] of Object.entries(document.paths ?? {}))
    for (const method of methods)
      if (item[method] !== undefined)
        found.set(`${method.toUpperCase()} ${path}`, canonical(item[method]));
  return found;
}

function schemas(document: Document): Map<string, string> {
  return new Map(
    Object.entries(document.components?.schemas ?? {}).map(([name, value]) => [
      name,
      canonical(value),
    ]),
  );
}

function compare(before: Map<string, string>, after: Map<string, string>) {
  const sorted = (names: string[]) => names.sort();
  return {
    added: sorted([...after.keys()].filter((name) => !before.has(name))),
    removed: sorted([...before.keys()].filter((name) => !after.has(name))),
    changed: sorted(
      [...after.keys()].filter(
        (name) => before.has(name) && before.get(name) !== after.get(name),
      ),
    ),
  };
}

export function summarize(before: Document, after: Document): Summary {
  return {
    operations: compare(operations(before), operations(after)),
    schemas: compare(schemas(before), schemas(after)),
  };
}

export function formatSummary(summary: Summary): string[] {
  const lines: string[] = [];
  for (const [title, changes] of [
    ['Operations', summary.operations],
    ['Component schemas', summary.schemas],
  ] as const)
    for (const kind of ['added', 'removed', 'changed'] as const) {
      const names = changes[kind];
      lines.push(
        names.length === 0
          ? `${title} ${kind}: none`
          : `${title} ${kind} (${names.length}):`,
        ...names.map((name) => `  ${name}`),
      );
    }
  return lines;
}
