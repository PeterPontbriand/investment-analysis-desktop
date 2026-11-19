<script setup lang="ts">
/* global Event, HTMLInputElement -- DOM types; src/ configures no browser globals */
import { useId } from 'vue';
import ActionFailure from '../components/ActionFailure.vue';
import type { ResolvedName } from '../api/terms.ts';
import { useMessages } from '../i18n/index.ts';
import type { FieldValue, Values } from './form.ts';
import type { Problem } from './problems.ts';
import SelectionFields from './SelectionFields.vue';
import type { Field } from './schema.ts';
import type { FormLoad } from './useSelectionForms.ts';

// The strategy chooser (D193, D194): one checkbox for each strategy the
// engine declares, in the engine's order, each with its options, which are
// generated from the strategy's selection form. It is shared with the
// "Analyze a ticker" screen.
const props = defineProps<{
  strategies: { method: string; name: ResolvedName }[];
  forms: Record<string, FormLoad>;
  chosen: ReadonlySet<string>;
  expanded: ReadonlySet<string>;
  values: Record<string, Values>;
  problems: Problem[];
}>();
const emit = defineEmits<{
  choose: [method: string, chosen: boolean];
  toggle: [method: string];
  update: [method: string, key: string, value: FieldValue, bad: boolean];
  retry: [method: string];
}>();

const { t } = useMessages();
const base = useId();

function onChoose(method: string, event: Event): void {
  emit('choose', method, (event.target as HTMLInputElement).checked);
}

function stateOf(method: string): FormLoad['kind'] {
  return props.forms[method]?.kind ?? 'loading';
}

function readyFields(method: string): Field[] {
  const form = props.forms[method];
  return form?.kind === 'ready' ? form.form.fields : [];
}

function failureOf(method: string): unknown {
  const form = props.forms[method];
  return form?.kind === 'error' ? form.error : null;
}
</script>

<template>
  <fieldset class="strategies">
    <legend>{{ t('selection.strategies') }}</legend>
    <div v-for="strategy in strategies" :key="strategy.method" class="strategy">
      <div class="row">
        <input
          :id="`${base}-${strategy.method}`"
          type="checkbox"
          :checked="chosen.has(strategy.method)"
          :data-method="strategy.method"
          @change="onChoose(strategy.method, $event)"
        />
        <label
          :for="`${base}-${strategy.method}`"
          :data-term-id="strategy.name.termId ?? undefined"
          :lang="strategy.name.lang ?? undefined"
          >{{ strategy.name.text }}</label
        >
        <button
          type="button"
          :aria-expanded="expanded.has(strategy.method) ? 'true' : 'false'"
          :aria-controls="`${base}-${strategy.method}-options`"
          :aria-label="
            t(
              expanded.has(strategy.method)
                ? 'selection.hideOptions'
                : 'selection.showOptions',
              { strategy: strategy.name.text },
            )
          "
          @click="emit('toggle', strategy.method)"
        >
          {{
            t(
              expanded.has(strategy.method)
                ? 'selection.hide'
                : 'selection.show',
            )
          }}
        </button>
      </div>
      <div
        v-if="expanded.has(strategy.method)"
        :id="`${base}-${strategy.method}-options`"
        class="options"
      >
        <p v-if="stateOf(strategy.method) === 'loading'" role="status">
          {{ t('common.loading') }}
        </p>
        <div v-else-if="stateOf(strategy.method) === 'error'" role="alert">
          <ActionFailure
            :error="failureOf(strategy.method)"
            @retry="emit('retry', strategy.method)"
          />
        </div>
        <SelectionFields
          v-else
          :fields="readyFields(strategy.method)"
          :method="strategy.method"
          :values="values[strategy.method] ?? {}"
          :problems="problems"
          @update="
            (key, value, bad) =>
              emit('update', strategy.method, key, value, bad)
          "
        />
      </div>
    </div>
  </fieldset>
</template>

<style scoped>
.strategies {
  border: 0;
  margin: 0;
  padding: 0;
}

legend {
  font-weight: var(--font-weight-medium);
  padding: 0;
}

.strategy {
  margin-block-start: var(--space-2);
}

.row {
  align-items: center;
  display: flex;
  gap: var(--space-2);
}

.row button {
  margin-inline-start: auto;
}

.options {
  border-inline-start: var(--border-width) solid var(--color-border);
  margin-block: var(--space-2);
  margin-inline-start: var(--space-2);
  padding-inline-start: var(--space-4);
}
</style>
