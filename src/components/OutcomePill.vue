<script setup lang="ts">
import { useEngine } from '../api/engine.ts';
import { useResolvedName } from '../composables/useResolvedName.ts';
import { formatCount } from '../i18n/format.ts';
import { useMessages } from '../i18n/index.ts';
import TermTrigger from './TermTrigger.vue';
import { toneOf } from './outcomeTone.ts';

// A run outcome as its term name (D43), coloured by tone; with a count, the
// count follows the name inside the pill (D176). The pill is a term trigger
// (GUI.4b): it stays a pill, with the same preview and panel.
// With a label, the label is shown in place of the term name (a count the
// engine keeps outside the outcomes, D248), and the pill explains nothing.
const props = defineProps<{ code: string; count?: number; label?: string }>();

const { locale } = useMessages();
const engine = useEngine();
const name = useResolvedName(
  () => engine.terms.term('RunOutcome', props.code),
  [() => props.code],
);
</script>

<template>
  <span v-if="label !== undefined" class="pill" :class="`tone-${toneOf(code)}`">
    {{ label }}
    <template v-if="count !== undefined"
      >{{ ' ' }}{{ formatCount(locale, count) }}</template
    >
  </span>
  <TermTrigger
    v-else-if="name"
    :term-id="name.termId"
    :name="name.text"
    kind="pill"
  >
    <span class="pill" :class="`tone-${toneOf(code)}`">
      <span
        :data-term-id="name.termId ?? undefined"
        :lang="name.lang ?? undefined"
        >{{ name.text }}</span
      >
      <template v-if="count !== undefined"
        >{{ ' ' }}{{ formatCount(locale, count) }}</template
      >
    </span>
  </TermTrigger>
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
