// Where a message shows on the form, and which fields it names (D230). A
// target is a string: "tickers", "asOf", or "field:<method>:<key>" for a
// field of one strategy's options. Targets are listed in form order.
import type { RuleError } from './templates.ts';
import { fillTemplate } from './templates.ts';
import type { Field } from './schema.ts';
import { flattenFields } from './schema.ts';

export const tickersTarget = 'tickers';
export const asOfTarget = 'asOf';
export const fieldTarget = (method: string, key: string): string =>
  `field:${method}:${key}`;

export type Problem = {
  id: string;
  text: string;
  // Where the message shows: the first target it names in form order, or null
  // for above "Add".
  shownAt: string | null;
  // Every target the message names; each is invalid and described by it.
  named: string[];
};

export type StrategyFields = { method: string; fields: Field[] };

// The form order of the targets of the strategies shown, in the order given.
export function targetOrder(strategies: StrategyFields[]): string[] {
  return [
    tickersTarget,
    asOfTarget,
    ...strategies.flatMap(({ method, fields }) =>
      flattenFields(fields).map((field) => fieldTarget(method, field.key)),
    ),
  ];
}

// How a request spells the parameters the form shows: the prefix of a
// selection field's path and the form of a ticker's (D272).
export type ParameterForm = { selection: string; ticker: RegExp };

// The request that adds tickers to a watchlist under one strategy.
export const addEntriesForm: ParameterForm = {
  selection: 'selection.',
  ticker: /^tickers(\[\d+\])?$/,
};

const entryTicker = /^entries\[\d+\]\.ticker$/;

// The refresh of entries, for its i-th entry (D272).
export const entryForm = (index: number): ParameterForm => ({
  selection: `entries[${index}].selection.`,
  ticker: entryTicker,
});

// The target a request parameter names, or null when it names none the form
// shows (D230).
export function targetOf(
  parameter: string,
  strategy: StrategyFields,
  form: ParameterForm = addEntriesForm,
): string | null {
  if (form.ticker.test(parameter)) return tickersTarget;
  if (!parameter.startsWith(form.selection)) return null;
  const path = parameter.slice(form.selection.length);
  if (path === 'as_of') return asOfTarget;
  const found = flattenFields(strategy.fields).find(
    (field) => field.key === path,
  );
  return found ? fieldTarget(strategy.method, found.key) : null;
}

// The target a parameter of the refresh of entries names. `entries[i]` is the
// i-th chosen strategy, in the engine's strategy order (D272).
export function entryTargetOf(
  parameter: string,
  strategies: StrategyFields[],
): string | null {
  if (entryTicker.test(parameter)) return tickersTarget;
  const match = /^entries\[(\d+)\]\./.exec(parameter);
  if (match === null) return null;
  const index = Number(match[1]);
  const strategy = strategies[index];
  return strategy === undefined
    ? null
    : targetOf(parameter, strategy, entryForm(index));
}

// Places rule errors. `targetFor` says which target a request parameter names;
// `labelOf` words a target's label, for a template's parameter placeholder.
function placeErrors(
  errors: RuleError[],
  targetFor: (parameter: string) => string | null,
  order: string[],
  labelOf: (target: string) => string | undefined,
  locale: string,
  idPrefix: string,
): Problem[] {
  return errors.map((error, index) => {
    const targets = error.parameters.map((parameter) => targetFor(parameter));
    const named = [
      ...new Set(targets.filter((target): target is string => target !== null)),
    ].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const byParameter = new Map(
      error.parameters.map((parameter, i) => [parameter, targets[i]]),
    );
    const text = fillTemplate(
      error,
      (parameter) => {
        const target = byParameter.get(parameter);
        return target === null || target === undefined
          ? undefined
          : labelOf(target);
      },
      locale,
    );
    return {
      id: `${idPrefix}-${index}`,
      text,
      shownAt: named[0] ?? null,
      named,
    };
  });
}

// The rule errors of one strategy's failed request to add entries.
export function placeRuleErrors(
  errors: RuleError[],
  strategy: StrategyFields,
  order: string[],
  labelOf: (target: string) => string | undefined,
  locale: string,
  idPrefix: string,
): Problem[] {
  return placeErrors(
    errors,
    (parameter) => targetOf(parameter, strategy),
    order,
    labelOf,
    locale,
    idPrefix,
  );
}

// The rule errors of a failed refresh of entries, one entry for each chosen
// strategy (D272).
export function placeEntryErrors(
  errors: RuleError[],
  strategies: StrategyFields[],
  order: string[],
  labelOf: (target: string) => string | undefined,
  locale: string,
  idPrefix: string,
): Problem[] {
  return placeErrors(
    errors,
    (parameter) => entryTargetOf(parameter, strategies),
    order,
    labelOf,
    locale,
    idPrefix,
  );
}

export const messagesAt = (problems: Problem[], target: string): Problem[] =>
  problems.filter((problem) => problem.shownAt === target);

// The ids of the messages that name a target, for `aria-describedby`.
export const describedBy = (problems: Problem[], target: string): string[] =>
  problems
    .filter((problem) => problem.named.includes(target))
    .map((problem) => problem.id);
