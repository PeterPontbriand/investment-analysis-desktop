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
  <p v-if="state.kind === 'connecting'" role="status">
    {{ t('engine.loading') }}
  </p>
  <p v-else-if="state.kind === 'engine'" role="status">
    {{ t(state.key) }}
  </p>
  <div v-else-if="failure" role="status">
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
