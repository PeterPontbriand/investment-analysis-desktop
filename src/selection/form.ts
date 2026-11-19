// What a form holds, what it sends and what it checks before sending (D189,
// D229). Pure: no message is worded here; a problem names its catalog message
// and its limit, and the caller words it in the active locale.
import { flattenFields, type Field } from './schema.ts';

// A text, number or choice field holds text; a checkbox holds a boolean.
export type FieldValue = string | boolean;
export type Values = Record<string, FieldValue>;

export function initialValues(fields: Field[]): Values {
  const values: Values = {};
  for (const field of flattenFields(fields)) {
    if (field.kind === 'boolean') values[field.key] = field.initial;
    else if (
      field.kind === 'number' ||
      field.kind === 'text' ||
      field.kind === 'choice'
    )
      values[field.key] = field.initial;
  }
  return values;
}

type Selection = Record<string, unknown>;

function build(fields: Field[], values: Values): Selection {
  const selection: Selection = {};
  for (const field of fields) {
    const value = values[field.key];
    switch (field.kind) {
      case 'boolean':
        if (typeof value === 'boolean') selection[field.name] = value;
        break;
      case 'number': {
        const text = typeof value === 'string' ? value.trim() : '';
        if (text !== '') selection[field.name] = Number(text);
        break;
      }
      case 'text':
      case 'choice':
        // Text is sent as typed; an empty optional field is left out, so the
        // engine applies its own value (D189).
        if (typeof value === 'string' && value !== '')
          selection[field.name] = value;
        break;
      case 'group': {
        const inner = build(field.fields, values);
        if (Object.keys(inner).length > 0) selection[field.name] = inner;
        break;
      }
      case 'unsupported':
        break;
    }
  }
  return selection;
}

// The `selection` of one strategy's request, without `as_of` (D193).
export function buildSelection(fields: Field[], values: Values): Selection {
  return build(fields, values);
}

export type ProblemKind =
  | 'required'
  | 'number'
  | 'whole'
  | 'greater'
  | 'least'
  | 'less'
  | 'most'
  | 'unsupported';

export type FieldProblem = { kind: ProblemKind; limit?: number };

// Checks a number's text. `bad` is the number input's own `badInput`.
export function numberProblem(
  field: Extract<Field, { kind: 'number' }>,
  text: string,
  bad: boolean,
): FieldProblem | null {
  const trimmed = text.trim();
  if (bad) return { kind: field.integer ? 'whole' : 'number' };
  if (trimmed === '') return field.required ? { kind: 'required' } : null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { kind: 'number' };
  if (field.integer && !Number.isInteger(value)) return { kind: 'whole' };
  if (field.exclusiveMin !== null && value <= field.exclusiveMin)
    return { kind: 'greater', limit: field.exclusiveMin };
  if (field.min !== null && value < field.min)
    return { kind: 'least', limit: field.min };
  if (field.exclusiveMax !== null && value >= field.exclusiveMax)
    return { kind: 'less', limit: field.exclusiveMax };
  if (field.max !== null && value > field.max)
    return { kind: 'most', limit: field.max };
  return null;
}

// The problems of the chosen strategy's fields, by field key, in field order.
// `bad` holds the keys of number inputs whose content is not a number.
export function validateFields(
  fields: Field[],
  values: Values,
  bad: ReadonlySet<string> = new Set(),
): Map<string, FieldProblem> {
  const problems = new Map<string, FieldProblem>();
  for (const field of flattenFields(fields)) {
    const value = values[field.key];
    switch (field.kind) {
      case 'number': {
        const problem = numberProblem(
          field,
          typeof value === 'string' ? value : '',
          bad.has(field.key),
        );
        if (problem) problems.set(field.key, problem);
        break;
      }
      case 'text':
      case 'choice':
        if (
          field.required &&
          (typeof value !== 'string' || value.trim() === '')
        )
          problems.set(field.key, { kind: 'required' });
        break;
      case 'unsupported':
        // Only a required field the form cannot fill blocks its strategy.
        if (field.required) problems.set(field.key, { kind: 'unsupported' });
        break;
      default:
        break;
    }
  }
  return problems;
}

// A strategy is collapsed unless a required field has no starting value
// (D194).
export function needsInput(fields: Field[]): boolean {
  return flattenFields(fields).some(
    (field) =>
      field.required &&
      (field.kind === 'number' ||
        field.kind === 'text' ||
        field.kind === 'choice') &&
      field.initial === '',
  );
}
