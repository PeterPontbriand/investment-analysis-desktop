<script setup lang="ts">
import { computed } from 'vue';
import { useEngine } from '../api/engine.ts';
import type { DetailLines } from '../composables/tickerDetailLines.ts';
import { formatInstant, formatInstantDate } from '../i18n/format.ts';
import { useMessages } from '../i18n/index.ts';
import TermName from './TermName.vue';

// The lines of a ticker's details, as the panel shows them (D290): the name,
// the venue, the kind as its term name, the quote currency, and when and by
// which provider they were taken. A null field has no line.
const props = defineProps<{ lines: DetailLines }>();

const { t, locale } = useMessages();
const engine = useEngine();

const stamp = computed(() => {
  const held = props.lines.stamp;
  if (held === null) return null;
  const date =
    held.source === 'profile'
      ? formatInstant(locale.value, held.at)
      : formatInstantDate(locale.value, held.at);
  if (held.providerId === null)
    return t('tickerDetails.identifiedNoProvider', { date });
  const provider = engine.info.providerName(held.providerId) ?? held.providerId;
  return held.source === 'profile'
    ? t('tickerDetails.checked', { date, provider })
    : t('tickerDetails.identified', { date, provider });
});
</script>

<template>
  <div class="lines">
    <p v-if="lines.name !== null" class="name">{{ lines.name }}</p>
    <p v-if="lines.venue !== null">{{ lines.venue }}</p>
    <p v-if="lines.kind !== null">
      <TermName code-set="InstrumentKind" :code="lines.kind" />
    </p>
    <p v-if="lines.currency !== null">{{ lines.currency }}</p>
    <p v-if="stamp !== null" class="stamp">{{ stamp }}</p>
  </div>
</template>

<style scoped>
.name {
  font-weight: var(--font-weight-medium);
}

.stamp {
  color: var(--color-text-secondary);
  font-size: var(--font-size-small);
}
</style>
