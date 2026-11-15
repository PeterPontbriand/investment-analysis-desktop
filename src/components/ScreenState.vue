<script setup lang="ts">
import { computed } from 'vue';
import { failureView } from '../api/engineState.ts';
import type { ScreenState } from '../api/useScreenData.ts';
import { useMessages } from '../i18n/index.ts';

// A screen's state from useScreenData: shows every state but the data.
const props = defineProps<{ state: ScreenState<unknown> }>();
defineEmits<{ retry: [] }>();

const { t } = useMessages();
const failure = computed(() =>
  props.state.kind === 'error' ? failureView(props.state.error) : null,
);
</script>

<template>
  <p v-if="state.kind === 'connecting'" role="status" class="connecting">
    {{ t('engine.loading') }}
  </p>
  <div v-else-if="state.kind === 'engine'" role="status" class="panel">
    <p>{{ t(state.key) }}</p>
  </div>
  <div v-else-if="failure" role="status" class="panel">
    <p v-if="failure.kind === 'reason'" :lang="failure.lang ?? undefined">
      {{ failure.text }}
    </p>
    <p v-else>{{ t(failure.key) }}</p>
    <button
      v-if="failure.kind === 'message' && failure.retry"
      type="button"
      @click="$emit('retry')"
    >
      {{ t('common.tryAgain') }}
    </button>
  </div>
</template>

<style scoped>
.connecting {
  color: var(--color-text-secondary);
}

.panel {
  background: var(--color-surface-raised);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  margin-block-end: var(--space-4);
  padding: var(--space-3) var(--space-4);
}

.panel p {
  margin-block-end: var(--space-2);
}

.panel p:last-child {
  margin-block-end: 0;
}
</style>
