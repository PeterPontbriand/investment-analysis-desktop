<script setup lang="ts">
import { useEngine } from '../api/engine.ts';
import { useResolvedName } from '../composables/useResolvedName.ts';
import TermTrigger from './TermTrigger.vue';

const props = defineProps<{ methodId: string }>();

const engine = useEngine();
const name = useResolvedName(
  () => engine.terms.strategy(props.methodId),
  [() => props.methodId],
);
</script>

<template>
  <TermTrigger v-if="name" :term-id="name.termId" :name="name.text">
    <span
      :data-term-id="name.termId ?? undefined"
      :lang="name.lang ?? undefined"
      >{{ name.text }}</span
    >
  </TermTrigger>
</template>
