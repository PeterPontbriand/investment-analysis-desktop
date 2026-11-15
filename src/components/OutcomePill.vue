<script setup lang="ts">
import TermName from './TermName.vue';
import { toneOf } from './outcomeTone.ts';

// A run outcome as its term name (D43), coloured by tone.
defineProps<{ code: string }>();
</script>

<template>
  <span class="pill" :class="`tone-${toneOf(code)}`">
    <TermName code-set="RunOutcome" :code="code" />
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
