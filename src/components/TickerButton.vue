<script setup lang="ts">
/* global HTMLElement -- DOM types; src/ configures no browser globals */
import { computed, ref, useId } from 'vue';
import type { IdentitySource } from '../api/identitySource.ts';
import {
  isPanelOpenFor,
  panelId,
  togglePanel,
} from '../composables/useDetailsPanel.ts';
import { usePreviewTrigger } from '../composables/usePreviewTrigger.ts';
import { useMessages } from '../i18n/index.ts';
import PreviewPopup from './PreviewPopup.vue';
import TickerDetailsBody from './TickerDetailsBody.vue';
import TickerPreview from './TickerPreview.vue';

// A ticker that explains itself (D283, D286): a button styled as text. Hover or
// keyboard focus shows a preview; a click, a tap or Enter opens the details
// panel. The source says whose details they are (D289).
const props = defineProps<{ source: IdentitySource }>();

const { t } = useMessages();
const button = ref<HTMLElement | null>(null);
const owner = {};
const popupId = useId();
const preview = usePreviewTrigger();
const expanded = computed(() => isPanelOpenFor(owner));

function open(): void {
  const trigger = button.value;
  if (trigger === null) return;
  preview.dismiss();
  togglePanel({
    owner,
    trigger,
    title: t('tickerDetails.panelTitle', { ticker: props.source.ticker }),
    body: TickerDetailsBody,
    props: { source: props.source },
  });
}
</script>

<template>
  <button
    ref="button"
    type="button"
    class="ticker-button"
    :aria-expanded="expanded ? 'true' : 'false'"
    :aria-controls="panelId"
    :aria-describedby="preview.open.value ? popupId : undefined"
    @click="open()"
    @pointerenter="preview.trigger.onPointerenter"
    @pointerleave="preview.trigger.onPointerleave"
    @focus="preview.trigger.onFocus"
    @blur="preview.trigger.onBlur"
  >
    {{ source.ticker }}
  </button>
  <PreviewPopup
    v-if="preview.open.value"
    :id="popupId"
    :anchor="button"
    @pointerenter="preview.popup.onPointerenter"
    @pointerleave="preview.popup.onPointerleave"
  >
    <TickerPreview :source="source" />
  </PreviewPopup>
</template>

<style scoped>
.ticker-button {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding: 0;
  text-decoration: underline dotted var(--color-text-muted);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
}

.ticker-button:hover,
.ticker-button:focus-visible,
.ticker-button[aria-expanded='true'] {
  text-decoration-color: currentcolor;
  text-decoration-style: solid;
}
</style>
