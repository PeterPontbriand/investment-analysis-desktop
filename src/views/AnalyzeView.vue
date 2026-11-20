<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEngine } from '../api/engine.ts';
import { useScreenData } from '../api/useScreenData.ts';
import RefreshNowNote from '../components/RefreshNowNote.vue';
import ScreenState from '../components/ScreenState.vue';
import SecIdentityNotice from '../components/SecIdentityNotice.vue';
import {
  useRefreshStart,
  type RefreshNote,
} from '../composables/useRefreshStart.ts';
import { useMessages } from '../i18n/index.ts';
import { asOfTarget, tickersTarget } from '../selection/problems.ts';
import StrategyChooser from '../selection/StrategyChooser.vue';
import { splitTickers } from '../selection/tickers.ts';
import {
  isFieldFailure,
  useStrategySelection,
} from '../selection/useStrategySelection.ts';

// Analyze a ticker (D206, D207, D266 to D273): one ticker, one shared as-of
// date and the strategies to analyze it under. The chosen strategies run as
// one refresh of entries that belong to no watchlist, one entry for each, in
// the engine's strategy order.
const { t } = useMessages();
const engine = useEngine();
const refreshStart = useRefreshStart();

const { state, reload } = useScreenData(
  async () => ({ strategies: await engine.terms.strategies() }),
  ['strategies', 'references', 'help'],
);

const strategies = computed(() =>
  state.value.kind === 'ready' ? state.value.data.strategies : [],
);

const form = useStrategySelection({
  strategies: () => strategies.value,
  ownLabel: (target) =>
    target === tickersTarget
      ? t('analyze.ticker')
      : target === asOfTarget
        ? t('analyze.asOf')
        : undefined,
  strategyRequired: () => t('analyze.errors.strategyRequired'),
});
const { base, formElement, asOf, chosen, expanded, values, problems, forms } =
  form;

const tickerText = ref('');

const blocked = computed(
  () => refreshStart.pending.value || refreshStart.running.value,
);

// A failure the fields show is not shown again beside the button (D272).
const note: RefreshNote = {
  refused: refreshStart.refused,
  running: refreshStart.running,
  runningId: refreshStart.runningId,
  failure: computed(() =>
    isFieldFailure(refreshStart.failure.value)
      ? null
      : refreshStart.failure.value,
  ),
};

async function submit(): Promise<void> {
  if (blocked.value || state.value.kind !== 'ready') return;
  form.clearProblems();
  refreshStart.clear();
  const chosenList = form.chosenStrategies();
  const tickers = splitTickers(tickerText.value);
  const own =
    tickers.length === 0
      ? [form.problem(t('analyze.errors.tickerRequired'), tickersTarget)]
      : tickers.length > 1
        ? [form.problem(t('analyze.errors.oneTicker'), tickersTarget)]
        : [];
  if (await form.stopIfInvalid(chosenList, own)) return;
  const ticker = tickers[0];
  if (ticker === undefined) return;
  const failure = await refreshStart.startEntries(
    chosenList.map((strategy) => ({
      ticker,
      method_id: strategy.method,
      selection: form.selectionOf(strategy),
    })),
  );
  if (isFieldFailure(failure))
    await form.placeFailure(failure, chosenList, 'refreshEntries');
}

const aboveButton = form.aboveButton;
const describe = form.describe;
const messagesAt = (target: string) => form.messagesAt(target);
</script>

<template>
  <h1>{{ t('analyze.heading') }}</h1>
  <SecIdentityNotice />
  <ScreenState v-if="state.kind !== 'ready'" :state="state" @retry="reload()" />
  <form
    v-else
    ref="formElement"
    class="analyze-form"
    novalidate
    @submit.prevent="submit()"
  >
    <div class="field">
      <label :for="`${base}-ticker`"
        >{{ t('analyze.ticker')
        }}<span class="required-mark" aria-hidden="true"> *</span></label
      >
      <input
        :id="`${base}-ticker`"
        v-model="tickerText"
        type="text"
        autocomplete="off"
        :data-target="tickersTarget"
        aria-required="true"
        :aria-invalid="describe(tickersTarget) ? 'true' : undefined"
        :aria-describedby="describe(tickersTarget)"
      />
      <p
        v-for="problem in messagesAt(tickersTarget)"
        :id="problem.id"
        :key="problem.id"
        class="field-message"
      >
        {{ problem.text }}
      </p>
    </div>
    <div class="field">
      <label :for="`${base}-as-of`">{{ t('analyze.asOf') }}</label>
      <input
        :id="`${base}-as-of`"
        v-model="asOf"
        type="date"
        max="9999-12-31"
        :data-target="asOfTarget"
        :aria-invalid="describe(asOfTarget) ? 'true' : undefined"
        :aria-describedby="
          [describe(asOfTarget), `${base}-as-of-hint`].filter(Boolean).join(' ')
        "
      />
      <p :id="`${base}-as-of-hint`" class="hint">
        {{ t('analyze.asOfHint') }}
      </p>
      <p
        v-for="problem in messagesAt(asOfTarget)"
        :id="problem.id"
        :key="problem.id"
        class="field-message"
      >
        {{ problem.text }}
      </p>
    </div>
    <StrategyChooser
      :strategies="strategies"
      :forms="forms"
      :chosen="chosen"
      :expanded="expanded"
      :values="values"
      :problems="problems"
      @choose="form.choose"
      @toggle="form.toggle"
      @update="form.update"
      @retry="form.selectionForms.load"
    />
    <p class="hint">{{ t('analyze.requiredNote') }}</p>
    <p
      v-for="problem in aboveButton"
      :id="problem.id"
      :key="problem.id"
      class="field-message"
    >
      {{ problem.text }}
    </p>
    <div class="actions">
      <RefreshNowNote :refresh="note" />
      <button
        type="submit"
        class="primary"
        :aria-disabled="blocked ? 'true' : 'false'"
      >
        {{
          refreshStart.pending.value
            ? t('actions.starting')
            : t('analyze.analyze')
        }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.analyze-form {
  display: grid;
  gap: var(--space-4);
  max-inline-size: 40rem;
}

.field {
  display: grid;
  gap: var(--space-1);
  justify-items: start;
}

.hint {
  color: var(--color-text-secondary);
  font-size: var(--font-size-small);
  margin: 0;
}

.field-message {
  color: var(--color-negative);
  margin: 0;
}

.actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  justify-content: flex-end;
}
</style>
