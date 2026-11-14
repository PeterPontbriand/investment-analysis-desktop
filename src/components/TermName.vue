<script setup lang="ts">
import { useEngine } from '../api/engine.ts';
import { useResolvedName } from '../composables/useResolvedName.ts';

const props = defineProps<{ codeSet: string; code: string }>();

const engine = useEngine();
const name = useResolvedName(
  () => engine.terms.term(props.codeSet, props.code),
  [() => props.codeSet, () => props.code],
);
</script>

<template>
  <span
    v-if="name"
    :data-term-id="name.termId ?? undefined"
    :lang="name.lang ?? undefined"
    >{{ name.text }}</span
  >
</template>
