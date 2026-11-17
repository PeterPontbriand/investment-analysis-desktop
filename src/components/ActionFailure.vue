<script setup lang="ts">
import { computed } from 'vue';
import { failureView } from '../api/engineState.ts';
import { useMessages } from '../i18n/index.ts';

// The failure of an action, worded as D188, D216 and D217 set: the engine's
// reason message for the codes that have one, otherwise a catalog message,
// with "Try again" when repeating the action can help.
const props = defineProps<{ error: unknown }>();
defineEmits<{ retry: [] }>();

const { t } = useMessages();
const view = computed(() => failureView(props.error));
</script>

<template>
  <div>
    <p v-if="view.kind === 'reason'" :lang="view.lang ?? undefined">
      {{ view.text }}
    </p>
    <p v-else>{{ t(view.key) }}</p>
    <button
      v-if="view.kind === 'message' && view.retry"
      type="button"
      @click="$emit('retry')"
    >
      {{ t('common.tryAgain') }}
    </button>
  </div>
</template>

<style scoped>
p {
  color: var(--color-negative);
  margin-block-end: var(--space-2);
}
</style>
