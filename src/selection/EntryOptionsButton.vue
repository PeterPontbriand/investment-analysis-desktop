<script setup lang="ts">
import { useEngine } from '../api/engine.ts';
import { useResolvedName } from '../composables/useResolvedName.ts';
import { useMessages } from '../i18n/index.ts';

// One row's Show/Hide button for the entry's stored options (D233). Its
// accessible name says which entry it opens.
const props = defineProps<{
  index: number;
  ticker: string;
  methodId: string;
  open: boolean;
  controls: string;
}>();
defineEmits<{ toggle: [] }>();

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
    :aria-expanded="open ? 'true' : 'false'"
    :aria-controls="open ? controls : undefined"
    :aria-label="
      t(open ? 'watchlist.hideOptions' : 'watchlist.showOptions', {
        index,
        ticker,
        strategy: name?.text ?? methodId,
      })
    "
    @click="$emit('toggle')"
  >
    {{ t(open ? 'selection.hide' : 'selection.show') }}
  </button>
</template>
