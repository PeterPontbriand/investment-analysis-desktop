<script setup lang="ts">
import { useEngine } from '../api/engine.ts';
import { useResolvedName } from '../composables/useResolvedName.ts';
import TermTrigger from './TermTrigger.vue';

// `termOnly` shows nothing for a code the engine gives no term, instead of the
// code as served (D262). The name is a term trigger (GUI.4b) unless `plain`
// says it stands where no trigger may: inside a link or a ticker preview.
const props = defineProps<{
  codeSet: string;
  code: string;
  termOnly?: boolean;
  plain?: boolean;
}>();

const engine = useEngine();
const name = useResolvedName(
  () => engine.terms.term(props.codeSet, props.code),
  [() => props.codeSet, () => props.code],
);
</script>

<template>
  <TermTrigger
    v-if="name && !(termOnly && name.termId === null)"
    :term-id="plain ? null : name.termId"
    :name="name.text"
  >
    <span
      :data-term-id="name.termId ?? undefined"
      :lang="name.lang ?? undefined"
      >{{ name.text }}</span
    >
  </TermTrigger>
</template>
