<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEngine } from '../api/engine.ts';
import { useScreenData } from '../api/useScreenData.ts';
import ActionFailure from '../components/ActionFailure.vue';
import AppBreadcrumb from '../components/AppBreadcrumb.vue';
import ScreenState from '../components/ScreenState.vue';
import { useAction } from '../composables/useAction.ts';
import { leaveNotice } from '../composables/useNotice.ts';
import { useMessages } from '../i18n/index.ts';
import { formatConjunction } from '../selection/format.ts';
import { asOfTarget, tickersTarget } from '../selection/problems.ts';
import StrategyChooser from '../selection/StrategyChooser.vue';
import { splitTickers } from '../selection/tickers.ts';
import {
  isFieldFailure,
  useStrategySelection,
} from '../selection/useStrategySelection.ts';
import { addEntriesCrumbs } from './navigation.ts';

// Add entries (D227): tickers, one shared as-of date and the strategies to
// add them under. One request is sent for each chosen strategy, in the
// engine's strategy order (D194, D231).
const { t, plural, locale } = useMessages();
const route = useRoute();
const router = useRouter();
const engine = useEngine();
const watchlistId = computed(() => String(route.params.watchlistId));

const { state, reload } = useScreenData(
  async (client) => {
    const watchlist = (
      await client.get('/v1/watchlists/{watchlist_id}', {
        path: { watchlist_id: watchlistId.value },
      })
    ).data;
    return { watchlist, strategies: await engine.terms.strategies() };
  },
  ['strategies', 'references', 'help'],
  [watchlistId],
);

const crumbs = computed(() =>
  addEntriesCrumbs(
    t('nav.watchlists'),
    state.value.kind === 'ready'
      ? {
          id: watchlistId.value,
          name: state.value.data.watchlist.display_name,
        }
      : null,
  ),
);

const strategies = computed(() =>
  state.value.kind === 'ready' ? state.value.data.strategies : [],
);

const form = useStrategySelection({
  strategies: () => strategies.value,
  ownLabel: (target) =>
    target === tickersTarget
      ? t('addEntries.tickers')
      : target === asOfTarget
        ? t('addEntries.asOf')
        : undefined,
  strategyRequired: () => t('addEntries.errors.strategyRequired'),
});
const { base, formElement, asOf, chosen, expanded, values, problems, forms } =
  form;

const tickersText = ref('');
const partial = ref<{ count: number; names: string[] } | null>(null);

// The entry count when the form loaded and in the engine's latest answer.
let loadedCount = 0;
let lastCount = 0;
let loadedFor: string | null = null;

watch(
  state,
  (current) => {
    if (current.kind !== 'ready') return;
    if (loadedFor !== watchlistId.value) {
      loadedFor = watchlistId.value;
      loadedCount = lastCount = current.data.watchlist.entries.length;
    }
  },
  { immediate: true },
);

const action = useAction();
const adding = ref(false);

async function submit(): Promise<void> {
  if (adding.value || state.value.kind !== 'ready') return;
  form.clearProblems();
  partial.value = null;
  action.clear();
  const chosenList = form.chosenStrategies();
  const own =
    splitTickers(tickersText.value).length === 0
      ? [form.problem(t('addEntries.errors.tickersRequired'), tickersTarget)]
      : [];
  if (await form.stopIfInvalid(chosenList, own)) return;
  const tickers = splitTickers(tickersText.value);
  adding.value = true;
  try {
    let added = 0;
    const addedNames: string[] = [];
    for (const strategy of chosenList) {
      const result = await action.run((client) =>
        client.post('/v1/watchlists/{watchlist_id}/entries', {
          path: { watchlist_id: watchlistId.value },
          body: {
            method_id: strategy.method,
            tickers,
            selection: form.selectionOf(strategy),
          },
        }),
      );
      if (result === null) return;
      if (!result.ok) {
        if (addedNames.length > 0)
          partial.value = { count: added, names: addedNames };
        await form.placeFailure(result.error, [strategy], 'watchlistEntries');
        return;
      }
      const count = result.value.data.entries.length;
      added += count - lastCount;
      lastCount = count;
      addedNames.push(strategy.name);
      chosen.value.delete(strategy.method);
    }
    leaveNotice({ key: 'watchlist.added', count: lastCount - loadedCount });
    await router.push({
      name: 'watchlist',
      params: { watchlistId: watchlistId.value },
    });
  } finally {
    adding.value = false;
  }
}

// A failure that no field shows: above "Add", with "Try again" where it helps.
const aboveAddFailure = computed(() => {
  const failure = action.failure.value;
  if (failure === null) return null;
  return isFieldFailure(failure) ? null : failure;
});

const aboveAdd = form.aboveButton;
const describe = form.describe;
const messagesAt = (target: string) => form.messagesAt(target);

function cancel(): void {
  void router.push({
    name: 'watchlist',
    params: { watchlistId: watchlistId.value },
  });
}
</script>

<template>
  <AppBreadcrumb :crumbs="crumbs" />
  <template v-if="state.kind !== 'ready'">
    <ScreenState :state="state" @retry="reload()" />
  </template>
  <template v-else>
    <h1>
      {{ t('addEntries.heading', { name: state.data.watchlist.display_name }) }}
    </h1>
    <div role="status" class="status">
      <p v-if="partial !== null">
        {{
          plural('addEntries.partial', partial.count, {
            strategies: formatConjunction(locale, partial.names),
          })
        }}
      </p>
    </div>
    <form
      ref="formElement"
      class="add-form"
      novalidate
      @submit.prevent="submit()"
    >
      <div class="field">
        <label :for="`${base}-tickers`"
          >{{ t('addEntries.tickers')
          }}<span class="required-mark" aria-hidden="true"> *</span></label
        >
        <input
          :id="`${base}-tickers`"
          v-model="tickersText"
          type="text"
          autocomplete="off"
          :data-target="tickersTarget"
          aria-required="true"
          :aria-invalid="describe(tickersTarget) ? 'true' : undefined"
          :aria-describedby="
            [describe(tickersTarget), `${base}-tickers-hint`]
              .filter(Boolean)
              .join(' ')
          "
        />
        <p :id="`${base}-tickers-hint`" class="hint">
          {{ t('addEntries.tickersHint') }}
        </p>
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
        <label :for="`${base}-as-of`">{{ t('addEntries.asOf') }}</label>
        <input
          :id="`${base}-as-of`"
          v-model="asOf"
          type="date"
          max="9999-12-31"
          :data-target="asOfTarget"
          :aria-invalid="describe(asOfTarget) ? 'true' : undefined"
          :aria-describedby="
            [describe(asOfTarget), `${base}-as-of-hint`]
              .filter(Boolean)
              .join(' ')
          "
        />
        <p :id="`${base}-as-of-hint`" class="hint">
          {{ t('addEntries.asOfHint') }}
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
      <p class="hint">{{ t('addEntries.requiredNote') }}</p>
      <p
        v-for="problem in aboveAdd"
        :id="problem.id"
        :key="problem.id"
        class="field-message"
      >
        {{ problem.text }}
      </p>
      <div v-if="aboveAddFailure !== null" role="alert">
        <ActionFailure :error="aboveAddFailure" @retry="submit()" />
      </div>
      <div class="actions">
        <button type="button" @click="cancel()">
          {{ t('actions.cancel') }}
        </button>
        <button
          type="submit"
          class="primary"
          :aria-disabled="adding ? 'true' : 'false'"
        >
          {{ adding ? t('addEntries.adding') : t('addEntries.add') }}
        </button>
      </div>
    </form>
  </template>
</template>

<style scoped>
.add-form {
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
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}

.status p {
  margin: 0;
}
</style>
