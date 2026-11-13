<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEngine } from '../api/engine.ts';
import type { ResolvedName } from '../api/terms.ts';
import { pageSize, usePagedList } from '../api/useScreenData.ts';
import AppBreadcrumb from '../components/AppBreadcrumb.vue';
import ScreenState from '../components/ScreenState.vue';
import StrategyName from '../components/StrategyName.vue';
import TermName from '../components/TermName.vue';
import { formatInstant } from '../i18n/format.ts';
import { useMessages } from '../i18n/index.ts';

const { t, locale } = useMessages();
const engine = useEngine();

// What the fields hold, and the filters they have applied to the list.
const tickerText = ref('');
const ticker = ref('');
const method = ref('');
const outcome = ref('');

function applyTicker(): void {
  ticker.value = tickerText.value.trim();
}

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
  await engine.terms.preload(['references', 'help', 'strategies']);
  strategies.value = await engine.terms.strategies();
  const codes = await engine.terms.codeSetValues('RunOutcome');
  outcomes.value = await Promise.all(
    codes.map(async (code) => ({
      code,
      name: await engine.terms.term('RunOutcome', code),
    })),
  );
}

// A failed help or strategies request fails the list, like a failed list request.
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
  [ticker, method, outcome],
);
</script>

<template>
  <AppBreadcrumb :current="t('nav.runs')" />
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
  <p v-else-if="list.state.value.data.items.length === 0">
    {{ filtered ? t('runs.emptyFiltered') : t('runs.empty') }}
  </p>
  <template v-else>
    <table>
      <thead>
        <tr>
          <th scope="col">{{ t('runs.columns.completed') }}</th>
          <th scope="col">{{ t('runs.columns.ticker') }}</th>
          <th scope="col">{{ t('runs.columns.strategy') }}</th>
          <th scope="col">{{ t('runs.columns.outcome') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="run in list.state.value.data.items"
          :key="run.analysis_run_id"
        >
          <th scope="row">{{ formatInstant(locale, run.completed_at) }}</th>
          <td>{{ run.ticker }}</td>
          <td><StrategyName :method-id="run.method_id" /></td>
          <td><TermName code-set="RunOutcome" :code="run.outcome" /></td>
        </tr>
      </tbody>
    </table>
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
  gap: 1rem;
  margin-block-end: 1rem;
}

.filters label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
</style>
