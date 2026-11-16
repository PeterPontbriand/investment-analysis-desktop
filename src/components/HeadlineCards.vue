<script setup lang="ts">
import type { components } from '../api/schema.ts';
import { formatCellValue } from '../i18n/format.ts';
import { useMessages } from '../i18n/index.ts';
import TermName from './TermName.vue';

type Cell = components['schemas']['CompareCellDocument'];

// One card per headline cell, in the order the engine gives them (D162): the
// label, then the value in a large step. A cell with no value shows a dash,
// its status and, when it has one, its reason code.
defineProps<{ cells: Cell[]; lang: string | null }>();

const { t, locale } = useMessages();

function text(cell: Cell): string | null {
  return formatCellValue(locale.value, cell, (value) =>
    t('common.multiple', { value }),
  );
}
</script>

<template>
  <ul class="cards">
    <li v-for="cell in cells" :key="cell.key" class="card">
      <span class="label" :data-term-id="cell.term" :lang="lang ?? undefined">{{
        cell.label
      }}</span>
      <span
        v-if="text(cell) !== null"
        class="value"
        :lang="cell.kind === 'text' ? (lang ?? undefined) : undefined"
        >{{ text(cell) }}</span
      >
      <template v-else>
        <span class="value">{{ t('common.noValue') }}</span>
        <span v-if="cell.status !== null" class="reason">
          <TermName code-set="CellStatusValue" :code="cell.status" />
        </span>
        <span v-if="cell.reason_code !== null" class="reason">
          <TermName code-set="ReasonCode" :code="cell.reason_code" />
        </span>
      </template>
    </li>
  </ul>
</template>

<style scoped>
.cards {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  list-style: none;
  margin: 0 0 var(--space-4);
  padding: 0;
}

.card {
  background: var(--color-surface-raised);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-4);
}

.label,
.reason {
  color: var(--color-text-secondary);
  font-size: var(--font-size-small);
}

.value {
  font-size: var(--font-size-title);
  font-variant-numeric: tabular-nums;
  font-weight: var(--font-weight-medium);
}
</style>
