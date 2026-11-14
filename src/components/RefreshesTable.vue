<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEngine } from '../api/engine.ts';
import { pageSize, usePagedList } from '../api/useScreenData.ts';
import { formatCompletion, formatCount } from '../i18n/format.ts';
import { useMessages, type MessageKey } from '../i18n/index.ts';
import ScreenState from './ScreenState.vue';
import TermName from './TermName.vue';

const props = defineProps<{ watchlistId?: string; emptyKey: MessageKey }>();

const { t, locale } = useMessages();
const engine = useEngine();

// The outcome columns, in the order the engine serves the outcome code set.
const served = ref<string[]>([]);

const list = usePagedList(
  async (client, offset) => {
    if (offset === 0) {
      served.value = await engine.terms.codeSetValues('RunOutcome');
    }
    return (
      await client.get('/v1/refreshes', {
        query: {
          watchlist_id: props.watchlistId,
          limit: String(pageSize),
          offset: String(offset),
        },
      })
    ).data;
  },
  ['references', 'help'],
  [() => props.watchlistId],
);

const columns = computed(() => {
  const state = list.state.value;
  if (state.kind !== 'ready' || state.data.items.length === 0) return [];
  const counted = Object.keys(state.data.items[0]?.outcome_counts ?? {});
  return served.value.filter((code) => counted.includes(code));
});

function countOf(counts: Record<string, number>, code: string): string {
  return formatCount(locale.value, counts[code] ?? 0);
}
</script>

<template>
  <ScreenState
    v-if="list.state.value.kind !== 'ready'"
    :state="list.state.value"
    @retry="list.reload()"
  />
  <p v-else-if="list.state.value.data.items.length === 0">
    {{ t(emptyKey) }}
  </p>
  <template v-else>
    <table>
      <thead>
        <tr>
          <th scope="col">{{ t('refreshes.columns.completed') }}</th>
          <th scope="col">{{ t('refreshes.columns.watchlist') }}</th>
          <th scope="col">{{ t('refreshes.columns.runs') }}</th>
          <th v-for="code in columns" :key="code" scope="col">
            <TermName code-set="RunOutcome" :code="code" />
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="refresh in list.state.value.data.items"
          :key="refresh.refresh_id"
        >
          <th scope="row">
            {{
              formatCompletion(
                locale,
                refresh.first_completed_at,
                refresh.last_completed_at,
              )
            }}
          </th>
          <td>{{ refresh.watchlist_name ?? t('refreshes.adHoc') }}</td>
          <td>{{ formatCount(locale, refresh.run_count) }}</td>
          <td v-for="code in columns" :key="code">
            {{ countOf(refresh.outcome_counts, code) }}
          </td>
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
