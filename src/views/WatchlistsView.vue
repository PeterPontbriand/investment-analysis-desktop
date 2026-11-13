<script setup lang="ts">
import { useScreenData } from '../api/useScreenData.ts';
import AppBreadcrumb from '../components/AppBreadcrumb.vue';
import ScreenState from '../components/ScreenState.vue';
import { formatCount, formatInstant } from '../i18n/format.ts';
import { useMessages } from '../i18n/index.ts';

const { t, locale } = useMessages();
const { state, reload } = useScreenData(
  async (client) => (await client.get('/v1/watchlists')).data,
);
</script>

<template>
  <AppBreadcrumb :current="t('nav.watchlists')" />
  <h1>{{ t('nav.watchlists') }}</h1>
  <ScreenState v-if="state.kind !== 'ready'" :state="state" @retry="reload()" />
  <p v-else-if="state.data.items.length === 0">{{ t('watchlists.empty') }}</p>
  <table v-else>
    <thead>
      <tr>
        <th scope="col">{{ t('watchlists.columns.name') }}</th>
        <th scope="col">{{ t('watchlists.columns.entries') }}</th>
        <th scope="col">{{ t('watchlists.columns.created') }}</th>
        <th scope="col">{{ t('watchlists.columns.updated') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in state.data.items" :key="item.watchlist_id">
        <th scope="row">
          <RouterLink
            :to="{
              name: 'watchlist',
              params: { watchlistId: item.watchlist_id },
            }"
          >
            {{ item.display_name }}
          </RouterLink>
        </th>
        <td>{{ formatCount(locale, item.entry_count) }}</td>
        <td>{{ formatInstant(locale, item.created_at) }}</td>
        <td>
          {{
            item.updated_at === null
              ? t('common.noValue')
              : formatInstant(locale, item.updated_at)
          }}
        </td>
      </tr>
    </tbody>
  </table>
</template>
