<script setup lang="ts">
import { computed } from 'vue';
import { useEngine } from '../api/engine.ts';
import type { ResolvedName } from '../api/terms.ts';
import {
  venueText,
  type ListingVenuePart,
} from '../composables/tickerDetailLines.ts';
import { useResolvedName } from '../composables/useResolvedName.ts';
import { useMessages } from '../i18n/index.ts';
import TermTrigger from './TermTrigger.vue';

// A listing venue as it reads (D360): its term's name, with the provider's
// wording when the two differ, or the wording alone when the engine names no
// term for the code. Unless `plain` (a ticker preview, which holds no
// controls), it is a term trigger: the venue's own term, or the term that
// explains the field when the venue has none (D361).
const props = defineProps<{ part: ListingVenuePart; plain?: boolean }>();

const { t } = useMessages();
const engine = useEngine();
const resolved = useResolvedName(
  (): Promise<ResolvedName> =>
    props.part.code === null
      ? Promise.resolve({
          text: props.part.provider_value,
          termId: null,
          lang: null,
        })
      : engine.terms.term('ListingVenue', props.part.code),
  [() => props.part.code, () => props.part.provider_value],
);

// The venue term's name, or null when the engine names no term for the code.
const name = computed(() =>
  resolved.value === null || resolved.value.termId === null
    ? null
    : resolved.value.text,
);
const text = computed(() =>
  venueText(props.part, name.value, (venue, wording) =>
    t('tickerDetails.venueWithWording', { name: venue, wording }),
  ),
);
const termId = computed(() =>
  props.plain ? null : (resolved.value?.termId ?? 'listing-venue'),
);
</script>

<template>
  <TermTrigger v-if="resolved !== null" :term-id="termId" :name="text">
    <span
      :data-term-id="resolved.termId ?? undefined"
      :lang="name === null ? undefined : (resolved.lang ?? undefined)"
      >{{ text }}</span
    >
  </TermTrigger>
</template>
