<script setup lang="ts">
import { onMounted } from 'vue';
import { useEngine } from '../api/engine.ts';
import { useMessages } from '../i18n/index.ts';

// Shown where a refresh can be started when the engine has no SEC identity
// (D205, D257). It reads the application-wide copy of the engine information.
const engine = useEngine();
const { t } = useMessages();
onMounted(() => {
  void engine.info.load().catch(() => {});
});
</script>

<template>
  <p v-if="engine.info.secIdentityConfigured.value === false" class="notice">
    {{ t('refresh.secIdentity') }}
  </p>
</template>

<style scoped>
.notice {
  background: var(--color-caution-bg);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  color: var(--color-caution);
  margin-block: var(--space-2);
  padding: var(--space-2) var(--space-3);
}
</style>
