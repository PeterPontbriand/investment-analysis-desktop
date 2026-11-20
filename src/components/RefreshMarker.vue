<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useEngine } from '../api/engine.ts';
import { isEnded } from '../api/refreshes.ts';
import { useMessages } from '../i18n/index.ts';
import { formatCount } from '../i18n/format.ts';
import { progressLocation } from '../views/navigation.ts';
import { endOf, subjectOf, subjectText } from '../views/refreshModel.ts';

// The navigation marker (D201): while a refresh runs, its progress; after it
// ends, how it ended until the progress screen has shown it. The end is also
// announced once, politely, on any screen except the progress screen of that
// refresh, whose own announcement is the one heard (D254, D263).
const engine = useEngine();
const { t, locale } = useMessages();
const route = useRoute();

const record = computed(() => engine.follower.current.value);

const text = computed(() => {
  const held = record.value;
  if (held === null) return null;
  if (!isEnded(held.state))
    return t('nav.refreshRunning', {
      finished: formatCount(locale.value, held.totals.finished),
      total: formatCount(locale.value, held.totals.total),
    });
  if (held.seen) return null;
  const end = endOf(held);
  return end === 'stopped'
    ? t('nav.refreshStopped')
    : end === 'failed'
      ? t('nav.refreshFailed')
      : t('nav.refreshFinished');
});

const announcement = ref('');
watch(
  () => [record.value?.refreshId, record.value?.state] as const,
  ([id, state], [previousId, previousState]) => {
    const held = record.value;
    if (held === null || id === undefined || state === undefined) return;
    if (id !== previousId || previousState === undefined) return;
    if (isEnded(previousState) || !isEnded(state)) return;
    if (route.name === 'refresh-progress' && route.params.refreshId === id)
      return;
    const end = endOf(held);
    if (end === null) return;
    announcement.value = t(`refresh.announce.${end}`, {
      subject: subjectText(subjectOf(held), t),
    });
  },
);
</script>

<template>
  <RouterLink
    v-if="text !== null && record !== null"
    class="marker"
    :to="progressLocation(record.refreshId)"
    >{{ text }}</RouterLink
  >
  <p class="visually-hidden" aria-live="polite" aria-atomic="true">
    {{ announcement }}
  </p>
</template>

<style scoped>
.marker {
  display: block;
  font-size: var(--font-size-small);
  padding-inline-start: var(--space-4);
}
</style>
