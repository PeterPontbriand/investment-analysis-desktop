// Generates the API types from a copy of IAN's OpenAPI description. The drift
// check and `pnpm vendor-ian` both call this, so they generate the same text.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cli = join('node_modules', 'openapi-typescript', 'bin', 'cli.js');

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Node = { [key: string]: Json };
export type Description = {
  paths?: Record<string, Record<string, Json>>;
  components?: { schemas?: Record<string, Node> };
};

const isNode = (value: Json | undefined): value is Node =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const schemaPrefix = '#/components/schemas/';

// The component schemas a value refers to, directly.
function refsIn(value: Json | undefined, found: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) refsIn(item, found);
  } else if (isNode(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (
        key === '$ref' &&
        typeof item === 'string' &&
        item.startsWith(schemaPrefix)
      )
        found.add(item.slice(schemaPrefix.length));
      else refsIn(item, found);
    }
  }
}

// The roots and everything they reach through `$ref`.
function reachable(
  roots: Set<string>,
  schemas: Record<string, Node>,
): Set<string> {
  const seen = new Set(roots);
  const queue = [...roots];
  for (let name = queue.pop(); name !== undefined; name = queue.pop()) {
    const next = new Set<string>();
    refsIn(schemas[name], next);
    for (const reference of next)
      if (!seen.has(reference)) {
        seen.add(reference);
        queue.push(reference);
      }
  }
  return seen;
}

// Removes `default` from every property that is not required, in a schema and
// the object schemas written inside it; returns whether one was removed.
function removeDefaults(node: Json): boolean {
  let removed = false;
  if (Array.isArray(node)) {
    for (const item of node) removed = removeDefaults(item) || removed;
  } else if (isNode(node)) {
    const properties = node.properties;
    if (isNode(properties)) {
      const required = Array.isArray(node.required) ? node.required : [];
      for (const [name, property] of Object.entries(properties))
        if (
          isNode(property) &&
          'default' in property &&
          !required.includes(name)
        ) {
          delete property.default;
          removed = true;
        }
    }
    for (const [key, item] of Object.entries(node))
      if (key !== 'default') removed = removeDefaults(item) || removed;
  }
  return removed;
}

// A request body field with a default is one a client may leave out, so it is
// optional in the types of a request body, though a response always has it,
// which is how openapi-typescript reads a default (D261). Returns a copy of the
// description in which each schema reachable only from request bodies has lost
// the defaults of its optional properties. A schema with such a default that
// is reachable from a request body and from anything else is an error: the
// rule cannot apply to it, and nothing is guessed.
export function withRequestDefaultsOptional(
  description: Description,
): Description {
  const copy = structuredClone(description);
  const schemas = copy.components?.schemas ?? {};
  const requestRoots = new Set<string>();
  const otherRoots = new Set<string>();
  for (const item of Object.values(copy.paths ?? {}))
    for (const operation of Object.values(item))
      if (isNode(operation))
        for (const [key, part] of Object.entries(operation))
          refsIn(part, key === 'requestBody' ? requestRoots : otherRoots);
  const inRequest = reachable(requestRoots, schemas);
  const elsewhere = reachable(otherRoots, schemas);
  for (const name of [...inRequest].sort()) {
    const schema = schemas[name];
    if (schema === undefined) continue;
    const trial = structuredClone(schema);
    if (!removeDefaults(trial)) continue;
    if (elsewhere.has(name))
      throw new Error(
        `The schema ${name} has a property with a default and is used by a request body and by something else, so the request-only rule cannot apply to it.`,
      );
    schemas[name] = trial;
  }
  return copy;
}

// The generated TypeScript for the OpenAPI file at `source`, with Unix line
// endings, or null when the description cannot be prepared or
// openapi-typescript fails. The file at `source` is never changed.
export function generateTypes(source: string): string | null {
  const directory = mkdtempSync(join(tmpdir(), 'iad-openapi-'));
  try {
    const prepared = join(directory, 'openapi.json');
    try {
      const description = JSON.parse(
        readFileSync(source, 'utf8'),
      ) as Description;
      writeFileSync(
        prepared,
        JSON.stringify(withRequestDefaultsOptional(description)),
      );
    } catch (error) {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`,
      );
      return null;
    }
    const output = join(directory, 'schema.ts');
    const result = spawnSync(process.execPath, [cli, prepared, '-o', output], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    if (result.status !== 0) return null;
    return readFileSync(output, 'utf8').replace(/\r\n/g, '\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
