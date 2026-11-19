<script setup lang="ts">
/* global Event, HTMLSelectElement -- DOM types; src/ configures no browser globals */
import { computed } from 'vue';
import { useMessages } from '../i18n/index.ts';
import type { ChoiceField } from './schema.ts';
import { useOptionNames } from './useOptionNames.ts';

// A closed set as a native select: each value shows its term's name (D191).
const props = defineProps<{
  field: ChoiceField;
  id: string;
  modelValue: string;
  invalid: boolean;
  describedby: string | undefined;
  target: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const { t } = useMessages();
const names = useOptionNames(
  () => props.field.codeSet,
  () => props.field.values,
);
function onChange(event: Event): void {
  emit('update:modelValue', (event.target as HTMLSelectElement).value);
}

const loaded = computed(
  () => Object.keys(names.value).length === props.field.values.length,
);
</script>

<template>
  <select
    v-if="loaded"
    :id="id"
    :value="modelValue"
    :data-target="target"
    :aria-required="field.required ? 'true' : undefined"
    :aria-invalid="invalid ? 'true' : undefined"
    :aria-describedby="describedby"
    @change="onChange"
  >
    <option v-if="field.initial === ''" value="">
      {{ t('selection.notSet') }}
    </option>
    <option
      v-for="value in field.values"
      :key="value"
      :value="value"
      :data-term-id="names[value]?.termId ?? undefined"
      :lang="names[value]?.lang ?? undefined"
    >
      {{ names[value]?.text ?? value }}
    </option>
  </select>
</template>
