<script setup lang="ts">
import { markCrumbNavigation } from '../composables/useTrail.ts';
import { useMessages } from '../i18n/index.ts';
import type { Crumb } from './crumbs.ts';

// The way back: the screens the reader came through, or the screens above the
// current one, each a link (D380). The heading says where the reader is, so the
// trail never lists the current screen; with no crumbs there is no trail. A
// served part of a label carries its language (D382).
defineProps<{ crumbs: Crumb[] }>();

const { t } = useMessages();
</script>

<template>
  <nav
    v-if="crumbs.length > 0"
    :aria-label="t('breadcrumb.label')"
    class="breadcrumb"
  >
    <ol>
      <li v-for="(crumb, index) in crumbs" :key="index">
        <RouterLink :to="crumb.to" @click="markCrumbNavigation()"
          ><template v-if="typeof crumb.label === 'string'">{{
            crumb.label
          }}</template
          ><template v-else
            ><span
              v-for="(part, at) in crumb.label"
              :key="at"
              :lang="part.lang ?? undefined"
              >{{ part.text }}</span
            ></template
          ></RouterLink
        >
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumb {
  color: var(--color-text-secondary);
  font-size: var(--font-size-small);
}

/* The trail stands alone: no underline at rest, one on hover and focus. */
.breadcrumb a {
  text-decoration-line: none;
}

.breadcrumb a:hover,
.breadcrumb a:focus-visible {
  text-decoration-line: underline;
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
