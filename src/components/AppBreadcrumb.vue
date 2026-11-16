<script setup lang="ts">
import { useMessages } from '../i18n/index.ts';
import type { Crumb } from './crumbs.ts';

// The path to the current screen; the last crumb is the current screen.
defineProps<{ crumbs: Crumb[] }>();

const { t } = useMessages();
</script>

<template>
  <nav :aria-label="t('breadcrumb.label')" class="breadcrumb">
    <ol>
      <li v-for="(crumb, index) in crumbs" :key="index">
        <span v-if="index === crumbs.length - 1" aria-current="page">{{
          crumb.label
        }}</span>
        <RouterLink v-else-if="crumb.to" :to="crumb.to">{{
          crumb.label
        }}</RouterLink>
        <span v-else>{{ crumb.label }}</span>
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
