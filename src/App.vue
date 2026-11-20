<script setup lang="ts">
/* global console -- the browser's console; src/ configures no browser globals */
import { onErrorCaptured, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useEngine } from './api/engine.ts';
import ConfirmDialog from './components/ConfirmDialog.vue';
import RefreshMarker from './components/RefreshMarker.vue';
import { useMessages } from './i18n/index.ts';

const { t } = useMessages();
const route = useRoute();
const engine = useEngine();

// Closing the window while a refresh runs asks first (D255). The question is
// the application's own dialog; with no refresh running the window closes.
const closeAsked = ref(false);
engine.platform.onCloseRequested(() => {
  if (!engine.follower.running.value) return false;
  closeAsked.value = true;
  return true;
});
// A refresh that ends while the question is open takes away its reason, so
// the window closes as if "Close anyway" had been chosen (D264).
watch(
  () => engine.follower.running.value,
  (running) => {
    if (running || !closeAsked.value) return;
    closeAsked.value = false;
    void engine.platform.closeWindow();
  },
);

// A screen that fails to render is replaced by one message, and the navigation
// keeps working (D171). Going to another screen clears the message.
const renderFailed = ref(false);
onErrorCaptured((error) => {
  console.error(error);
  renderFailed.value = true;
  return false;
});
watch(
  () => route.fullPath,
  () => {
    renderFailed.value = false;
  },
);
</script>

<template>
  <div class="shell">
    <header class="sidebar">
      <p class="product">{{ t('app.name') }}</p>
      <p class="notice">{{ t('app.preReleaseNotice') }}</p>
      <nav :aria-label="t('nav.label')">
        <ul>
          <li>
            <RouterLink :to="{ name: 'analyze' }">{{
              t('nav.analyze')
            }}</RouterLink>
          </li>
          <li>
            <RouterLink :to="{ name: 'watchlists' }">{{
              t('nav.watchlists')
            }}</RouterLink>
          </li>
          <li>
            <RouterLink :to="{ name: 'refreshes' }">{{
              t('nav.refreshes')
            }}</RouterLink>
            <RefreshMarker />
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
      <div v-if="renderFailed" role="alert" class="failure">
        <p>{{ t('state.renderFailed') }}</p>
      </div>
      <RouterView v-else />
    </main>
    <ConfirmDialog
      v-if="closeAsked"
      :title="t('close.title')"
      :confirm-label="t('close.closeAnyway')"
      :pending-label="t('close.closeAnyway')"
      :cancel-label="t('actions.keepOpen')"
      :pending="false"
      :error="null"
      :opener="null"
      @confirm="engine.platform.closeWindow()"
      @cancel="closeAsked = false"
      @retry="engine.platform.closeWindow()"
    />
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
  text-decoration-line: none;
}

.sidebar a:hover,
.sidebar a:focus-visible {
  text-decoration-line: none;
}

.sidebar a[aria-current='page'] {
  background: var(--color-surface-raised);
  color: var(--color-text);
}

.failure {
  background: var(--color-surface-raised);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  padding: var(--space-3) var(--space-4);
}

.content {
  flex: 1;
  min-inline-size: 0;
  padding: var(--space-4) var(--space-6);
}
</style>
