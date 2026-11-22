<script setup lang="ts">
/* global HTMLElement -- DOM types; src/ configures no browser globals */
import { computed, ref, useId } from 'vue';
import type { IdentitySource } from '../api/identitySource.ts';
import {
  isPanelOpenFor,
  panelId,
  togglePanel,
} from '../composables/useDetailsPanel.ts';
import { isDescribed, previewParts } from '../composables/tickerDetailLines.ts';
import { useTickerDetails } from '../composables/useTickerDetails.ts';
import { usePreviewTrigger } from '../composables/usePreviewTrigger.ts';
import { showPreviews } from '../preferences.ts';
import { useMessages } from '../i18n/index.ts';
import PreviewPopup from './PreviewPopup.vue';
import TickerDetailsBody from './TickerDetailsBody.vue';
import TickerPreview from './TickerPreview.vue';

// A ticker that explains itself (D283, D286): a button styled as text. Hover or
// keyboard focus shows a preview; a click, a tap or Enter opens the details
// panel. The source says whose details they are (D289).
const props = defineProps<{
  source: IdentitySource;
  // The heading this ticker stands in shows the company name too, so the
  // preview leaves the name out, and none opens when nothing else remains
  // (D331). The details panel keeps every line.
  nameShown?: boolean;
}>();

const { t } = useMessages();
const button = ref<HTMLElement | null>(null);
const owner = {};
const popupId = useId();
const describedId = useId();
// Only a ticker beside its name needs the details to know what its preview
// would hold; the others always open one.
const known = props.nameShown ? useTickerDetails(() => props.source) : null;
const hasPreview = (): boolean => {
  const held = known?.details.value;
  if (held?.kind !== 'described' || !isDescribed(held.lines)) return true;
  return previewParts(held.lines).length > 0;
};
const preview = usePreviewTrigger(hasPreview);
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
    :aria-describedby="
      preview.open.value
        ? popupId
        : showPreviews || !hasPreview()
          ? undefined
          : describedId
    "
    @click="open()"
    @pointerenter="preview.trigger.onPointerenter"
    @pointerleave="preview.trigger.onPointerleave"
    @focus="preview.trigger.onFocus"
    @blur="preview.trigger.onBlur"
  >
    {{ source.ticker }}
  </button>
  <!-- With previews off the description stays, as hidden text (D330). -->
  <span
    v-if="!showPreviews && hasPreview()"
    :id="describedId"
    class="visually-hidden"
    ><TickerPreview :source="source" :omit-name="nameShown"
  /></span>
  <PreviewPopup
    v-if="preview.open.value"
    :id="popupId"
    :anchor="button"
    @pointerenter="preview.popup.onPointerenter"
    @pointerleave="preview.popup.onPointerleave"
  >
    <TickerPreview :source="source" :omit-name="nameShown" />
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
