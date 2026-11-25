<script setup lang="ts">
/* global HTMLElement, KeyboardEvent, document -- DOM types; src/ configures no browser globals */
import { nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import { useMessages } from '../i18n/index.ts';
import {
  backPanel,
  closePanel,
  openPanelContent,
  panelId,
  previousTitle,
} from '../composables/useDetailsPanel.ts';
import { insidePanel } from './panelScope.ts';

// The one details panel (D285): non-modal, on the inline-end side, over the
// content, which stays usable. Another trigger replaces its content. Opening
// it moves focus to its heading. Escape closes it wherever focus is, unless a
// modal dialog is open, and the close button does too; focus returns to the
// trigger (D304). An open preview takes the Escape first. A term trigger
// inside the panel replaces its content, and Back restores the content it
// replaced (D362).
const { t } = useMessages();
const content = openPanelContent;
const heading = ref<HTMLElement | null>(null);
provide(insidePanel, true);

// Escape closes the panel wherever focus is. A preview closes first: its
// handler runs in the capture phase and stops the key press. A modal dialog
// closes itself on Escape and keeps the panel.
function onEscape(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || content.value === null) return;
  if (document.querySelector(':modal') !== null) return;
  closePanel();
}
onMounted(() => document.addEventListener('keydown', onEscape));
onBeforeUnmount(() => document.removeEventListener('keydown', onEscape));

// Each content shown, a step and Back included, moves focus to its heading.
watch(
  () => content.value?.serial,
  (held) => {
    if (held === undefined) return;
    void nextTick(() => heading.value?.focus());
  },
);
</script>

<template>
  <aside
    v-if="content !== null"
    :id="panelId"
    class="details-panel"
    aria-labelledby="details-panel-heading"
  >
    <button
      v-if="previousTitle !== null"
      type="button"
      class="back"
      @click="backPanel()"
    >
      {{ t('detailsPanel.back', { title: previousTitle }) }}
    </button>
    <div class="panel-head">
      <h2
        id="details-panel-heading"
        ref="heading"
        tabindex="-1"
        :lang="content.lang ?? undefined"
      >
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

.back {
  margin-block-end: var(--space-2);
}
</style>
