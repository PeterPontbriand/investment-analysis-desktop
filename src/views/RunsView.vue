<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEngine } from '../api/engine.ts';
import type { ResolvedName } from '../api/terms.ts';
import { pageSize, usePagedList } from '../api/useScreenData.ts';
import EmptyMessage from '../components/EmptyMessage.vue';
import OutcomePill from '../components/OutcomePill.vue';
import ScreenState from '../components/ScreenState.vue';
import StrategyName from '../components/StrategyName.vue';
import TableScroll from '../components/TableScroll.vue';
import { formatInstant } from '../i18n/format.ts';
import { useMessages } from '../i18n/index.ts';
import {
  compareLocation,
  filtersFromQuery,
  filtersToQuery,
  runFromRunsLocation,
} from './navigation.ts';

const { t, locale } = useMessages();
const engine = useEngine();

const route = useRoute();
const router = useRouter();

// What the fields hold, and the filters they have applied to the list. The
// applied filters are kept in the route query (D157), so a run opened from the
// list can send the reader back to the same filters.
const initial = filtersFromQuery(route.query);
const tickerText = ref(initial.ticker);
const ticker = ref(initial.ticker);
const method = ref(initial.method);
const outcome = ref(initial.outcome);

function applyTicker(): void {
  ticker.value = tickerText.value.trim();
}

const appliedFilters = computed(() => ({
  ticker: ticker.value,
  method: method.value,
  outcome: outcome.value,
}));

// Applying a filter writes it to the query; a query written by a link (the
// Saved runs navigation item, a breadcrumb) sets the filters. The route is
// shared and changes before this screen goes away, so only this screen's own
// route counts.
watch(appliedFilters, (filters) => {
  if (route.name !== 'runs') return;
  void router.replace({ name: 'runs', query: filtersToQuery(filters) });
});
watch(
  () => route.query,
  (query) => {
    if (route.name !== 'runs') return;
    const filters = filtersFromQuery(query);
    tickerText.value = filters.ticker;
    ticker.value = filters.ticker;
    method.value = filters.method;
    outcome.value = filters.outcome;
  },
);

function clearFilters(): void {
  tickerText.value = '';
  ticker.value = '';
  method.value = '';
  outcome.value = '';
}

const filtered = computed(
  () => ticker.value !== '' || method.value !== '' || outcome.value !== '',
);

// The strategy options in declared order, the outcome options in served order.
const strategies = ref<{ method: string; name: ResolvedName }[]>([]);
const outcomes = ref<{ code: string; name: ResolvedName }[]>([]);

async function loadOptions(): Promise<void> {
  strategies.value = await engine.terms.strategies();
  const codes = await engine.terms.codeSetValues('RunOutcome');
  outcomes.value = await Promise.all(
    codes.map(async (code) => ({
      code,
      name: await engine.terms.term('RunOutcome', code),
    })),
  );
}

const list = usePagedList(
  async (client, offset) => {
    if (offset === 0) await loadOptions();
    return (
      await client.get('/v1/runs', {
        query: {
          ticker: ticker.value === '' ? undefined : ticker.value,
          method_id: method.value === '' ? undefined : method.value,
          outcome: outcome.value === '' ? undefined : outcome.value,
          limit: String(pageSize),
          offset: String(offset),
        },
      })
    ).data;
  },
  ['references', 'help', 'strategies'],
  [ticker, method, outcome],
);
</script>

<template>
  <h1>{{ t('nav.runs') }}</h1>
  <form class="filters" @submit.prevent="applyTicker">
    <label>
      {{ t('runs.filters.ticker') }}
      <input
        v-model="tickerText"
        type="text"
        autocomplete="off"
        @change="applyTicker"
      />
    </label>
    <label>
      {{ t('runs.filters.strategy') }}
      <select v-model="method">
        <option value="">{{ t('runs.filters.allStrategies') }}</option>
        <option
          v-for="item in strategies"
          :key="item.method"
          :value="item.method"
          :lang="item.name.lang ?? undefined"
          :data-term-id="item.name.termId ?? undefined"
        >
          {{ item.name.text }}
        </option>
      </select>
    </label>
    <label>
      {{ t('runs.filters.outcome') }}
      <select v-model="outcome">
        <option value="">{{ t('runs.filters.allOutcomes') }}</option>
        <option
          v-for="item in outcomes"
          :key="item.code"
          :value="item.code"
          :lang="item.name.lang ?? undefined"
          :data-term-id="item.name.termId ?? undefined"
        >
          {{ item.name.text }}
        </option>
      </select>
    </label>
    <button type="button" @click="clearFilters">
      {{ t('runs.filters.clear') }}
    </button>
  </form>
  <ScreenState
    v-if="list.state.value.kind !== 'ready'"
    :state="list.state.value"
    @retry="list.reload()"
  />
  <EmptyMessage v-else-if="list.state.value.data.items.length === 0">
    {{ filtered ? t('runs.emptyFiltered') : t('runs.empty') }}
  </EmptyMessage>
  <template v-else>
    <TableScroll>
      <table>
        <thead>
          <tr>
            <th scope="col">{{ t('runs.columns.completed') }}</th>
            <th scope="col">{{ t('runs.columns.ticker') }}</th>
            <th scope="col">{{ t('runs.columns.strategy') }}</th>
            <th scope="col">{{ t('runs.columns.outcome') }}</th>
            <th scope="col">{{ t('runs.columns.savedBy') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="run in list.state.value.data.items"
            :key="run.analysis_run_id"
          >
            <th scope="row">
              <RouterLink
                :to="runFromRunsLocation(run.analysis_run_id, appliedFilters)"
                >{{ formatInstant(locale, run.completed_at) }}</RouterLink
              >
            </th>
            <td>{{ run.ticker }}</td>
            <td><StrategyName :method-id="run.method_id" /></td>
            <td><OutcomePill :code="run.outcome" /></td>
            <td>
              <RouterLink
                v-if="run.refresh_id !== null"
                :to="compareLocation(run.refresh_id)"
                >{{ t('runs.savedBy.refresh') }}</RouterLink
              >
              <template v-else>{{ t('runs.savedBy.direct') }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </TableScroll>
    <ScreenState
      v-if="list.moreError.value"
      :state="{ kind: 'error', error: list.moreError.value }"
    />
    <button
      v-if="list.state.value.data.hasMore"
      type="button"
      :disabled="list.loadingMore.value"
      @click="list.showMore()"
    >
      {{ t('common.showMore') }}
    </button>
  </template>
</template>

<style scoped>
.filters {
  align-items: end;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-block-end: var(--space-4);
}

.filters label {
  color: var(--color-text-secondary);
  display: flex;
  flex-direction: column;
  font-size: var(--font-size-small);
  gap: var(--space-1);
}
</style>
