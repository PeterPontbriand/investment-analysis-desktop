<script setup lang="ts">
/* global console, document, HTMLElement, KeyboardEvent, MutationObserver, ResizeObserver, window, CSSStyleSheet -- the browser's console and DOM types; src/ configures no browser globals */
import {
  computed,
  onBeforeUnmount,
  onErrorCaptured,
  onMounted,
  ref,
  watch,
} from 'vue';
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router';
import { useEngine } from './api/engine.ts';
import AppBreadcrumb from './components/AppBreadcrumb.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import DetailsPanel from './components/DetailsPanel.vue';
import PreviewSwitch from './components/PreviewSwitch.vue';
import RefreshMarker from './components/RefreshMarker.vue';
import { closePanel } from './composables/useDetailsPanel.ts';
import {
  currentScreen,
  markSidebarNavigation,
  takeCrumbNavigation,
  trail,
} from './composables/useTrail.ts';
import { useMessages } from './i18n/index.ts';

const { t } = useMessages();
const route = useRoute();
const router = useRouter();
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

// F1 opens a term's panel from a field (D328). A webview may answer F1 with
// a help page of its own, so the application keeps the key for itself.
function keepF1(event: KeyboardEvent): void {
  if (event.key === 'F1') event.preventDefault();
}
onMounted(() => document.addEventListener('keydown', keepF1));
onBeforeUnmount(() => document.removeEventListener('keydown', keepF1));

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
// The panel's content belongs to the screen it was opened on, which a
// navigation replaces; focus is not returned to a trigger that is gone.
watch(
  () => route.path,
  () => closePanel({ returnFocus: false }),
);

// The one navigation trail (D380 to D384): the screens the reader came
// through, or, with none, the screens above the current one.
const crumbs = computed(() =>
  trail.value.length > 0 ? trail.value : (currentScreen.value?.parents() ?? []),
);

// A sidebar item starts the trail afresh (D381), also when it names the screen
// already shown, which makes no navigation.
function fromSidebar(to: RouteLocationRaw): void {
  if (router.resolve(to).fullPath === route.fullPath) trail.value = [];
  else markSidebarNavigation();
}

// The bar stays at the top while the screen scrolls, unless it would take more
// than a quarter of the window (D383). Its height is the page's scroll padding,
// so whatever a link or focus scrolls into view stops clear of it (D384).
const bar = ref<HTMLElement | null>(null);
const sticky = ref(true);
let barObserver: ResizeObserver | null = null;
// The height goes in a stylesheet of its own, not a style attribute, so the
// page holds no inline style.
const barSheet =
  typeof CSSStyleSheet === 'undefined' ||
  document.adoptedStyleSheets === undefined
    ? null
    : new CSSStyleSheet();
if (barSheet !== null)
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, barSheet];

function measureBar(): void {
  const height = bar.value?.getBoundingClientRect().height ?? 0;
  sticky.value = height <= window.innerHeight / 4;
  barSheet?.replaceSync(
    `:root { --trail-block-size: ${sticky.value ? height : 0}px; }`,
  );
}
onMounted(() => {
  measureBar();
  window.addEventListener('resize', measureBar);
  if (bar.value !== null && typeof ResizeObserver !== 'undefined') {
    barObserver = new ResizeObserver(measureBar);
    barObserver.observe(bar.value);
  }
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', measureBar);
  barObserver?.disconnect();
});

// After a crumb is used, focus moves to the screen's main heading once it
// shows; a guide keeps its own focus rule (D369, D384).
let headingWatch: MutationObserver | null = null;
function focusMainHeading(main: HTMLElement): void {
  headingWatch?.disconnect();
  const focus = (): boolean => {
    const heading = main.querySelector<HTMLElement>('h1');
    if (heading === null) return false;
    if (!heading.hasAttribute('tabindex'))
      heading.setAttribute('tabindex', '-1');
    heading.focus();
    return true;
  };
  if (focus() || typeof MutationObserver === 'undefined') return;
  const watcher = new MutationObserver(() => {
    if (focus()) watcher.disconnect();
  });
  watcher.observe(main, { childList: true, subtree: true });
  headingWatch = watcher;
  window.setTimeout(() => watcher.disconnect(), 10_000);
}
const main = ref<HTMLElement | null>(null);
watch(
  () => route.path,
  () => {
    if (!takeCrumbNavigation() || route.name === 'help-document') return;
    if (main.value !== null) focusMainHeading(main.value);
  },
  { flush: 'post' },
);
onBeforeUnmount(() => headingWatch?.disconnect());
</script>

<template>
  <div class="shell">
    <header class="sidebar">
      <p class="product">{{ t('app.name') }}</p>
      <p class="notice">{{ t('app.preReleaseNotice') }}</p>
      <nav :aria-label="t('nav.label')">
        <ul>
          <li>
            <RouterLink
              :to="{ name: 'getting-started' }"
              @click="fromSidebar({ name: 'getting-started' })"
              >{{ t('nav.gettingStarted') }}</RouterLink
            >
          </li>
          <li>
            <RouterLink
              :to="{ name: 'analyze' }"
              @click="fromSidebar({ name: 'analyze' })"
              >{{ t('nav.analyze') }}</RouterLink
            >
          </li>
          <li>
            <RouterLink
              :to="{ name: 'watchlists' }"
              @click="fromSidebar({ name: 'watchlists' })"
              >{{ t('nav.watchlists') }}</RouterLink
            >
          </li>
          <li>
            <RouterLink
              :to="{ name: 'refreshes' }"
              @click="fromSidebar({ name: 'refreshes' })"
              >{{ t('nav.refreshes') }}</RouterLink
            >
            <RefreshMarker />
          </li>
          <li>
            <RouterLink
              :to="{ name: 'runs' }"
              @click="fromSidebar({ name: 'runs' })"
              >{{ t('nav.runs') }}</RouterLink
            >
          </li>
          <li>
            <RouterLink
              :to="{ name: 'help' }"
              @click="fromSidebar({ name: 'help' })"
              >{{ t('nav.help') }}</RouterLink
            >
          </li>
          <li>
            <RouterLink
              :to="{ name: 'about' }"
              @click="fromSidebar({ name: 'about' })"
              >{{ t('nav.about') }}</RouterLink
            >
          </li>
        </ul>
      </nav>
      <div class="preferences">
        <PreviewSwitch />
      </div>
    </header>
    <main ref="main" class="content">
      <div ref="bar" class="trail-bar" :class="{ sticky }">
        <AppBreadcrumb :crumbs="crumbs" />
      </div>
      <div v-if="renderFailed" role="alert" class="failure">
        <p>{{ t('state.renderFailed') }}</p>
      </div>
      <RouterView v-else v-slot="{ Component, route: shown }">
        <!-- A screen opened with another parameter is a new screen. -->
        <component :is="Component" :key="shown.path" />
      </RouterView>
    </main>
    <DetailsPanel />
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

/* The sidebar stays in place while the content scrolls, and scrolls by itself
   when the window is shorter than it (D379). */
.sidebar {
  align-self: flex-start;
  block-size: calc(100vh - 2 * var(--space-4));
  display: flex;
  flex-direction: column;
  border-inline-end: var(--border-width) solid var(--color-border);
  flex: 0 0 var(--sidebar-size);
  inset-block-start: 0;
  overflow-y: auto;
  padding: var(--space-4) var(--space-3);
  position: sticky;
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

.preferences {
  border-block-start: var(--border-width) solid var(--color-border);
  margin-block-start: auto;
  padding-block-start: var(--space-3);
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

/* Above the comparison's sticky column (1), below the details panel (10) and
   the preview popup (20). */
.trail-bar {
  background: var(--color-surface);
}

.trail-bar:not(:empty) {
  padding-block: var(--space-2);
}

.trail-bar.sticky {
  inset-block-start: 0;
  position: sticky;
  z-index: 5;
}
</style>

<style>
/* What a link or focus scrolls into view stops below the sticky trail (D384). */
html {
  scroll-padding-block-start: var(--trail-block-size, 0);
}
</style>
