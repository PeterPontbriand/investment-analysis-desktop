<script setup lang="ts">
/* global document, HTMLElement, ResizeObserver -- DOM types; src/ configures no browser globals */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

// Text as the engine wrote it, laid out so no line scrolls sideways (D329).
// Each line is its own block. Its own leading spaces stay in the text, so
// copying a line gives the original line; the block's padding is the width of
// those spaces plus two columns, and a negative first-line indent pulls the
// first line back to the margin, so its spaces put the text at the line's own
// indentation and every continuation line starts two columns further in (a
// hanging indent).
//
// The widths are measured, not computed from the `ch` unit: some engines round
// `ch` to whole pixels, and lay out a run of spaces by a width that is not a
// multiple of one space's, so a deep line's indentation drifts off the columns
// its own spaces occupy. For each distinct indentation in the text, and for the
// two-column hang, a run of that many spaces is measured in the text's own
// font; a hidden probe is watched, so a new font size measures again.
defineOptions({ inheritAttrs: false });

const props = defineProps<{ text: string }>();

const hangColumns = 2;
const probe = ref<HTMLElement | null>(null);
const root = ref<HTMLElement | null>(null);
// Pixels of a run of this many spaces; empty until measured, when `ch` stands in.
const widths = ref<Record<number, number>>({});
let observer: ResizeObserver | null = null;

const lines = computed(() =>
  props.text.split('\n').map((text) => ({
    text,
    indent: text.length - text.trimStart().length,
  })),
);

function measure() {
  const container = root.value;
  if (container === null) return;
  const sizes = new Set([
    hangColumns,
    ...lines.value.map((line) => line.indent),
  ]);
  const measured: Record<number, number> = {};
  for (const size of sizes) {
    const run = document.createElement('span');
    run.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
    run.textContent = ' '.repeat(size);
    container.append(run);
    const width = run.getBoundingClientRect().width;
    run.remove();
    if (width > 0) measured[size] = width;
  }
  widths.value = measured;
}

function length(columns: number): string {
  const width = widths.value[columns];
  return width === undefined ? `${columns}ch` : `${width}px`;
}

onMounted(() => {
  measure();
  if (probe.value && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure);
    observer.observe(probe.value);
  }
});

watch(lines, () => void nextTick(measure));
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div ref="root" class="wrapped" :style="{ '--hang': length(hangColumns) }">
    <span ref="probe" class="probe" aria-hidden="true">{{
      ' '.repeat(100)
    }}</span>
    <pre v-bind="$attrs"><span
      v-for="(line, index) in lines"
      :key="index"
      class="line"
      :style="{ '--lead': length(line.indent) }"
      >{{ line.text }}<br v-if="line.text === ''"
    /></span></pre>
  </div>
</template>

<style scoped>
.wrapped {
  font-family: var(--font-mono);
  font-size: var(--font-size-body);
  position: relative;
}

/* Spaces, measured for a change of font size; never seen or selected. */
.probe {
  inset-block-start: 0;
  inset-inline-start: 0;
  pointer-events: none;
  position: absolute;
  user-select: none;
  visibility: hidden;
  white-space: pre;
}

pre {
  font: inherit;
  margin: 0;
}

/* Long tokens with no break opportunity break anywhere. */
.line {
  display: block;
  min-block-size: 1lh;
  overflow-wrap: anywhere;
  padding-inline-start: calc(var(--lead) + var(--hang));
  text-indent: calc(-1 * (var(--lead) + var(--hang)));
  white-space: pre-wrap;
}
</style>
