<script setup lang="ts">
import { formatCount } from '../i18n/format.ts';
import { useMessages } from '../i18n/index.ts';
import TermName from './TermName.vue';
import { toneOf } from './outcomeTone.ts';

// A run outcome as its term name (D43), coloured by tone; with a count, the
// count follows the name inside the pill (D176).
// With a label, the label is shown in place of the term name (a count the
// engine keeps outside the outcomes, D248).
defineProps<{ code: string; count?: number; label?: string }>();

const { locale } = useMessages();
</script>

<template>
  <span class="pill" :class="`tone-${toneOf(code)}`">
    <template v-if="label !== undefined">{{ label }}</template>
    <TermName v-else code-set="RunOutcome" :code="code" />
    <template v-if="count !== undefined"
      >{{ ' ' }}{{ formatCount(locale, count) }}</template
    >
  </span>
</template>

<style scoped>
.pill {
  background: var(--color-surface-raised);
  border: var(--border-width) solid transparent;
  border-radius: var(--radius-control);
  color: var(--color-text-secondary);
  font-size: var(--font-size-small);
  padding: 0 var(--space-2);
}

.tone-positive {
  background: var(--color-positive-bg);
  color: var(--color-positive);
}

.tone-caution {
  background: var(--color-caution-bg);
  color: var(--color-caution);
}

.tone-negative {
  background: var(--color-negative-bg);
  color: var(--color-negative);
}
</style>
