<script setup lang="ts">
import { useMessages } from '../i18n/index.ts';
import type { RefreshStart } from '../composables/useRefreshStart.ts';

// "Refresh now" (D251). While a refresh is known to be running, or a start is
// pending, it ignores activation and says so with aria-disabled (D218).
const props = defineProps<{ refresh: RefreshStart; watchlistId: string }>();
const { t } = useMessages();

function activate(): void {
  if (props.refresh.pending.value || props.refresh.running.value) return;
  void props.refresh.start(props.watchlistId);
}
</script>

<template>
  <button
    type="button"
    :aria-disabled="
      refresh.pending.value || refresh.running.value ? 'true' : 'false'
    "
    @click="activate()"
  >
    {{ refresh.pending.value ? t('actions.starting') : t('refresh.now') }}
  </button>
</template>
