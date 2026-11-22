<script setup lang="ts">
/* global HTMLElement, ResizeObserver -- DOM types; src/ configures no browser globals */
import { onBeforeUnmount, onMounted, ref } from 'vue';

// A table that scrolls sideways. With a `sticky` selector naming the table's
// sticky first column, the scroll container keeps that column's measured width
// as scroll padding, so whatever the browser scrolls into view (a focused link
// or button, a find result) stops clear of the column instead of under it
// (WCAG 2.4.11). The width is the column's own, measured again when it changes,
// so the two stay in step in both text directions (D317).
const props = defineProps<{ sticky?: string }>();

const box = ref<HTMLElement | null>(null);
const width = ref<number | null>(null);
let observer: ResizeObserver | null = null;

onMounted(() => {
  const column =
    props.sticky === undefined
      ? null
      : (box.value?.querySelector<HTMLElement>(props.sticky) ?? null);
  if (column === null || typeof ResizeObserver === 'undefined') return;
  observer = new ResizeObserver(() => {
    width.value = column.getBoundingClientRect().width;
  });
  observer.observe(column);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div
    ref="box"
    class="table-scroll"
    :style="
      width === null ? undefined : { scrollPaddingInlineStart: `${width}px` }
    "
  >
    <slot />
  </div>
</template>

<style scoped>
.table-scroll {
  margin-block-end: var(--space-4);
  overflow-x: auto;
}
</style>
