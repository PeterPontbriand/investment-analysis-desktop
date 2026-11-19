<script setup lang="ts">
/* global HTMLElement, setTimeout -- DOM types; src/ configures no browser globals */
import { computed, nextTick, ref, useId, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '../api/client.ts';
import { useEngine } from '../api/engine.ts';
import { useScreenData } from '../api/useScreenData.ts';
import ActionFailure from '../components/ActionFailure.vue';
import AppBreadcrumb from '../components/AppBreadcrumb.vue';
import ScreenState from '../components/ScreenState.vue';
import { useAction } from '../composables/useAction.ts';
import { leaveNotice } from '../composables/useNotice.ts';
import { useMessages } from '../i18n/index.ts';
import {
  buildSelection,
  initialValues,
  needsInputNow,
  validateFields,
  type FieldProblem,
  type FieldValue,
  type Values,
} from '../selection/form.ts';
import { formatConjunction, formatPlainNumber } from '../selection/format.ts';
import {
  asOfTarget,
  describedBy,
  fieldTarget,
  messagesAt,
  placeRuleErrors,
  targetOrder,
  tickersTarget,
  type Problem,
  type StrategyFields,
} from '../selection/problems.ts';
import { flattenFields } from '../selection/schema.ts';
import StrategyChooser from '../selection/StrategyChooser.vue';
import { splitTickers } from '../selection/tickers.ts';
import type { RuleError } from '../selection/templates.ts';
import { useSelectionForms } from '../selection/useSelectionForms.ts';
import { addEntriesCrumbs } from './navigation.ts';

// Add entries (D227): tickers, one shared as-of date and the strategies to
// add them under. One request is sent for each chosen strategy, in the
// engine's strategy order (D194, D231).
const { t, plural, locale } = useMessages();
const route = useRoute();
const router = useRouter();
const engine = useEngine();
const watchlistId = computed(() => String(route.params.watchlistId));

const { state, reload } = useScreenData(
  async (client) => {
    const watchlist = (
      await client.get('/v1/watchlists/{watchlist_id}', {
        path: { watchlist_id: watchlistId.value },
      })
    ).data;
    return { watchlist, strategies: await engine.terms.strategies() };
  },
  ['strategies', 'references', 'help'],
  [watchlistId],
);

const crumbs = computed(() =>
  addEntriesCrumbs(
    t('nav.watchlists'),
    state.value.kind === 'ready'
      ? {
          id: watchlistId.value,
          name: state.value.data.watchlist.display_name,
        }
      : null,
  ),
);

const base = useId();
const formElement = ref<HTMLElement | null>(null);
const tickersText = ref('');
const asOf = ref('');
const chosen = ref(new Set<string>());
const expanded = ref(new Set<string>());
const values = ref<Record<string, Values>>({});
// Number inputs whose content is not a number, as "method:key".
const bad = new Set<string>();
const problems = ref<Problem[]>([]);
const partial = ref<{ count: number; names: string[] } | null>(null);

// The entry count when the form loaded and in the engine's latest answer.
let loadedCount = 0;
let lastCount = 0;
let loadedFor: string | null = null;

const selectionForms = useSelectionForms();
const forms = selectionForms.forms;

watch(
  state,
  (current) => {
    if (current.kind !== 'ready') return;
    if (loadedFor !== watchlistId.value) {
      loadedFor = watchlistId.value;
      loadedCount = lastCount = current.data.watchlist.entries.length;
    }
    for (const strategy of current.data.strategies)
      void selectionForms.load(strategy.method);
  },
  { immediate: true },
);

// A strategy's values start from its form once it has loaded. A strategy
// chosen while its form was loading opens its options now, by the rule of
// D238, if it is still chosen.
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

const strategies = computed(() =>
  state.value.kind === 'ready' ? state.value.data.strategies : [],
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
// now; unchecking hides them and keeps the values (D238). Focus never moves.
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

const action = useAction();
const adding = ref(false);
let counter = 0;
const newId = (): string => `${base}-problem-${(counter += 1)}`;

function problemText(problem: FieldProblem): string {
  const limit =
    problem.limit === undefined
      ? undefined
      : formatPlainNumber(locale.value, problem.limit);
  return t(
    `selection.errors.${problem.kind === 'unsupported' ? 'required' : problem.kind}`,
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
  const invalid = new Set(found.flatMap((problem) => problem.named));
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

// What the schema alone decides, before anything is sent (D229).
function checkBeforeSending(chosenList: StrategyFields[]): {
  found: Problem[];
  blocked: boolean;
} {
  const found: Problem[] = [];
  let blocked = false;
  const tickers = splitTickers(tickersText.value);
  if (tickers.length === 0)
    found.push({
      id: newId(),
      text: t('addEntries.errors.tickersRequired'),
      shownAt: tickersTarget,
      named: [tickersTarget],
    });
  if (chosenList.length === 0)
    found.push({
      id: newId(),
      text: t('addEntries.errors.strategyRequired'),
      shownAt: null,
      named: [],
    });
  for (const strategy of chosenList) {
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
    for (const [key, problem] of validateFields(
      strategy.fields,
      current,
      badKeys,
    )) {
      const target = fieldTarget(strategy.method, key);
      if (problem.kind === 'unsupported') {
        // The field shows its own message; the strategy cannot be added.
        blocked = true;
        expanded.value.add(strategy.method);
        continue;
      }
      found.push({
        id: newId(),
        text: problemText(problem),
        shownAt: target,
        named: [target],
      });
    }
  }
  return { found, blocked };
}

function labelOf(strategy: StrategyFields, target: string): string | undefined {
  if (target === tickersTarget) return t('addEntries.tickers');
  if (target === asOfTarget) return t('addEntries.asOf');
  const key = target.split(':').slice(2).join(':');
  return flattenFields(strategy.fields).find((field) => field.key === key)
    ?.label;
}

async function submit(): Promise<void> {
  if (adding.value || state.value.kind !== 'ready') return;
  problems.value = [];
  partial.value = null;
  action.clear();
  const ready = state.value.data;
  const chosenList: (StrategyFields & { name: string })[] = ready.strategies
    .filter((strategy) => chosen.value.has(strategy.method))
    .map((strategy) => ({
      method: strategy.method,
      name: strategy.name.text,
      fields: fieldsOf(strategy.method),
    }));
  const { found, blocked } = checkBeforeSending(chosenList);
  if (found.length > 0 || blocked) {
    problems.value = found;
    const order = targetOrder(chosenList);
    expandFor(found.flatMap((problem) => problem.named));
    await focusFirst(order, found);
    return;
  }
  const tickers = splitTickers(tickersText.value);
  adding.value = true;
  try {
    let added = 0;
    const addedNames: string[] = [];
    for (const strategy of chosenList) {
      const selection = {
        ...buildSelection(strategy.fields, values.value[strategy.method] ?? {}),
        ...(asOf.value !== '' && declaresAsOf(strategy.method)
          ? { as_of: asOf.value }
          : {}),
      };
      const result = await action.run((client) =>
        client.post('/v1/watchlists/{watchlist_id}/entries', {
          path: { watchlist_id: watchlistId.value },
          body: { method_id: strategy.method, tickers, selection },
        }),
      );
      if (result === null) return;
      if (!result.ok) {
        if (addedNames.length > 0)
          partial.value = { count: added, names: addedNames };
        await placeFailure(strategy, result.error);
        return;
      }
      const count = result.value.data.entries.length;
      added += count - lastCount;
      lastCount = count;
      addedNames.push(strategy.name);
      chosen.value.delete(strategy.method);
    }
    leaveNotice({ key: 'watchlist.added', count: lastCount - loadedCount });
    await router.push({
      name: 'watchlist',
      params: { watchlistId: watchlistId.value },
    });
  } finally {
    adding.value = false;
  }
}

// An engine failure of one strategy's request: the rule errors go to their
// fields (D230); any other failure shows above "Add".
async function placeFailure(
  strategy: StrategyFields,
  error: unknown,
): Promise<void> {
  if (
    !(error instanceof ApiError) ||
    error.reasonCode !== 'invalid_parameter' ||
    error.errors === null ||
    error.errors.length === 0
  )
    return;
  const order = targetOrder([strategy]);
  const placed = placeRuleErrors(
    error.errors as RuleError[],
    strategy,
    order,
    (target) => labelOf(strategy, target),
    locale.value,
    newId(),
  );
  problems.value = placed;
  expandFor(placed.flatMap((problem) => problem.named));
  await focusFirst(order, placed);
}

// A failure that no field shows: above "Add", with "Try again" where it helps.
const aboveAddFailure = computed(() => {
  const failure = action.failure.value;
  if (failure === null) return null;
  const placedAtFields =
    failure instanceof ApiError &&
    failure.reasonCode === 'invalid_parameter' &&
    failure.errors !== null &&
    failure.errors.length > 0;
  return placedAtFields ? null : failure;
});

const aboveAdd = computed(() =>
  problems.value.filter((problem) => problem.shownAt === null),
);

const describe = (target: string): string | undefined => {
  const ids = [...describedBy(problems.value, target)];
  return ids.length > 0 ? ids.join(' ') : undefined;
};

function cancel(): void {
  void router.push({
    name: 'watchlist',
    params: { watchlistId: watchlistId.value },
  });
}
</script>

<template>
  <AppBreadcrumb :crumbs="crumbs" />
  <template v-if="state.kind !== 'ready'">
    <ScreenState :state="state" @retry="reload()" />
  </template>
  <template v-else>
    <h1>
      {{ t('addEntries.heading', { name: state.data.watchlist.display_name }) }}
    </h1>
    <div role="status" class="status">
      <p v-if="partial !== null">
        {{
          plural('addEntries.partial', partial.count, {
            strategies: formatConjunction(locale, partial.names),
          })
        }}
      </p>
    </div>
    <form
      ref="formElement"
      class="add-form"
      novalidate
      @submit.prevent="submit()"
    >
      <div class="field">
        <label :for="`${base}-tickers`"
          >{{ t('addEntries.tickers')
          }}<span class="required-mark" aria-hidden="true"> *</span></label
        >
        <input
          :id="`${base}-tickers`"
          v-model="tickersText"
          type="text"
          autocomplete="off"
          :data-target="tickersTarget"
          aria-required="true"
          :aria-invalid="describe(tickersTarget) ? 'true' : undefined"
          :aria-describedby="
            [describe(tickersTarget), `${base}-tickers-hint`]
              .filter(Boolean)
              .join(' ')
          "
        />
        <p :id="`${base}-tickers-hint`" class="hint">
          {{ t('addEntries.tickersHint') }}
        </p>
        <p
          v-for="problem in messagesAt(problems, tickersTarget)"
          :id="problem.id"
          :key="problem.id"
          class="field-message"
        >
          {{ problem.text }}
        </p>
      </div>
      <div class="field">
        <label :for="`${base}-as-of`">{{ t('addEntries.asOf') }}</label>
        <input
          :id="`${base}-as-of`"
          v-model="asOf"
          type="date"
          max="9999-12-31"
          :data-target="asOfTarget"
          :aria-invalid="describe(asOfTarget) ? 'true' : undefined"
          :aria-describedby="
            [describe(asOfTarget), `${base}-as-of-hint`]
              .filter(Boolean)
              .join(' ')
          "
        />
        <p :id="`${base}-as-of-hint`" class="hint">
          {{ t('addEntries.asOfHint') }}
        </p>
        <p
          v-for="problem in messagesAt(problems, asOfTarget)"
          :id="problem.id"
          :key="problem.id"
          class="field-message"
        >
          {{ problem.text }}
        </p>
      </div>
      <StrategyChooser
        :strategies="strategies"
        :forms="forms"
        :chosen="chosen"
        :expanded="expanded"
        :values="values"
        :problems="problems"
        @choose="choose"
        @toggle="toggle"
        @update="update"
        @retry="selectionForms.load"
      />
      <p class="hint">{{ t('addEntries.requiredNote') }}</p>
      <p
        v-for="problem in aboveAdd"
        :id="problem.id"
        :key="problem.id"
        class="field-message"
      >
        {{ problem.text }}
      </p>
      <div v-if="aboveAddFailure !== null" role="alert">
        <ActionFailure :error="aboveAddFailure" @retry="submit()" />
      </div>
      <div class="actions">
        <button type="button" @click="cancel()">
          {{ t('actions.cancel') }}
        </button>
        <button
          type="submit"
          class="primary"
          :aria-disabled="adding ? 'true' : 'false'"
        >
          {{ adding ? t('addEntries.adding') : t('addEntries.add') }}
        </button>
      </div>
    </form>
  </template>
</template>

<style scoped>
.add-form {
  display: grid;
  gap: var(--space-4);
  max-inline-size: 40rem;
}

.field {
  display: grid;
  gap: var(--space-1);
  justify-items: start;
}

.hint {
  color: var(--color-text-secondary);
  font-size: var(--font-size-small);
  margin: 0;
}

.field-message {
  color: var(--color-negative);
  margin: 0;
}

.actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}

.status p {
  margin: 0;
}
</style>
