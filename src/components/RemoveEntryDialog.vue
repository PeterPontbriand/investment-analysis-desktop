<script setup lang="ts">
/* global HTMLElement -- DOM types; src/ configures no browser globals */
import { computed, ref } from 'vue';
import { useEngine } from '../api/engine.ts';
import { useResolvedName } from '../composables/useResolvedName.ts';
import { useMessages } from '../i18n/index.ts';
import {
  removeOptions,
  type RemovableEntry,
  type RemoveChoice,
} from '../views/removeOptions.ts';
import ConfirmDialog from './ConfirmDialog.vue';

// The dialog that removes an entry, every entry for its ticker or every entry
// of its strategy (D187, D219).
const props = defineProps<{
  watchlistName: string;
  entries: RemovableEntry[];
  entry: RemovableEntry;
  pending: boolean;
  error: unknown;
  opener: HTMLElement | null;
}>();
const emit = defineEmits<{
  confirm: [choice: RemoveChoice];
  cancel: [];
  retry: [];
}>();

const { t } = useMessages();
const engine = useEngine();
const strategy = useResolvedName(
  () => engine.terms.strategy(props.entry.selection.method_id),
  [() => props.entry.selection.method_id],
);
const strategyName = computed(
  () => strategy.value?.text ?? props.entry.selection.method_id,
);
const options = computed(() => removeOptions(props.entries, props.entry));
const plain = computed(
  () => options.value.ticker === null && options.value.method === null,
);
const choice = ref<RemoveChoice>('entry');
const entryParameters = computed(() => ({
  index: props.entry.index,
  ticker: props.entry.ticker,
  strategy: strategyName.value,
}));
</script>

<template>
  <ConfirmDialog
    :title="
      plain
        ? t('watchlist.confirmEntry', entryParameters)
        : t('watchlist.removeTitle', { watchlist: watchlistName })
    "
    :confirm-label="t('watchlist.removeAction')"
    :pending-label="t('actions.removing')"
    :pending="pending"
    :error="error"
    :opener="opener"
    @confirm="emit('confirm', choice)"
    @cancel="$emit('cancel')"
    @retry="$emit('retry')"
  >
    <fieldset v-if="!plain" class="choices">
      <legend class="visually-hidden">
        {{ t('watchlist.removeChoices') }}
      </legend>
      <label>
        <input v-model="choice" type="radio" value="entry" name="remove" />
        {{ t('watchlist.optionEntry', entryParameters) }}
      </label>
      <label v-if="options.ticker !== null">
        <input v-model="choice" type="radio" value="ticker" name="remove" />
        {{
          t('watchlist.optionTicker', {
            ticker: entry.ticker,
            count: options.ticker,
          })
        }}
      </label>
      <label v-if="options.method !== null">
        <input v-model="choice" type="radio" value="method" name="remove" />
        {{
          t('watchlist.optionMethod', {
            strategy: strategyName,
            count: options.method,
          })
        }}
      </label>
    </fieldset>
    <p>{{ t('actions.runsKept') }}</p>
  </ConfirmDialog>
</template>

<style scoped>
.choices {
  border: 0;
  display: grid;
  gap: var(--space-2);
  margin: 0 0 var(--space-3);
  padding: 0;
}
</style>
