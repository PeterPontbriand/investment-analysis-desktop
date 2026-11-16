<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import type { ApiResult, GetResponse } from '../api/client.ts';
import { useScreenData } from '../api/useScreenData.ts';
import AppBreadcrumb from '../components/AppBreadcrumb.vue';
import HeadlineCards from '../components/HeadlineCards.vue';
import OutcomePill from '../components/OutcomePill.vue';
import RunTabs from '../components/RunTabs.vue';
import ScreenState from '../components/ScreenState.vue';
import TermName from '../components/TermName.vue';
import { useRouteParam } from '../composables/useRouteParam.ts';
import {
  formatDate,
  formatDateOrInstant,
  formatInstant,
} from '../i18n/format.ts';
import { useMessages } from '../i18n/index.ts';
import { compareLocation, runCrumbs } from './navigation.ts';

type Overview = ApiResult<GetResponse<'/v1/runs/{analysis_run_id}/overview'>>;
type RunDocument = ApiResult<GetResponse<'/v1/runs/{analysis_run_id}'>>;
// The full document is requested beside the overview and fails on its own
// (D163): a strategy that is no longer declared can answer the overview and
// refuse the document.
type Loaded = {
  overview: Overview;
  document: { ok: true; result: RunDocument } | { ok: false; error: unknown };
};

const { t, locale } = useMessages();
const route = useRoute();
const runId = useRouteParam('run', 'runId');
// Where the reader came from, kept from when the screen opened: the route
// object changes before this screen goes away.
const query = route.query;

const { state, reload } = useScreenData<Loaded>(
  async (client) => {
    const path = { analysis_run_id: runId.value };
    const [overview, document] = await Promise.allSettled([
      client.get('/v1/runs/{analysis_run_id}/overview', { path }),
      client.get('/v1/runs/{analysis_run_id}', { path }),
    ]);
    if (overview.status === 'rejected') throw overview.reason;
    return {
      overview: overview.value,
      document:
        document.status === 'fulfilled'
          ? { ok: true, result: document.value }
          : { ok: false, error: document.reason },
    };
  },
  ['references', 'help'],
  [runId],
);

const loaded = computed(() =>
  state.value.kind === 'ready' ? state.value.data : null,
);

const fullDocument = computed(() => {
  const document = loaded.value?.document;
  return document?.ok ? document.result : null;
});

const companyName = computed(
  () => fullDocument.value?.data.security_identity.instrument_name ?? null,
);

const crumbs = computed(() =>
  runCrumbs(
    {
      runs: t('nav.runs'),
      refreshes: t('nav.refreshes'),
      refreshComparison: t('compare.refreshComparison'),
    },
    {
      fromRuns: query.from === 'runs',
      refreshId: loaded.value?.overview.data.refresh_id ?? null,
      query,
    },
  ),
);

const asOf = computed(() =>
  fullDocument.value === null
    ? null
    : t('runDetail.asOf', {
        date: formatDateOrInstant(
          locale.value,
          fullDocument.value.data.effective_as_of,
        ),
      }),
);
</script>

<template>
  <AppBreadcrumb :crumbs="crumbs" />
  <ScreenState v-if="state.kind !== 'ready'" :state="state" @retry="reload()" />
  <template v-else>
    <h1>
      <i18n-t
        :keypath="
          companyName === null ? 'runDetail.titleNoName' : 'runDetail.title'
        "
        scope="global"
        tag="span"
      >
        <template #name>{{ companyName }}</template>
        <template #ticker>{{ state.data.overview.data.ticker }}</template>
        <template #strategy>
          <span
            :data-term-id="state.data.overview.data.strategy.term ?? undefined"
            :lang="state.data.overview.contentLanguage ?? undefined"
            >{{ state.data.overview.data.strategy.label }}</span
          >
        </template>
      </i18n-t>
    </h1>
    <ul class="meta">
      <li><OutcomePill :code="state.data.overview.data.outcome" /></li>
      <li>
        {{
          t('runDetail.saved', {
            date: formatInstant(locale, state.data.overview.data.completed_at),
          })
        }}
      </li>
      <li v-if="asOf !== null">{{ asOf }}</li>
      <li
        v-if="
          state.data.overview.data.headline !== null &&
          state.data.overview.data.headline.period_end !== null
        "
      >
        <span :lang="state.data.overview.contentLanguage ?? undefined">{{
          state.data.overview.data.headline.period_end_label
        }}</span>
        {{ formatDate(locale, state.data.overview.data.headline.period_end) }}
      </li>
      <li v-if="state.data.overview.data.refresh_id !== null">
        <RouterLink
          :to="compareLocation(state.data.overview.data.refresh_id)"
          >{{ t('runDetail.savedByRefresh') }}</RouterLink
        >
      </li>
      <li v-else>{{ t('runDetail.savedByDirect') }}</li>
    </ul>
    <div
      v-if="state.data.overview.data.headline_unavailable !== null"
      class="panel"
    >
      <TermName
        code-set="HeadlineUnavailable"
        :code="state.data.overview.data.headline_unavailable"
      />
    </div>
    <HeadlineCards
      v-else-if="state.data.overview.data.headline !== null"
      :cells="state.data.overview.data.headline.cells"
      :lang="state.data.overview.contentLanguage"
    />
    <template v-if="state.data.document.ok">
      <section
        v-if="state.data.document.result.data.warnings.length > 0"
        aria-labelledby="run-warnings"
      >
        <h2 id="run-warnings">{{ t('runDetail.warnings') }}</h2>
        <ul :lang="state.data.document.result.contentLanguage ?? undefined">
          <li
            v-for="(warning, index) in state.data.document.result.data.warnings"
            :key="index"
          >
            {{ warning }}
          </li>
        </ul>
      </section>
      <section
        v-if="state.data.document.result.data.limitations.length > 0"
        aria-labelledby="run-limitations"
      >
        <h2 id="run-limitations">{{ t('runDetail.limitations') }}</h2>
        <ul :lang="state.data.document.result.contentLanguage ?? undefined">
          <li
            v-for="(limitation, index) in state.data.document.result.data
              .limitations"
            :key="index"
          >
            {{ limitation }}
          </li>
        </ul>
      </section>
    </template>
    <ScreenState
      v-else
      :state="{ kind: 'error', error: state.data.document.error }"
      @retry="reload()"
    />
    <RunTabs
      :run-id="runId"
      :run-document="state.data.document"
      @retry="reload()"
    />
  </template>
</template>

<style scoped>
.meta {
  align-items: center;
  list-style: none;
  margin: 0 0 var(--space-3);
  padding: 0;
  color: var(--color-text-secondary);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
}

.panel {
  background: var(--color-surface-raised);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  margin-block-end: var(--space-4);
  padding: var(--space-3) var(--space-4);
}
</style>
