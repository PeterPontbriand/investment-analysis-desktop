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
  border-inline-end: 1px solid #c8c8c8;
  flex: 0 0 14rem;
  padding: 1.5rem 1rem;
}

.product {
  font-size: 1.125rem;
  font-weight: 700;
  margin-block: 0 0.5rem;
}

.notice {
  font-size: 0.875rem;
  margin-block: 0 1.5rem;
}

.sidebar ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.sidebar li {
  margin-block-end: 0.5rem;
}

.sidebar a[aria-current='page'] {
  font-weight: 700;
}

.content {
  flex: 1;
  min-inline-size: 0;
  padding: 1.5rem;
}
</style>
