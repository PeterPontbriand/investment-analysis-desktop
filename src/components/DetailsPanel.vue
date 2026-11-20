<script setup lang="ts">
/* global HTMLElement -- DOM types; src/ configures no browser globals */
import { nextTick, ref, watch } from 'vue';
import { useMessages } from '../i18n/index.ts';
import {
  closePanel,
  openPanelContent,
  panelId,
} from '../composables/useDetailsPanel.ts';

// The one details panel (D285): non-modal, on the inline-end side, over the
// content, which stays usable. Another trigger replaces its content. Opening
// it moves focus to its heading; Escape or the close button closes it and
// returns focus to the trigger.
const { t } = useMessages();
const content = openPanelContent;
const heading = ref<HTMLElement | null>(null);

watch(content, (held, previous) => {
  if (held === null) return;
  if (previous?.owner === held.owner) return;
  void nextTick(() => heading.value?.focus());
});
</script>

<template>
  <aside
    v-if="content !== null"
    :id="panelId"
    class="details-panel"
    aria-labelledby="details-panel-heading"
    @keydown.esc="closePanel()"
  >
    <div class="panel-head">
      <h2 id="details-panel-heading" ref="heading" tabindex="-1">
        {{ content.title }}
      </h2>
      <button
        type="button"
        class="close"
        :aria-label="t('detailsPanel.close')"
        @click="closePanel()"
      >
        {{ t('detailsPanel.closeMark') }}
      </button>
    </div>
    <component
      :is="content.body"
      :key="content.serial"
      v-bind="content.props"
    />
  </aside>
</template>

<style scoped>
.details-panel {
  background: var(--color-surface-raised);
  border-inline-start: var(--border-width) solid var(--color-border);
  box-shadow: 0 0 var(--space-3) var(--color-shadow);
  box-sizing: border-box;
  inline-size: 22rem;
  inset-block: 0;
  inset-inline-end: 0;
  max-inline-size: 100%;
  overflow-y: auto;
  padding: var(--space-4);
  position: fixed;
  z-index: 10;
}

.panel-head {
  align-items: start;
  display: flex;
  gap: var(--space-2);
  justify-content: space-between;
}

.panel-head h2 {
  margin-block-start: 0;
}

.close {
  flex: none;
}
</style>
