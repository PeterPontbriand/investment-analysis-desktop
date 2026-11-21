<script setup lang="ts">
/* global HTMLElement -- DOM types; src/ configures no browser globals */
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from '@floating-ui/dom';
import { onBeforeUnmount, ref, watch } from 'vue';

// The popup of a preview (D284): a tooltip with no controls in it, placed
// beside its trigger. It flips and shifts at the window edges, and the start
// alignment follows the text direction (D287).
const props = defineProps<{ anchor: HTMLElement | null; id: string }>();
defineEmits<{ pointerenter: []; pointerleave: [] }>();

const popup = ref<HTMLElement | null>(null);
const placed = ref(false);
let stop: (() => void) | null = null;

function release(): void {
  stop?.();
  stop = null;
  placed.value = false;
}

watch(
  popup,
  (element) => {
    release();
    const anchor = props.anchor;
    if (element === null || anchor === null) return;
    stop = autoUpdate(anchor, element, async () => {
      const { x, y } = await computePosition(anchor, element, {
        strategy: 'fixed',
        placement: 'bottom-start',
        middleware: [offset(4), flip(), shift({ padding: 8 })],
      });
      Object.assign(element.style, { left: `${x}px`, top: `${y}px` });
      placed.value = true;
    });
  },
  { flush: 'post' },
);
onBeforeUnmount(release);
</script>

<template>
  <Teleport to="body">
    <div
      :id="id"
      ref="popup"
      role="tooltip"
      class="preview-popup"
      :class="{ placed }"
      @pointerenter="$emit('pointerenter')"
      @pointerleave="$emit('pointerleave')"
    >
      <slot />
    </div>
  </Teleport>
</template>

<style scoped>
.preview-popup {
  background: var(--color-surface-raised);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  box-shadow: 0 var(--space-1) var(--space-3) var(--color-shadow);
  color: var(--color-text);
  font-size: var(--font-size-body);
  inline-size: max-content;
  max-inline-size: 20rem;
  padding: var(--space-2) var(--space-3);
  position: fixed;
  visibility: hidden;
  z-index: 20;
}

.preview-popup.placed {
  visibility: visible;
}

.preview-popup :deep(p) {
  margin: 0;
}
</style>
