<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useScreenData } from '../api/useScreenData.ts';
import AppBreadcrumb from '../components/AppBreadcrumb.vue';
import RefreshesTable from '../components/RefreshesTable.vue';
import ScreenState from '../components/ScreenState.vue';
import StrategyName from '../components/StrategyName.vue';
import { formatDateOrInstant, formatInstant } from '../i18n/format.ts';
import { useMessages } from '../i18n/index.ts';

const { t, plural, locale } = useMessages();
const route = useRoute();
const watchlistId = computed(() => String(route.params.watchlistId));

const { state, reload } = useScreenData(
  async (client) =>
    (
      await client.get('/v1/watchlists/{watchlist_id}', {
        path: { watchlist_id: watchlistId.value },
      })
    ).data,
  [watchlistId],
);
</script>

<template>
  <AppBreadcrumb
    :current="
      state.kind === 'ready' ? state.data.display_name : t('nav.watchlists')
    "
    :in-watchlists="state.kind === 'ready'"
  />
  <ScreenState v-if="state.kind !== 'ready'" :state="state" @retry="reload()" />
  <template v-else>
    <h1>{{ state.data.display_name }}</h1>
    <p>
      {{
        plural('watchlist.summary', state.data.entries.length, {
          date: formatInstant(locale, state.data.created_at),
        })
      }}
    </p>
    <p v-if="state.data.entries.length === 0">{{ t('watchlist.noEntries') }}</p>
    <table v-else>
      <thead>
        <tr>
          <th scope="col">{{ t('watchlist.columns.position') }}</th>
          <th scope="col">{{ t('watchlist.columns.ticker') }}</th>
          <th scope="col">{{ t('watchlist.columns.strategy') }}</th>
          <th scope="col">{{ t('watchlist.columns.asOf') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in state.data.entries" :key="entry.index">
          <th scope="row">{{ entry.index }}</th>
          <td>{{ entry.ticker }}</td>
          <td><StrategyName :method-id="entry.selection.method_id" /></td>
          <td>
            {{
              entry.selection.as_of
                ? formatDateOrInstant(locale, entry.selection.as_of)
                : t('watchlist.latestData')
            }}
          </td>
        </tr>
      </tbody>
    </table>
    <section aria-labelledby="watchlist-refreshes-heading">
      <h2 id="watchlist-refreshes-heading">
        {{ t('watchlist.refreshesHeading') }}
      </h2>
      <RefreshesTable
        :watchlist-id="state.data.watchlist_id"
        empty-key="watchlist.noRefreshes"
      />
    </section>
  </template>
</template>
