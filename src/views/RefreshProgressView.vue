<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ApiError } from '../api/client.ts';
import { useEngine } from '../api/engine.ts';
import type { ScreenState as ScreenStateType } from '../api/useScreenData.ts';
import ActionFailure from '../components/ActionFailure.vue';
import AppBreadcrumb from '../components/AppBreadcrumb.vue';
import OutcomePill from '../components/OutcomePill.vue';
import ScreenState from '../components/ScreenState.vue';
import StrategyName from '../components/StrategyName.vue';
import TableScroll from '../components/TableScroll.vue';
import TermName from '../components/TermName.vue';
import { createAnnouncer } from '../composables/announcer.ts';
import { useRouteParam } from '../composables/useRouteParam.ts';
import { formatCount } from '../i18n/format.ts';
import { useMessages } from '../i18n/index.ts';
import { compareLocation, compareCrumbs, runLocation } from './navigation.ts';
import { endOf, pillsOf, subjectKey, subjectOf } from './refreshModel.ts';

const { t, plural, locale } = useMessages();
const engine = useEngine();
const follower = engine.follower;
const refreshId = useRouteParam('refresh-progress', 'refreshId');
const crumbs = compareCrumbs(t('nav.refreshes'));

// The documents the names on this screen come from.
const preloaded = ref(false);
const preloadError = ref<unknown>(null);
async function preload(): Promise<void> {
  try {
    await engine.terms.preload(['references', 'help', 'strategies']);
    preloaded.value = true;
    preloadError.value = null;
  } catch (error) {
    preloadError.value = error;
  }
}

// The outcome codes in the order the engine serves them.
const outcomeOrder = ref<string[]>([]);
async function loadOutcomes(): Promise<void> {
  try {
    outcomeOrder.value = await engine.terms.codeSetValues('RunOutcome');
  } catch {
    // The failure is shown by the preload of the same document.
  }
}

watch(
  [refreshId, engine.state],
  ([id, state]) => {
    if (state.kind !== 'ready') return;
    follower.open(id);
    void preload();
    void loadOutcomes();
    void engine.info.load().catch(() => {});
  },
  { immediate: true },
);

const view = computed(() => follower.viewOf(refreshId.value));
const record = computed(() =>
  view.value.kind === 'job' ? view.value.record : null,
);

// While the engine or the first answer is pending, or a request failed.
const state = computed<ScreenStateType<never> | null>(() => {
  const engineState = engine.state.value;
  if (engineState.kind === 'pending') return { kind: 'connecting' };
  if (engineState.kind === 'not_ready')
    return { kind: 'engine', key: engineState.key };
  if (preloadError.value !== null)
    return { kind: 'error', error: preloadError.value };
  if (view.value.kind === 'error')
    return { kind: 'error', error: view.value.error };
  if (view.value.kind === 'loading' || !preloaded.value)
    return { kind: 'loading' };
  return null;
});

function retry(): void {
  if (preloadError.value !== null) void preload();
  if (view.value.kind === 'error') follower.open(refreshId.value);
}

const subject = computed(() =>
  record.value === null ? null : subjectOf(record.value),
);
const subjectText = computed(() => {
  const held = subject.value;
  if (held === null) return '';
  const key = subjectKey(held);
  return key !== null ? t(key) : held.kind === 'name' ? held.name : '';
});

const end = computed(() =>
  record.value === null ? null : endOf(record.value),
);
const stopping = computed(() => record.value?.state === 'stopping');
const live = computed(() => record.value !== null && end.value === null);

const heading = computed(() => {
  if (record.value === null) return '';
  if (end.value !== null)
    return t(`refresh.heading.${end.value}`, { subject: subjectText.value });
  if (stopping.value) return t('refresh.heading.stopping');
  return t('refresh.heading.running', { subject: subjectText.value });
});

const countsLine = computed(() => {
  const held = record.value;
  if (held === null) return '';
  return plural('refresh.counts', held.totals.total, {
    finished: formatCount(locale.value, held.totals.finished),
    total: formatCount(locale.value, held.totals.total),
  });
});

const pills = computed(() => {
  const counts = record.value?.summary?.counts;
  return counts === undefined
    ? null
    : pillsOf(counts as Record<string, number>, outcomeOrder.value);
});

const remaining = computed(() => record.value?.totals.remaining ?? 0);

const failure = computed(() => {
  const held = record.value?.failure;
  if (!held) return null;
  return new ApiError('failure', {
    reasonCode: held.reason_code,
    reason: held.reason,
    errors: held.errors,
    unreadable: held.unreadable,
  });
});

const providers = computed(() => record.value?.summary?.provider_check ?? []);

// Progress is announced from the counts line only, politely and no more than
// once in ten seconds; the end is always announced (D253).
const announced = ref('');
const announcer = createAnnouncer((text) => {
  announced.value = text;
});
onBeforeUnmount(() => announcer.dispose());
watch(
  () => [record.value?.refreshId, record.value?.totals.finished, end.value],
  () => {
    const held = record.value;
    if (held === null) return;
    if (end.value !== null)
      announcer.end(`${heading.value}. ${countsLine.value}`);
    else announcer.update(held.totals.finished, countsLine.value);
  },
);

// An ended refresh counts as seen once this screen shows it (D201).
watch(
  [record, end],
  () => {
    if (record.value !== null && end.value !== null)
      follower.markSeen(record.value.refreshId);
  },
  { immediate: true },
);

const stopDisabled = computed(
  () => follower.stopPending.value || stopping.value,
);
function stop(): void {
  if (stopDisabled.value) return;
  void follower.stop();
}
</script>

<template>
  <AppBreadcrumb :crumbs="crumbs" />
  <template v-if="state !== null">
    <ScreenState :state="state" @retry="retry()" />
  </template>
  <template v-else-if="view.kind === 'gone'">
    <p>{{ t('refresh.gone') }}</p>
    <p>
      <RouterLink :to="compareLocation(refreshId)">{{
        t('refresh.openComparison')
      }}</RouterLink>
    </p>
  </template>
  <template v-else-if="record !== null">
    <div class="heading-row">
      <h1>{{ heading }}</h1>
      <button
        v-if="live"
        type="button"
        :aria-disabled="stopDisabled ? 'true' : 'false'"
        @click="stop()"
      >
        {{ t('actions.stop') }}
      </button>
      <RouterLink
        v-else-if="end !== 'failed'"
        class="open-comparison"
        :to="compareLocation(record.refreshId)"
        >{{ t('refresh.openComparison') }}</RouterLink
      >
    </div>
    <div v-if="follower.stopError.value !== null" role="alert">
      <ActionFailure :error="follower.stopError.value" />
    </div>
    <div v-if="follower.error.value !== null && live" role="status">
      <ScreenState
        :state="{ kind: 'error', error: follower.error.value }"
        @retry="follower.open(refreshId)"
      />
    </div>
    <p class="counts-line">{{ countsLine }}</p>
    <p class="visually-hidden" aria-live="polite" aria-atomic="true">
      {{ announced }}
    </p>
    <ul v-if="pills !== null" class="pills">
      <li v-for="item in pills.outcomes" :key="item.code">
        <OutcomePill :code="item.code" :count="item.count" />
      </li>
      <li v-if="pills.unexpected > 0">
        <OutcomePill
          code="failed"
          :count="pills.unexpected"
          :label="t('refresh.unexpected')"
        />
      </li>
    </ul>
    <p v-if="end === 'stopped' && remaining > 0">
      {{ plural('refresh.notStarted', remaining) }}
    </p>
    <div v-if="failure !== null" role="alert">
      <ActionFailure :error="failure" />
    </div>
    <section v-if="providers.length > 0" aria-labelledby="providers-heading">
      <h2 id="providers-heading">{{ t('refresh.providersHeading') }}</h2>
      <dl class="providers">
        <template v-for="item in providers" :key="item.provider_id">
          <dt>
            {{ engine.info.providerName(item.provider_id) ?? item.provider_id }}
          </dt>
          <dd>
            <TermName code-set="ProviderCheckVerdict" :code="item.verdict" />
          </dd>
        </template>
      </dl>
    </section>
    <TableScroll v-if="record.rows.length > 0">
      <table :aria-label="t('refresh.tableLabel')">
        <thead>
          <tr>
            <th scope="col">{{ t('watchlist.columns.ticker') }}</th>
            <th scope="col">{{ t('watchlist.columns.strategy') }}</th>
            <th scope="col">{{ t('refresh.columns.result') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in record.rows" :key="row.position">
            <th scope="row">{{ row.ticker }}</th>
            <td><StrategyName :method-id="row.methodId" /></td>
            <td>
              <template v-if="!row.finished">{{
                t('refresh.rowRunning')
              }}</template>
              <template v-else-if="row.outcome !== null">
                <RouterLink
                  v-if="row.runId !== null"
                  :to="runLocation(row.runId)"
                >
                  <OutcomePill :code="row.outcome" />
                </RouterLink>
                <OutcomePill v-else :code="row.outcome" />
              </template>
              <span v-else-if="row.reasonCode !== null" class="problem">
                <TermName code-set="FailureReasonCode" :code="row.reasonCode" />
              </span>
              <span v-else class="problem">{{ t('refresh.unexpected') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </TableScroll>
    <p v-if="live && remaining > 0">
      {{ plural('refresh.notStartedYet', remaining) }}
    </p>
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

.counts-line {
  color: var(--color-text-secondary);
}

.pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  list-style: none;
  margin: 0 0 var(--space-3);
  padding: 0;
}

.problem {
  color: var(--color-negative);
}

.providers {
  display: grid;
  gap: var(--space-1) var(--space-4);
  grid-template-columns: max-content 1fr;
}

.providers dd {
  margin: 0;
}
</style>
