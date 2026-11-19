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

const tickerParameter = /^tickers(\[\d+\])?$/;

// The target a request parameter names, or null when it names none the form
// shows (D230).
export function targetOf(
  parameter: string,
  strategy: StrategyFields,
): string | null {
  if (tickerParameter.test(parameter)) return tickersTarget;
  if (!parameter.startsWith('selection.')) return null;
  const path = parameter.slice('selection.'.length);
  if (path === 'as_of') return asOfTarget;
  const found = flattenFields(strategy.fields).find(
    (field) => field.key === path,
  );
  return found ? fieldTarget(strategy.method, found.key) : null;
}

// Places the rule errors of one strategy's failed request. `labels` words a
// target's label, for a template's parameter placeholder.
export function placeRuleErrors(
  errors: RuleError[],
  strategy: StrategyFields,
  order: string[],
  labelOf: (target: string) => string | undefined,
  locale: string,
  idPrefix: string,
): Problem[] {
  return errors.map((error, index) => {
    const targets = error.parameters.map((parameter) =>
      targetOf(parameter, strategy),
    );
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

export const messagesAt = (problems: Problem[], target: string): Problem[] =>
  problems.filter((problem) => problem.shownAt === target);

// The ids of the messages that name a target, for `aria-describedby`.
export const describedBy = (problems: Problem[], target: string): string[] =>
  problems
    .filter((problem) => problem.named.includes(target))
    .map((problem) => problem.id);
