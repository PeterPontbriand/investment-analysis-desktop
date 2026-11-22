<script setup lang="ts">
/* global Event, HTMLInputElement -- DOM types; src/ configures no browser globals */
import { useId } from 'vue';
import { useMessages } from '../i18n/index.ts';
import ChoiceSelect from './ChoiceSelect.vue';
import {
  describedBy,
  fieldTarget,
  messagesAt,
  type Problem,
} from './problems.ts';
import TermTrigger from '../components/TermTrigger.vue';
import type { Field } from './schema.ts';
import type { FieldValue, Values } from './form.ts';

// The fields of one strategy's options, generated from its selection schema
// (D189, D190). A group is a labelled fieldset holding this component again.
defineProps<{
  fields: Field[];
  method: string;
  values: Values;
  problems: Problem[];
}>();
const emit = defineEmits<{
  update: [key: string, value: FieldValue, bad: boolean];
}>();

const { t } = useMessages();
const base = useId();

const idOf = (method: string, key: string): string =>
  `${base}-${method}-${key}`;

function describe(
  problems: Problem[],
  method: string,
  field: Field,
  hint: boolean,
): string | undefined {
  const ids = [
    ...describedBy(problems, fieldTarget(method, field.key)),
    ...(hint && field.description !== null
      ? [`${idOf(method, field.key)}-hint`]
      : []),
    ...(field.kind === 'unsupported'
      ? [`${idOf(method, field.key)}-unsupported`]
      : []),
  ];
  return ids.length > 0 ? ids.join(' ') : undefined;
}

function onNumber(key: string, event: Event): void {
  const input = event.target as HTMLInputElement;
  emit('update', key, input.value, input.validity.badInput);
}
</script>

<template>
  <div class="fields">
    <template v-for="field in fields" :key="field.key">
      <fieldset
        v-if="field.kind === 'group'"
        class="group"
        tabindex="-1"
        :data-target="fieldTarget(method, field.key)"
        :aria-describedby="describe(problems, method, field, true)"
        :aria-invalid="
          describedBy(problems, fieldTarget(method, field.key)).length > 0
            ? 'true'
            : undefined
        "
      >
        <legend :data-term-id="field.termId ?? undefined">
          {{ field.label }}
          <TermTrigger
            kind="help"
            :term-id="field.termId"
            :name="field.label"
          />
        </legend>
        <p
          v-if="field.description !== null"
          :id="`${idOf(method, field.key)}-hint`"
          class="hint"
        >
          {{ field.description }}
        </p>
        <p
          v-for="problem in messagesAt(
            problems,
            fieldTarget(method, field.key),
          )"
          :id="problem.id"
          :key="problem.id"
          class="field-message"
        >
          {{ problem.text }}
        </p>
        <SelectionFields
          :fields="field.fields"
          :method="method"
          :values="values"
          :problems="problems"
          @update="(key, value, bad) => emit('update', key, value, bad)"
        />
      </fieldset>
      <div v-else class="field" :class="{ check: field.kind === 'boolean' }">
        <template v-if="field.kind === 'boolean'">
          <input
            :id="idOf(method, field.key)"
            type="checkbox"
            :checked="values[field.key] === true"
            :data-target="fieldTarget(method, field.key)"
            :aria-invalid="
              describedBy(problems, fieldTarget(method, field.key)).length > 0
                ? 'true'
                : undefined
            "
            :aria-describedby="describe(problems, method, field, true)"
            @change="
              emit(
                'update',
                field.key,
                ($event.target as HTMLInputElement).checked,
                false,
              )
            "
          />
          <label
            :for="idOf(method, field.key)"
            :data-term-id="field.termId ?? undefined"
            >{{ field.label }}</label
          >
          <TermTrigger
            kind="help"
            :term-id="field.termId"
            :name="field.label"
          />
        </template>
        <template v-else>
          <label
            :for="idOf(method, field.key)"
            :data-term-id="field.termId ?? undefined"
            >{{ field.label
            }}<span
              v-if="field.required"
              class="required-mark"
              aria-hidden="true"
            >
              *</span
            ></label
          >
          <TermTrigger
            kind="help"
            :term-id="field.termId"
            :name="field.label"
          />
          <ChoiceSelect
            v-if="field.kind === 'choice'"
            :id="idOf(method, field.key)"
            :field="field"
            :model-value="String(values[field.key] ?? '')"
            :invalid="
              describedBy(problems, fieldTarget(method, field.key)).length > 0
            "
            :describedby="describe(problems, method, field, true)"
            :target="fieldTarget(method, field.key)"
            @update:model-value="
              (value) => emit('update', field.key, value, false)
            "
          />
          <input
            v-else-if="field.kind === 'number'"
            :id="idOf(method, field.key)"
            type="number"
            :step="field.integer ? '1' : 'any'"
            :min="field.min ?? undefined"
            :max="field.max ?? undefined"
            :value="String(values[field.key] ?? '')"
            :data-target="fieldTarget(method, field.key)"
            :aria-required="field.required ? 'true' : undefined"
            :aria-invalid="
              describedBy(problems, fieldTarget(method, field.key)).length > 0
                ? 'true'
                : undefined
            "
            :aria-describedby="describe(problems, method, field, true)"
            @input="onNumber(field.key, $event)"
          />
          <input
            v-else-if="field.kind === 'text'"
            :id="idOf(method, field.key)"
            type="text"
            autocomplete="off"
            :value="String(values[field.key] ?? '')"
            :data-target="fieldTarget(method, field.key)"
            :aria-required="field.required ? 'true' : undefined"
            :aria-invalid="
              describedBy(problems, fieldTarget(method, field.key)).length > 0
                ? 'true'
                : undefined
            "
            :aria-describedby="describe(problems, method, field, true)"
            @input="
              emit(
                'update',
                field.key,
                ($event.target as HTMLInputElement).value,
                false,
              )
            "
          />
          <p
            v-else
            :id="`${idOf(method, field.key)}-unsupported`"
            class="field-message"
            tabindex="-1"
            :data-target="fieldTarget(method, field.key)"
          >
            {{ t('selection.unsupported') }}
          </p>
        </template>
        <p
          v-if="field.description !== null"
          :id="`${idOf(method, field.key)}-hint`"
          class="hint"
        >
          {{ field.description }}
        </p>
        <p
          v-for="problem in messagesAt(
            problems,
            fieldTarget(method, field.key),
          )"
          :id="problem.id"
          :key="problem.id"
          class="field-message"
        >
          {{ problem.text }}
        </p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.fields {
  display: grid;
  gap: var(--space-3);
}

.field {
  display: grid;
  gap: var(--space-1);
  justify-items: start;
}

.field.check {
  align-items: center;
  grid-template-columns: auto 1fr;
  justify-items: start;
}

.field.check .hint,
.field.check .field-message {
  grid-column: 1 / -1;
}

.group {
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  padding: var(--space-2) var(--space-3);
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
</style>
