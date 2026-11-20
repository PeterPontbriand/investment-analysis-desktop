<script setup lang="ts">
import { computed } from 'vue';
import { useMessages } from '../i18n/index.ts';
import type { RefreshNote } from '../composables/useRefreshStart.ts';
import { progressLocation } from '../views/navigation.ts';
import ActionFailure from './ActionFailure.vue';

// What goes beside "Refresh now": that a refresh is running with the link to
// its progress, or why a start failed (D251, D216).
const props = defineProps<{ refresh: RefreshNote }>();
const { t } = useMessages();

const showing = computed(() => props.refresh.failure.value !== null);
const link = computed(() =>
  props.refresh.runningId.value === null
    ? null
    : progressLocation(props.refresh.runningId.value),
);
</script>

<template>
  <div v-if="showing && refresh.refused.value" role="alert" class="note">
    <ActionFailure :error="refresh.failure.value" />
    <RouterLink v-if="link !== null" :to="link">{{
      t('refresh.showProgress')
    }}</RouterLink>
  </div>
  <div v-else-if="showing" role="alert" class="note">
    <ActionFailure :error="refresh.failure.value" />
  </div>
  <p v-else-if="refresh.running.value && link !== null" class="note">
    {{ t('refresh.running') }}
    <RouterLink :to="link">{{ t('refresh.showProgress') }}</RouterLink>
  </p>
</template>

<style scoped>
.note {
  margin-block: var(--space-2);
}
</style>
