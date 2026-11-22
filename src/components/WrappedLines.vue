<script setup lang="ts">
import { computed } from 'vue';

// Text as the engine wrote it, laid out so no line scrolls sideways (D329).
// Each line is its own block. Its own leading spaces stay in the text, so
// copying a line gives the original line; the block's padding is the line's
// indentation plus two columns, and a negative first-line indent pulls the
// first line back to the margin, so its spaces put the text at the line's own
// indentation and every continuation line starts two columns further in (a
// hanging indent, in ch units because the text is monospaced).
const props = defineProps<{ text: string }>();

const lines = computed(() =>
  props.text.split('\n').map((text) => ({
    text,
    indent: text.length - text.trimStart().length,
  })),
);
</script>

<template>
  <span
    v-for="(line, index) in lines"
    :key="index"
    class="line"
    :style="{ '--indent': line.indent }"
    >{{ line.text }}<br v-if="line.text === ''"
  /></span>
</template>

<style scoped>
/* Long tokens with no break opportunity break anywhere. */
.line {
  display: block;
  min-block-size: 1lh;
  overflow-wrap: anywhere;
  padding-inline-start: calc((var(--indent) + 2) * 1ch);
  text-indent: calc((var(--indent) + 2) * -1ch);
  white-space: pre-wrap;
}
</style>
