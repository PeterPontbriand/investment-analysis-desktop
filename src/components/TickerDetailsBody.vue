<script setup lang="ts">
import { computed } from 'vue';
import { useEngine } from '../api/engine.ts';
import type { IdentitySource } from '../api/identitySource.ts';
import { isDescribed } from '../composables/tickerDetailLines.ts';
import { useAction } from '../composables/useAction.ts';
import { useTickerDetails } from '../composables/useTickerDetails.ts';
import { useMessages } from '../i18n/index.ts';
import ActionFailure from './ActionFailure.vue';
import ScreenState from './ScreenState.vue';
import TickerDetailLines from './TickerDetailLines.vue';

// The body of the details panel for a ticker (D285, D290, D291, D292). A
// current profile always offers "Look up again", and a ticker with no stored
// profile offers "Look up". A lookup only happens when the user chooses it.
const props = defineProps<{ source: IdentitySource }>();

const { t } = useMessages();
const engine = useEngine();
const { details, reload, showProfile } = useTickerDetails(() => props.source);
const lookup = useAction();

async function lookUp(): Promise<void> {
  const result = await lookup.run(() =>
    engine.identities.lookUp(props.source.ticker),
  );
  if (result?.ok) showProfile(result.value);
}

const canLookUp = computed(
  () =>
    props.source.kind === 'currentProfile' &&
    (details.value.kind === 'none' ||
      (details.value.kind === 'described' && details.value.current)),
);
const noProfile = computed(() => details.value.kind === 'none');
</script>

<template>
  <p v-if="details.kind === 'loading'">{{ t('common.loading') }}</p>
  <ScreenState
    v-else-if="details.kind === 'error'"
    :state="{ kind: 'error', error: details.error }"
    @retry="reload()"
  />
  <p v-else-if="details.kind === 'none'">
    {{ t('tickerDetails.noneStored', { ticker: source.ticker }) }}
  </p>
  <template v-else>
    <TickerDetailLines
      v-if="isDescribed(details.lines) || details.lines.stamp !== null"
      :lines="details.lines"
    />
    <p v-if="!isDescribed(details.lines)">
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
  <p v-if="canLookUp" class="actions">
    <button
      type="button"
      :class="{ primary: noProfile }"
      :aria-disabled="lookup.pending.value ? 'true' : 'false'"
      @click="lookUp()"
    >
      {{
        lookup.pending.value
          ? t('tickerDetails.lookingUp')
          : noProfile
            ? t('tickerDetails.lookUp')
            : t('tickerDetails.lookUpAgain')
      }}
    </button>
  </p>
  <div v-if="lookup.failure.value !== null" role="alert">
    <ActionFailure :error="lookup.failure.value" @retry="lookUp()" />
  </div>
</template>

<style scoped>
.actions {
  margin-block-start: var(--space-3);
}
</style>
