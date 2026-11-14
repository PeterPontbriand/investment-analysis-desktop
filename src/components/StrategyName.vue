<script setup lang="ts">
import { useEngine } from '../api/engine.ts';
import { useResolvedName } from '../composables/useResolvedName.ts';

const props = defineProps<{ methodId: string }>();

const engine = useEngine();
const name = useResolvedName(
  () => engine.terms.strategy(props.methodId),
  [() => props.methodId],
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
