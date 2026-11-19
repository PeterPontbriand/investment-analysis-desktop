// Reads a strategy's selection schema, as the engine serves it, into the fields
// a form shows (D189, D190, D228). The reader holds no field name of any
// strategy: labels, hints, term ids, bounds, option sets, required marks and
// starting values all come from the schema and the document's `defaults`.

export type SchemaNode = Record<string, unknown>;

// Resolves a `$ref` to the schema it names, or undefined when it cannot.
export type RefResolver = (ref: string) => SchemaNode | undefined;

const isNode = (value: unknown): value is SchemaNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

type Base = {
  // The field's name in its parent, and its path from the top of the selection.
  name: string;
  path: string[];
  // The path joined with dots: the key of the field's value and of its errors.
  key: string;
  label: string;
  // The glossary term of the field itself (`x-term`), kept for GUI.4 (D192).
  termId: string | null;
  description: string | null;
  required: boolean;
};

export type BooleanField = Base & { kind: 'boolean'; initial: boolean };

export type NumberField = Base & {
  kind: 'number';
  integer: boolean;
  min: number | null;
  max: number | null;
  exclusiveMin: number | null;
  exclusiveMax: number | null;
  initial: string;
};

export type TextField = Base & { kind: 'text'; initial: string };

export type ChoiceField = Base & {
  kind: 'choice';
  // The code set whose terms name the values: the component the set is
  // described by in the API description; null for a set written inline.
  codeSet: string | null;
  values: string[];
  initial: string;
};

export type GroupField = Base & { kind: 'group'; fields: Field[] };

// A construct the form does not support (D190).
export type UnsupportedField = Base & { kind: 'unsupported' };

export type Field =
  | BooleanField
  | NumberField
  | TextField
  | ChoiceField
  | GroupField
  | UnsupportedField;

export type ReadForm = {
  fields: Field[];
  // Whether the schema declares `as_of`; the shared "As of" field (D193)
  // supplies it, so it is never one of `fields`.
  declaresAsOf: boolean;
};

const nullType = (node: unknown): boolean =>
  isNode(node) && node.type === 'null' && Object.keys(node).length === 1;

// The resolver of a served schema: `$ref` names its own `$defs` only (D228).
export function servedResolver(root: SchemaNode): RefResolver {
  const prefix = '#/$defs/';
  return (ref) => {
    if (!ref.startsWith(prefix)) return undefined;
    const defs = root.$defs;
    const target = isNode(defs) ? defs[ref.slice(prefix.length)] : undefined;
    return isNode(target) ? target : undefined;
  };
}

// The name a `$ref` ends in: the code set of a closed set.
const refName = (ref: string): string => ref.slice(ref.lastIndexOf('/') + 1);

type Resolved = {
  node: SchemaNode;
  codeSet: string | null;
  nullable: boolean;
  // Set when the node could not be resolved into one plain schema.
  unsupported: boolean;
};

// Follows `$ref` and "this or null": the node's own annotations (title,
// description, default, `x-term`) win over those of what it points to.
function resolve(start: SchemaNode, resolveRef: RefResolver): Resolved {
  let node = start;
  let codeSet: string | null = null;
  let nullable = false;
  for (let guard = 0; guard < 8; guard += 1) {
    if (typeof node.$ref === 'string') {
      const target = resolveRef(node.$ref);
      if (target === undefined)
        return { node, codeSet, nullable, unsupported: true };
      const { $ref, ...siblings } = node;
      void $ref;
      if (codeSet === null && Array.isArray(target.enum))
        codeSet = refName(node.$ref);
      node = { ...target, ...siblings };
      continue;
    }
    if (Array.isArray(node.anyOf)) {
      const variants = node.anyOf as unknown[];
      const others = variants.filter((variant) => !nullType(variant));
      const [only] = others;
      if (
        others.length !== 1 ||
        others.length === variants.length ||
        !isNode(only)
      )
        return { node, codeSet, nullable, unsupported: true };
      nullable = true;
      const { anyOf, ...siblings } = node;
      void anyOf;
      node = { ...only, ...siblings };
      continue;
    }
    break;
  }
  return { node, codeSet, nullable, unsupported: false };
}

const numberOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

function lookup(defaults: unknown, path: string[]): unknown {
  let value = defaults;
  for (const part of path) {
    if (!isNode(value)) return undefined;
    value = value[part];
  }
  return value;
}

// The starting value: the schema's default, else the document's configured
// value for the field's path, else empty (D189, D228).
function startingValue(
  node: SchemaNode,
  defaults: unknown,
  path: string[],
): unknown {
  if (node.default !== undefined) return node.default;
  return lookup(defaults, path);
}

const asText = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

function readField(
  name: string,
  raw: unknown,
  required: boolean,
  parentPath: string[],
  defaults: unknown,
  resolveRef: RefResolver,
): Field {
  const path = [...parentPath, name];
  const empty: Base = {
    name,
    path,
    key: path.join('.'),
    label: name,
    termId: null,
    description: null,
    required,
  };
  if (!isNode(raw)) return { ...empty, kind: 'unsupported' };
  const resolved = resolve(raw, resolveRef);
  const node = resolved.node;
  const base: Base = {
    ...empty,
    label: typeof node.title === 'string' ? node.title : name,
    termId: typeof node['x-term'] === 'string' ? node['x-term'] : null,
    description:
      typeof node.description === 'string' && node.description !== ''
        ? node.description
        : null,
  };
  if (resolved.unsupported) return { ...base, kind: 'unsupported' };
  const initial = startingValue(node, defaults, path);

  if (Array.isArray(node.enum)) {
    const values = node.enum;
    if (!values.every((value) => typeof value === 'string'))
      return { ...base, kind: 'unsupported' };
    return {
      ...base,
      kind: 'choice',
      codeSet: resolved.codeSet,
      values: values as string[],
      initial: asText(initial),
    };
  }
  switch (node.type) {
    case 'boolean':
      return { ...base, kind: 'boolean', initial: initial === true };
    case 'integer':
    case 'number': {
      if (
        typeof node.exclusiveMinimum === 'boolean' ||
        typeof node.exclusiveMaximum === 'boolean'
      )
        return { ...base, kind: 'unsupported' };
      return {
        ...base,
        kind: 'number',
        integer: node.type === 'integer',
        min: numberOrNull(node.minimum),
        max: numberOrNull(node.maximum),
        exclusiveMin: numberOrNull(node.exclusiveMinimum),
        exclusiveMax: numberOrNull(node.exclusiveMaximum),
        initial: asText(initial),
      };
    }
    case 'string':
      return { ...base, kind: 'text', initial: asText(initial) };
    case 'object': {
      if (!isNode(node.properties)) return { ...base, kind: 'unsupported' };
      return {
        ...base,
        kind: 'group',
        fields: readProperties(node, path, defaults, resolveRef),
      };
    }
    default:
      return { ...base, kind: 'unsupported' };
  }
}

// An object schema's properties, in the order the schema serves them.
function readProperties(
  node: SchemaNode,
  parentPath: string[],
  defaults: unknown,
  resolveRef: RefResolver,
): Field[] {
  const properties = isNode(node.properties) ? node.properties : {};
  const required = Array.isArray(node.required)
    ? (node.required as unknown[]).filter(
        (item): item is string => typeof item === 'string',
      )
    : [];
  return Object.entries(properties).map(([name, property]) =>
    readField(
      name,
      property,
      required.includes(name),
      parentPath,
      defaults,
      resolveRef,
    ),
  );
}

// The fields of a selection schema, `as_of` left out (D228).
export function readSelectionSchema(
  schema: SchemaNode,
  defaults: unknown,
  resolveRef: RefResolver = servedResolver(schema),
): ReadForm {
  const properties = isNode(schema.properties) ? schema.properties : {};
  const root = resolve(schema, resolveRef).node;
  const all = readProperties(root, [], defaults, resolveRef);
  return {
    fields: all.filter((field) => field.name !== 'as_of'),
    declaresAsOf: Object.hasOwn(properties, 'as_of'),
  };
}

// Every field, a group's own fields after it.
export function flattenFields(fields: Field[]): Field[] {
  return fields.flatMap((field) =>
    field.kind === 'group' ? [field, ...flattenFields(field.fields)] : [field],
  );
}

export function hasRequiredUnsupported(fields: Field[]): boolean {
  return flattenFields(fields).some(
    (field) => field.kind === 'unsupported' && field.required,
  );
}
