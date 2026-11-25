<script setup lang="ts">
import { computed } from 'vue';
import { failureView } from '../api/engineState.ts';
import type { IdentitySource } from '../api/identitySource.ts';
import { isDescribed, previewParts } from '../composables/tickerDetailLines.ts';
import { useTickerDetails } from '../composables/useTickerDetails.ts';
import { useMessages } from '../i18n/index.ts';
import TermName from './TermName.vue';
import VenueName from './VenueName.vue';

// The short, read-only preview of a ticker (D284, D290): the name, then the
// venue, the kind and the currency joined by a separator. It has no controls.
const props = defineProps<{
  source: IdentitySource;
  // The screen shows the company name beside the trigger, so the preview
  // leaves the name out (D331).
  omitName?: boolean;
}>();

const { t } = useMessages();
const { details } = useTickerDetails(() => props.source);

const failure = computed(() =>
  details.value.kind === 'error' ? failureView(details.value.error) : null,
);
</script>

<template>
  <p v-if="details.kind === 'loading'">{{ t('common.loading') }}</p>
  <p v-else-if="details.kind === 'none'">
    {{ t('tickerDetails.noneStored', { ticker: source.ticker }) }}
  </p>
  <template v-else-if="details.kind === 'error'">
    <p v-if="failure?.kind === 'reason'" :lang="failure.lang ?? undefined">
      {{ failure.text }}
    </p>
    <p v-else-if="failure">{{ t(failure.key) }}</p>
  </template>
  <template v-else-if="isDescribed(details.lines)">
    <p v-if="details.lines.name !== null && !omitName" class="name">
      {{ details.lines.name }}
    </p>
    <p>
      <template
        v-for="(part, index) in previewParts(details.lines)"
        :key="index"
      >
        <template v-if="index > 0">{{ ` ${t('common.separator')} ` }}</template>
        <TermName
          v-if="'kind' in part"
          code-set="InstrumentKind"
          :code="part.kind"
          plain
        />
        <VenueName v-else-if="'venue' in part" :part="part.venue" plain />
        <template v-else>{{ part.text }}</template>
      </template>
    </p>
  </template>
  <p v-else>
    {{
      t(
        details.current
          ? 'tickerDetails.noneDescribed'
          : 'tickerDetails.noneKept',
        { ticker: source.ticker },
      )
    }}
  </p>
</template>

<style scoped>
.name {
  font-weight: var(--font-weight-medium);
}
</style>
