<script setup lang="ts">
/* global HTMLElement -- DOM types; src/ configures no browser globals */
import { useEngine } from '../api/engine.ts';
import { useResolvedName } from '../composables/useResolvedName.ts';
import { useMessages } from '../i18n/index.ts';

// One row's Remove button. Its accessible name says which entry it removes.
const props = defineProps<{
  index: number;
  ticker: string;
  methodId: string;
}>();
defineEmits<{ open: [opener: HTMLElement] }>();

const { t } = useMessages();
const engine = useEngine();
const name = useResolvedName(
  () => engine.terms.strategy(props.methodId),
  [() => props.methodId],
);
</script>

<template>
  <button
    type="button"
    :aria-label="
      t('watchlist.removeEntry', {
        index,
        ticker,
        strategy: name?.text ?? methodId,
      })
    "
    @click="$emit('open', $event.currentTarget as HTMLElement)"
  >
    {{ t('watchlist.removeAction') }}
  </button>
</template>
