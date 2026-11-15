<script setup lang="ts">
import { useMessages } from './i18n/index.ts';

const { t } = useMessages();
</script>

<template>
  <div class="shell">
    <header class="sidebar">
      <p class="product">{{ t('app.name') }}</p>
      <p class="notice">{{ t('app.preReleaseNotice') }}</p>
      <nav :aria-label="t('nav.label')">
        <ul>
          <li>
            <RouterLink :to="{ name: 'watchlists' }">{{
              t('nav.watchlists')
            }}</RouterLink>
          </li>
          <li>
            <RouterLink :to="{ name: 'refreshes' }">{{
              t('nav.refreshes')
            }}</RouterLink>
          </li>
          <li>
            <RouterLink :to="{ name: 'runs' }">{{ t('nav.runs') }}</RouterLink>
          </li>
          <li>
            <RouterLink :to="{ name: 'about' }">{{
              t('nav.about')
            }}</RouterLink>
          </li>
        </ul>
      </nav>
    </header>
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  min-block-size: 100vh;
}

.sidebar {
  border-inline-end: var(--border-width) solid var(--color-border);
  flex: 0 0 var(--sidebar-size);
  padding: var(--space-4) var(--space-3);
}

.product {
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-medium);
  margin-block: 0 var(--space-1);
}

.notice {
  color: var(--color-text-secondary);
  font-size: var(--font-size-small);
  margin-block: 0 var(--space-6);
}

.sidebar ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.sidebar li {
  margin-block-end: var(--space-1);
}

.sidebar a {
  border: var(--border-width) solid transparent;
  border-radius: var(--radius-control);
  color: var(--color-text-secondary);
  display: block;
  padding: var(--space-1) var(--space-2);
  text-decoration: none;
}

.sidebar a[aria-current='page'] {
  background: var(--color-surface-raised);
  color: var(--color-text);
}

.content {
  flex: 1;
  min-inline-size: 0;
  padding: var(--space-4) var(--space-6);
}
</style>
