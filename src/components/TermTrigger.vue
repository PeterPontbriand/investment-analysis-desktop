<script setup lang="ts">
/* global HTMLElement, KeyboardEvent, document -- DOM types; src/ configures no browser globals */
import { computed, inject, onBeforeUnmount, onMounted, ref, useId } from 'vue';
import { useEngine } from '../api/engine.ts';
import {
  isPanelOpenFor,
  panelId,
  stepPanel,
  togglePanel,
} from '../composables/useDetailsPanel.ts';
import { usePreviewTrigger } from '../composables/usePreviewTrigger.ts';
import { useResolvedEntry } from '../composables/useResolvedEntry.ts';
import { showPreviews } from '../preferences.ts';
import { useMessages } from '../i18n/index.ts';
import { insidePanel } from './panelScope.ts';
import { termDefinitionId } from './termDefinitionId.ts';
import PreviewPopup from './PreviewPopup.vue';
import TermDefinition from './TermDefinition.vue';

// A term that explains itself (D283, D313 to D327): a button with the shared
// preview and details panel of GUI.4a. The preview shows the definition; the
// panel shows the term's name, then the definition (B8).
//
// `text` is the trigger as running text or a column header, `pill` stays a
// pill, and `help` is the small separate button after a form label (B4).
// With no term id, or a term the help index does not list, the content shows
// as plain text.
const props = withDefaults(
  defineProps<{
    termId: string | null;
    // The name the trigger shows; the panel's heading until the index answers.
    name: string;
    kind?: 'text' | 'pill' | 'help';
    // For a help button: the id of the field or checkbox it belongs to. The
    // control is described by the definition, and F1 on it opens the panel
    // (D328). A legend has no control.
    control?: string;
  }>(),
  { kind: 'text', control: undefined },
);

const { t } = useMessages();
const engine = useEngine();
const entry = useResolvedEntry(
  () =>
    props.termId === null
      ? Promise.resolve(null)
      : engine.terms.entry(props.termId),
  [() => props.termId],
);
const button = ref<HTMLElement | null>(null);
const owner = {};
const popupId = useId();
const describedId = useId();
const preview = usePreviewTrigger();
const expanded = computed(() => isPanelOpenFor(owner));
// Inside the details panel a trigger steps to its term, with Back (D362).
const inPanel = inject(insidePanel, false);

function open(from: HTMLElement | null = button.value): void {
  const trigger = from;
  const term = entry.value;
  if (trigger === null || term === null) return;
  preview.dismiss();
  (inPanel ? stepPanel : togglePanel)({
    owner,
    trigger,
    title: term.name,
    lang: term.lang,
    body: TermDefinition,
    props: { definition: term.definition, lang: term.lang },
  });
}

// F1 on the focused field or checkbox opens its term's panel, and Escape gives
// focus back to the field (D328).
function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'F1' || props.control === undefined) return;
  const field = document.getElementById(props.control);
  if (field === null || document.activeElement !== field) return;
  event.preventDefault();
  open(field);
}
onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
  <template v-if="entry !== null">
    <button
      ref="button"
      type="button"
      class="term-trigger"
      :class="`kind-${kind}`"
      :tabindex="kind === 'help' ? -1 : undefined"
      :aria-label="
        kind === 'help' ? t('termHelp.about', { name: entry.name }) : undefined
      "
      :aria-expanded="expanded ? 'true' : 'false'"
      :aria-controls="panelId"
      :aria-describedby="
        preview.open.value ? popupId : showPreviews ? undefined : describedId
      "
      @click="open()"
      @pointerenter="preview.trigger.onPointerenter"
      @pointerleave="preview.trigger.onPointerleave"
      @focus="preview.trigger.onFocus"
      @blur="preview.trigger.onBlur"
    >
      <template v-if="kind === 'help'">{{ t('termHelp.mark') }}</template>
      <slot v-else />
    </button>
    <PreviewPopup
      v-if="preview.open.value"
      :id="popupId"
      :anchor="button"
      @pointerenter="preview.popup.onPointerenter"
      @pointerleave="preview.popup.onPointerleave"
    >
      <TermDefinition :definition="entry.definition" :lang="entry.lang" />
      <p v-if="control !== undefined" class="f1-hint">
        {{ t('termHelp.f1') }}
      </p>
    </PreviewPopup>
    <!-- With previews off the description stays, as hidden text (D330). -->
    <span
      v-if="!showPreviews"
      :id="describedId"
      class="visually-hidden"
      :lang="entry.lang ?? undefined"
      >{{ entry.definition
      }}<template v-if="control !== undefined">
        {{ t('termHelp.f1') }}</template
      ></span
    >
    <span
      v-if="kind === 'help' && control !== undefined"
      :id="termDefinitionId(control)"
      class="visually-hidden"
      :lang="entry.lang ?? undefined"
      >{{ entry.definition }}</span
    >
  </template>
  <template v-else-if="kind === 'help'" />
  <slot v-else />
</template>

<style scoped>
.term-trigger {
  background: none;
  border: none;
  color: inherit;
  cursor: help;
  font: inherit;
  padding: 0;
}

/* Running text and column headers: a dotted underline in the text colour. */
.f1-hint {
  color: var(--color-text-secondary);
  font-size: var(--font-size-small);
  margin-block-start: var(--space-1);
}

.kind-text {
  text-decoration: underline dotted currentcolor;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
}

.kind-text:hover,
.kind-text:focus-visible,
.kind-text[aria-expanded='true'] {
  text-decoration-style: solid;
}

/* A pill stays a pill: no underline, a darker background on hover. The
   pill itself is the slot content and keeps its own tone. */
.kind-pill:hover,
.kind-pill[aria-expanded='true'] {
  filter: brightness(0.92);
}

.kind-help {
  border: var(--border-width) solid var(--color-border);
  border-radius: 50%;
  font-size: var(--font-size-small);
  line-height: 1;
  margin-inline-start: var(--space-1);
  min-inline-size: 1.25rem;
  min-block-size: 1.25rem;
  text-align: center;
}

.kind-help:hover,
.kind-help[aria-expanded='true'] {
  background: var(--color-surface-raised);
}
</style>
