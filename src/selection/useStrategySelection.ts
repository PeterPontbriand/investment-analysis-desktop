/* global HTMLElement, setTimeout -- DOM types; src/ configures no browser globals */
import { computed, nextTick, ref, useId, watch } from 'vue';
import { ApiError } from '../api/client.ts';
import type { ResolvedName } from '../api/terms.ts';
import { useMessages } from '../i18n/index.ts';
import {
  buildSelection,
  initialValues,
  needsInputNow,
  validateFields,
  type FieldProblem,
  type FieldValue,
  type Values,
} from './form.ts';
import { formatPlainNumber } from './format.ts';
import {
  describedBy,
  fieldTarget,
  messagesAt,
  placeEntryErrors,
  placeRuleErrors,
  targetOrder,
  type Problem,
  type StrategyFields,
} from './problems.ts';
import { flattenFields } from './schema.ts';
import type { RuleError } from './templates.ts';
import { useSelectionForms } from './useSelectionForms.ts';

export type StrategyChoice = { method: string; name: ResolvedName };
export type ChosenStrategy = StrategyFields & { name: string };

// Which request an engine failure answers, which decides where each error
// parameter goes (D230, D272): the request that adds a ticker list under one
// strategy, or the refresh of one entry for each chosen strategy.
export type RequestShape = 'watchlistEntries' | 'refreshEntries';

// Whether a failure is one whose errors the fields show.
export function isFieldFailure(failure: unknown): failure is ApiError {
  return (
    failure instanceof ApiError &&
    failure.reasonCode === 'invalid_parameter' &&
    failure.errors !== null &&
    failure.errors.length > 0
  );
}

// What "Add entries" and "Analyze a ticker" share (D275): the strategies the
// user chooses, their options and values, the rule of D240 that opens them,
// what is checked before sending, where an engine failure is shown, and where
// focus goes. `ownLabel` words the targets that are not a strategy's field
// (the ticker field and "As of").
export function useStrategySelection(options: {
  strategies: () => StrategyChoice[];
  ownLabel: (target: string) => string | undefined;
  strategyRequired: () => string;
}) {
  const { t, locale } = useMessages();
  const base = useId();
  const formElement = ref<HTMLElement | null>(null);
  const asOf = ref('');
  const chosen = ref(new Set<string>());
  const expanded = ref(new Set<string>());
  const values = ref<Record<string, Values>>({});
  // Number inputs whose content is not a number, as "method:key".
  const bad = new Set<string>();
  const problems = ref<Problem[]>([]);

  const selectionForms = useSelectionForms();
  const forms = selectionForms.forms;

  watch(
    options.strategies,
    (list) => {
      for (const strategy of list) void selectionForms.load(strategy.method);
    },
    { immediate: true },
  );

  // A strategy's values start from its form once it has loaded. A strategy
  // chosen while its form was loading opens its options now, by the rule of
  // D240, if it is still chosen.
  const openWhenReady = new Set<string>();

  function openIfRequiredEmpty(method: string): void {
    const form = forms.value[method];
    if (form?.kind !== 'ready') return;
    if (needsInputNow(form.form.fields, values.value[method] ?? {}))
      expanded.value.add(method);
  }

  watch(
    forms,
    (loaded) => {
      for (const [method, form] of Object.entries(loaded)) {
        if (form.kind !== 'ready') continue;
        if (values.value[method] === undefined)
          values.value[method] = initialValues(form.form.fields);
        if (openWhenReady.delete(method) && chosen.value.has(method))
          openIfRequiredEmpty(method);
      }
    },
    { immediate: true },
  );

  function fieldsOf(method: string) {
    const form = forms.value[method];
    return form?.kind === 'ready' ? form.form.fields : [];
  }

  const declaresAsOf = (method: string): boolean => {
    const form = forms.value[method];
    return form?.kind === 'ready' && form.form.declaresAsOf;
  };

  // Choosing a strategy shows its options when a required option has no value
  // now; unchecking hides them and keeps the values (D240). Focus never moves.
  function choose(method: string, on: boolean): void {
    if (!on) {
      chosen.value.delete(method);
      expanded.value.delete(method);
      openWhenReady.delete(method);
      return;
    }
    chosen.value.add(method);
    if (forms.value[method]?.kind === 'ready') openIfRequiredEmpty(method);
    else openWhenReady.add(method);
  }

  function toggle(method: string): void {
    if (expanded.value.has(method)) expanded.value.delete(method);
    else expanded.value.add(method);
  }

  function update(
    method: string,
    key: string,
    value: FieldValue,
    isBad: boolean,
  ): void {
    const current = values.value[method];
    if (current !== undefined) current[key] = value;
    if (isBad) bad.add(`${method}:${key}`);
    else bad.delete(`${method}:${key}`);
  }

  // The chosen strategies in the engine's strategy order.
  function chosenStrategies(): ChosenStrategy[] {
    return options
      .strategies()
      .filter((strategy) => chosen.value.has(strategy.method))
      .map((strategy) => ({
        method: strategy.method,
        name: strategy.name.text,
        fields: fieldsOf(strategy.method),
      }));
  }

  // The `selection` one chosen strategy sends, with the shared "As of" (D193).
  function selectionOf(strategy: StrategyFields): Record<string, unknown> {
    return {
      ...buildSelection(strategy.fields, values.value[strategy.method] ?? {}),
      ...(asOf.value !== '' && declaresAsOf(strategy.method)
        ? { as_of: asOf.value }
        : {}),
    };
  }

  let counter = 0;
  const newId = (): string => `${base}-problem-${(counter += 1)}`;

  // A message of the form's own, shown at a target or above the button.
  function problem(text: string, shownAt: string | null): Problem {
    return {
      id: newId(),
      text,
      shownAt,
      named: shownAt === null ? [] : [shownAt],
    };
  }

  function problemText(found: FieldProblem): string {
    const limit =
      found.limit === undefined
        ? undefined
        : formatPlainNumber(locale.value, found.limit);
    return t(
      `selection.errors.${found.kind === 'unsupported' ? 'required' : found.kind}`,
      limit === undefined ? {} : { limit },
    );
  }

  function expandFor(targets: string[]): void {
    for (const target of targets) {
      const [kind, method] = target.split(':');
      if (kind === 'field' && method !== undefined) expanded.value.add(method);
    }
  }

  async function focusFirst(order: string[], found: Problem[]): Promise<void> {
    const invalid = new Set(found.flatMap((item) => item.named));
    const first = order.find((target) => invalid.has(target));
    if (first === undefined) return;
    // The field may still be opening: its options show once the names of a
    // closed set have arrived.
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await nextTick();
      const element = formElement.value?.querySelector<HTMLElement>(
        `[data-target="${first}"]`,
      );
      if (element) {
        element.focus();
        return;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
    }
  }

  // What the schema alone decides, before anything is sent (D229). `own` holds
  // the form's own problems, which come first.
  function check(
    list: ChosenStrategy[],
    own: Problem[],
  ): { found: Problem[]; blocked: boolean } {
    const found: Problem[] = [...own];
    let blocked = false;
    if (list.length === 0)
      found.push(problem(options.strategyRequired(), null));
    for (const strategy of list) {
      const form = forms.value[strategy.method];
      if (form?.kind !== 'ready') {
        blocked = true;
        expanded.value.add(strategy.method);
        continue;
      }
      const current = values.value[strategy.method] ?? {};
      const badKeys = new Set(
        [...bad]
          .filter((entry) => entry.startsWith(`${strategy.method}:`))
          .map((entry) => entry.slice(strategy.method.length + 1)),
      );
      for (const [key, fieldProblem] of validateFields(
        strategy.fields,
        current,
        badKeys,
      )) {
        const target = fieldTarget(strategy.method, key);
        if (fieldProblem.kind === 'unsupported') {
          // The field shows its own message; the strategy cannot be sent.
          blocked = true;
          expanded.value.add(strategy.method);
          continue;
        }
        found.push(problem(problemText(fieldProblem), target));
      }
    }
    return { found, blocked };
  }

  // Shows what is wrong and moves focus to the first field with a problem.
  // Returns true when something is wrong, so nothing is sent.
  async function stopIfInvalid(
    list: ChosenStrategy[],
    own: Problem[],
  ): Promise<boolean> {
    const { found, blocked } = check(list, own);
    if (found.length === 0 && !blocked) return false;
    problems.value = found;
    expandFor(found.flatMap((item) => item.named));
    await focusFirst(targetOrder(list), found);
    return true;
  }

  function labelOf(list: StrategyFields[], target: string): string | undefined {
    const own = options.ownLabel(target);
    if (own !== undefined) return own;
    const [, method, ...rest] = target.split(':');
    const key = rest.join(':');
    const strategy = list.find((item) => item.method === method);
    if (strategy === undefined) return undefined;
    return flattenFields(strategy.fields).find((field) => field.key === key)
      ?.label;
  }

  // An engine failure that lists errors: each goes to the field it names
  // (D230, D272), and the options holding one open. Any other failure is not
  // placed here.
  async function placeFailure(
    failure: unknown,
    list: ChosenStrategy[],
    shape: RequestShape,
  ): Promise<void> {
    if (!isFieldFailure(failure) || failure.errors === null) return;
    const errors = failure.errors as RuleError[];
    const order = targetOrder(list);
    const placed =
      shape === 'watchlistEntries' && list[0] !== undefined
        ? placeRuleErrors(
            errors,
            list[0],
            order,
            (target) => labelOf(list, target),
            locale.value,
            newId(),
          )
        : placeEntryErrors(
            errors,
            list,
            order,
            (target) => labelOf(list, target),
            locale.value,
            newId(),
          );
    problems.value = placed;
    expandFor(placed.flatMap((item) => item.named));
    await focusFirst(order, placed);
  }

  const describe = (target: string): string | undefined => {
    const ids = [...describedBy(problems.value, target)];
    return ids.length > 0 ? ids.join(' ') : undefined;
  };

  const aboveButton = computed(() =>
    problems.value.filter((item) => item.shownAt === null),
  );

  return {
    base,
    formElement,
    asOf,
    chosen,
    expanded,
    values,
    problems,
    forms,
    selectionForms,
    choose,
    toggle,
    update,
    chosenStrategies,
    selectionOf,
    problem,
    stopIfInvalid,
    placeFailure,
    describe,
    aboveButton,
    messagesAt: (target: string) => messagesAt(problems.value, target),
    clearProblems: () => {
      problems.value = [];
    },
  };
}
