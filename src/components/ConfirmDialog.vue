<script setup lang="ts">
/* global HTMLElement, HTMLDialogElement -- DOM types; src/ configures no browser globals */
import { nextTick, onMounted, ref, useId } from 'vue';
import { useMessages } from '../i18n/index.ts';
import ActionFailure from './ActionFailure.vue';

// A confirmation in a native modal dialog (D184). The parent mounts it to open
// it and unmounts it to close it. The browser keeps focus inside the dialog
// and makes the rest of the page inert; Escape and Cancel both ask the parent
// to close it, and focus then returns to the control that opened it (D220).
const props = defineProps<{
  title: string;
  confirmLabel: string;
  pendingLabel: string;
  pending: boolean;
  // The failure of the action, shown inside the dialog.
  error: unknown;
  // The control that opened the dialog.
  opener: HTMLElement | null;
  // The cancel button's text when it is not "Cancel".
  cancelLabel?: string;
}>();
const emit = defineEmits<{ confirm: []; cancel: []; retry: [] }>();

const { t } = useMessages();
const dialog = ref<HTMLDialogElement | null>(null);
const titleId = useId();

onMounted(() => dialog.value?.showModal());

function cancel(): void {
  emit('cancel');
  void nextTick(() => props.opener?.focus());
}

function confirm(): void {
  if (!props.pending) emit('confirm');
}
</script>

<template>
  <dialog ref="dialog" :aria-labelledby="titleId" @cancel.prevent="cancel()">
    <h2 :id="titleId">{{ title }}</h2>
    <slot />
    <div v-if="error !== null && error !== undefined" role="alert">
      <ActionFailure :error="error" @retry="$emit('retry')" />
    </div>
    <div class="actions">
      <button type="button" @click="cancel()">
        {{ cancelLabel ?? t('actions.cancel') }}
      </button>
      <button
        type="button"
        class="danger"
        :aria-disabled="pending ? 'true' : 'false'"
        @click="confirm()"
      >
        {{ pending ? pendingLabel : confirmLabel }}
      </button>
    </div>
  </dialog>
</template>

<style scoped>
dialog {
  background: var(--color-surface-raised);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  color: var(--color-text);
  inline-size: min(32rem, calc(100vw - 2 * var(--space-4)));
  padding: var(--space-4) var(--space-6);
}

dialog::backdrop {
  background: color-mix(in srgb, var(--color-surface) 70%, transparent);
}

h2 {
  margin-block-start: 0;
}

.actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  margin-block-start: var(--space-4);
}
</style>
