<script setup lang="ts">
import { useMessages } from '../i18n/index.ts';

// The current screen, and optionally the Watchlists screen above it.
defineProps<{ current: string; inWatchlists?: boolean }>();

const { t } = useMessages();
</script>

<template>
  <nav :aria-label="t('breadcrumb.label')" class="breadcrumb">
    <ol>
      <li v-if="inWatchlists">
        <RouterLink :to="{ name: 'watchlists' }">{{
          t('nav.watchlists')
        }}</RouterLink>
      </li>
      <li>
        <span aria-current="page">{{ current }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumb {
  color: var(--color-text-secondary);
  font-size: var(--font-size-small);
}

.breadcrumb ol {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  list-style: none;
  margin: 0;
  padding: 0;
}

.breadcrumb li + li::before {
  content: '/';
  margin-inline-end: var(--space-2);
}
</style>
