<script setup lang="ts">
import type { EntryWarningLine } from '../composables/useEntryWarnings.ts';
import TermName from './TermName.vue';

// One status line for each ticker the engine added but could not confirm
// (D282). The warning is the engine's term name for its code, with the term id
// kept.
defineProps<{ warnings: EntryWarningLine[] }>();
</script>

<template>
  <p v-for="line in warnings" :key="`${line.ticker}-${line.code}`">
    <i18n-t keypath="watchlist.entryWarning" scope="global" tag="span">
      <template #ticker>{{ line.ticker }}</template>
      <template #warning
        ><TermName code-set="EntryWarningCode" :code="line.code"
      /></template>
    </i18n-t>
  </p>
</template>
