<script setup lang="ts">
import { useEngine } from '../api/engine.ts';
import { useResolvedName } from '../composables/useResolvedName.ts';

// `termOnly` shows nothing for a code the engine gives no term, instead of the
// code as served (D262).
const props = defineProps<{
  codeSet: string;
  code: string;
  termOnly?: boolean;
}>();

const engine = useEngine();
const name = useResolvedName(
  () => engine.terms.term(props.codeSet, props.code),
  [() => props.codeSet, () => props.code],
);
</script>

<template>
  <span
    v-if="name && !(termOnly && name.termId === null)"
    :data-term-id="name.termId ?? undefined"
    :lang="name.lang ?? undefined"
    >{{ name.text }}</span
  >
</template>
