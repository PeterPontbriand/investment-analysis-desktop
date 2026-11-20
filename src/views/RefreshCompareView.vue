<script setup lang="ts">
import { computed } from 'vue';
import { useEngine } from '../api/engine.ts';
import { useScreenData } from '../api/useScreenData.ts';
import AppBreadcrumb from '../components/AppBreadcrumb.vue';
import CompareRunCells from '../components/CompareRunCells.vue';
import RefreshNowButton from '../components/RefreshNowButton.vue';
import RefreshNowNote from '../components/RefreshNowNote.vue';
import SecIdentityNotice from '../components/SecIdentityNotice.vue';
import ScreenState from '../components/ScreenState.vue';
import StrategyName from '../components/StrategyName.vue';
import TableScroll from '../components/TableScroll.vue';
import OutcomePill from '../components/OutcomePill.vue';
import { useRefreshStart } from '../composables/useRefreshStart.ts';
import { useRouteParam } from '../composables/useRouteParam.ts';
import { formatCompletion, formatCount } from '../i18n/format.ts';
import { useMessages } from '../i18n/index.ts';
import { groupsOf, outcomeCountsOf } from './compareModel.ts';
import { compareCrumbs, progressLocation } from './navigation.ts';

const { t, plural, locale } = useMessages();
const engine = useEngine();
const refreshId = useRouteParam('refresh', 'refreshId');
const refreshStart = useRefreshStart();
// The follower knows this refresh is still running (D252).
const stillRunning = computed(
  () => engine.follower.runningId.value === refreshId.value,
);

const { state, reload } = useScreenData(
  async (client) => {
    const [result, outcomes] = await Promise.all([
      client.get('/v1/refreshes/{refresh_id}/compare', {
        path: { refresh_id: refreshId.value },
      }),
      engine.terms.codeSetValues('RunOutcome'),
    ]);
    return { document: result.data, lang: result.contentLanguage, outcomes };
  },
  ['references', 'help', 'strategies'],
  [refreshId],
);

const loaded = computed(() =>
  state.value.kind === 'ready' ? state.value.data : null,
);

const watchlistName = computed(() =>
  loaded.value === null
    ? ''
    : (loaded.value.document.watchlist_name ?? t('refreshes.adHoc')),
);

const time = computed(() =>
  loaded.value === null
    ? ''
    : formatCompletion(
        locale.value,
        loaded.value.document.first_completed_at,
        loaded.value.document.last_completed_at,
      ),
);

const heading = computed(() =>
  t('compare.heading', { watchlist: watchlistName.value, time: time.value }),
);
const crumbs = compareCrumbs(t('nav.refreshes'));

const groups = computed(() =>
  loaded.value === null ? [] : groupsOf(loaded.value.document),
);

const counts = computed(() =>
  loaded.value === null
    ? []
    : outcomeCountsOf(loaded.value.document, loaded.value.outcomes),
);
</script>

<template>
  <AppBreadcrumb :crumbs="crumbs" />
  <ScreenState v-if="state.kind !== 'ready'" :state="state" @retry="reload()" />
  <template v-else>
    <div class="heading-row">
      <h1>{{ heading }}</h1>
      <RefreshNowButton
        v-if="state.data.document.watchlist_id !== null"
        :refresh="refreshStart"
        :watchlist-id="state.data.document.watchlist_id"
      />
    </div>
    <RefreshNowNote
      v-if="state.data.document.watchlist_id !== null"
      :refresh="refreshStart"
    />
    <SecIdentityNotice v-if="state.data.document.watchlist_id !== null" />
    <p v-if="stillRunning" role="status">
      {{ t('refresh.stillRunning') }}
      <RouterLink :to="progressLocation(refreshId)">{{
        t('refresh.showProgress')
      }}</RouterLink>
    </p>
    <ul class="counts">
      <li>
        {{
          plural('compare.runCount', state.data.document.run_count, {
            runs: formatCount(locale, state.data.document.run_count),
          })
        }}
      </li>
      <li v-for="item in counts" :key="item.code">
        <OutcomePill :code="item.code" :count="item.count" />
      </li>
    </ul>
    <TableScroll>
      <table class="compare">
        <thead>
          <tr>
            <th class="ticker" rowspan="2" scope="col">
              {{ t('compare.columns.ticker') }}
            </th>
            <th
              v-for="group in groups"
              :key="group.index"
              class="group-start"
              :colspan="group.span"
              scope="colgroup"
            >
              <StrategyName :method-id="group.methodId" />
            </th>
          </tr>
          <tr>
            <template v-for="group in groups" :key="group.index">
              <th v-if="group.columns.length === 0" class="group-start"></th>
              <th
                v-for="(column, position) in group.columns"
                :key="column.key"
                :class="{ 'group-start': position === 0 }"
                scope="col"
              >
                <span
                  :data-term-id="column.term"
                  :lang="state.data.lang ?? undefined"
                  >{{ column.label }}</span
                >
              </th>
              <th v-if="group.outcomeColumn" scope="col">
                {{ t('compare.columns.outcome') }}
              </th>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in state.data.document.rows" :key="row.ticker">
            <th class="ticker" scope="row">{{ row.ticker }}</th>
            <template v-for="group in groups" :key="group.index">
              <CompareRunCells
                :run="row.entries[group.index]?.run ?? null"
                :group="group"
                :lang="state.data.lang"
              />
            </template>
          </tr>
        </tbody>
      </table>
    </TableScroll>
  </template>
</template>

<style scoped>
.heading-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: space-between;
}

.counts {
  color: var(--color-text-secondary);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  list-style: none;
  margin: 0 0 var(--space-3);
  padding: 0;
}

.compare .ticker {
  background: var(--color-surface);
  border-inline-end: var(--border-width) solid var(--color-border);
  inset-inline-start: 0;
  position: sticky;
  z-index: 1;
}

.compare tbody .ticker {
  font-weight: var(--font-weight-medium);
}

.group-start {
  border-inline-start: var(--border-width) solid var(--color-border);
}
</style>
