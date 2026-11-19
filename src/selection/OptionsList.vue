<script setup lang="ts">
import TermName from '../components/TermName.vue';
import { useMessages } from '../i18n/index.ts';
import { readStoredValue } from './format.ts';
import type { Field } from './schema.ts';

// An entry's stored options, read-only, with the labels and option names of
// the form (D196, D233). A field the schema does not declare is not shown;
// a nested group shows its label and then its fields, indented.
const props = defineProps<{
  fields: Field[];
  selection: Record<string, unknown>;
}>();

const { t, locale } = useMessages();

function valueAt(path: string[], root: Record<string, unknown>): unknown {
  let value: unknown = root;
  for (const part of path) {
    if (typeof value !== 'object' || value === null) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

const show = (field: Field) =>
  readStoredValue(field, valueAt(field.path, props.selection), locale.value);
</script>

<template>
  <dl class="options-list">
    <template v-for="field in fields" :key="field.key">
      <template v-if="field.kind === 'group'">
        <dt :data-term-id="field.termId ?? undefined">{{ field.label }}</dt>
        <dd class="nested">
          <OptionsList :fields="field.fields" :selection="selection" />
        </dd>
      </template>
      <template v-else>
        <dt :data-term-id="field.termId ?? undefined">{{ field.label }}</dt>
        <dd>
          <template v-if="show(field).kind === 'notSet'">{{
            t('selection.notSet')
          }}</template>
          <template v-else-if="show(field).kind === 'boolean'">{{
            t(
              (show(field) as { value: boolean }).value
                ? 'selection.yes'
                : 'selection.no',
            )
          }}</template>
          <template v-else-if="show(field).kind === 'choice'">
            <TermName
              v-if="field.kind === 'choice' && field.codeSet !== null"
              :code-set="field.codeSet"
              :code="(show(field) as { value: string }).value"
            />
            <template v-else>{{
              (show(field) as { value: string }).value
            }}</template>
          </template>
          <template v-else>{{
            (show(field) as { text: string }).text
          }}</template>
        </dd>
      </template>
    </template>
  </dl>
</template>

<style scoped>
.options-list {
  display: grid;
  gap: var(--space-1) var(--space-4);
  grid-template-columns: max-content 1fr;
  margin: 0;
}

dt {
  color: var(--color-text-secondary);
}

dd {
  margin: 0;
}

.nested {
  grid-column: 1 / -1;
  margin-inline-start: var(--space-4);
}
</style>
