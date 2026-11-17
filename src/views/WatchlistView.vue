<script setup lang="ts">
/* global HTMLElement, HTMLButtonElement -- DOM types; src/ configures no browser globals */
import { computed, nextTick, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '../api/client.ts';
import { useEngine } from '../api/engine.ts';
import { useScreenData } from '../api/useScreenData.ts';
import AppBreadcrumb from '../components/AppBreadcrumb.vue';
import { watchlistCrumbs } from './navigation.ts';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import NameForm from '../components/NameForm.vue';
import RefreshesTable from '../components/RefreshesTable.vue';
import RemoveEntryButton from '../components/RemoveEntryButton.vue';
import RemoveEntryDialog from '../components/RemoveEntryDialog.vue';
import EmptyMessage from '../components/EmptyMessage.vue';
import ScreenState from '../components/ScreenState.vue';
import StrategyName from '../components/StrategyName.vue';
import TableScroll from '../components/TableScroll.vue';
import { useAction } from '../composables/useAction.ts';
import { leaveNotice, type Notice } from '../composables/useNotice.ts';
import { formatDateOrInstant, formatInstant } from '../i18n/format.ts';
import { useMessages } from '../i18n/index.ts';
import type { RemovableEntry, RemoveChoice } from './removeOptions.ts';

const { t, plural, locale } = useMessages();
const route = useRoute();
const router = useRouter();
const engine = useEngine();
const watchlistId = computed(() => String(route.params.watchlistId));

const { state, reload, replace } = useScreenData(
  async (client) =>
    (
      await client.get('/v1/watchlists/{watchlist_id}', {
        path: { watchlist_id: watchlistId.value },
      })
    ).data,
  ['strategies'],
  [watchlistId],
);

const crumbs = watchlistCrumbs(t('nav.watchlists'));
const heading = ref<HTMLElement | null>(null);
const status = ref<Notice | null>(null);

function focusHeading(): void {
  void nextTick(() => heading.value?.focus());
}

function isNotFound(error: unknown): boolean {
  return (
    error instanceof ApiError && error.reasonCode === 'watchlist_not_found'
  );
}

const unreadable = computed(
  () =>
    state.value.kind === 'error' &&
    state.value.error instanceof ApiError &&
    state.value.error.reasonCode === 'stored_selection_unreadable',
);

// Rename (D221).
const renaming = ref(false);
const renameButton = ref<HTMLButtonElement | null>(null);
const rename = useAction();

function openRename(): void {
  rename.clear();
  renaming.value = true;
}

function closeRename(): void {
  renaming.value = false;
  const failed = isNotFound(rename.failure.value);
  rename.clear();
  void nextTick(() => renameButton.value?.focus());
  if (failed) void reload();
}

async function submitRename(name: string): Promise<void> {
  const result = await rename.run((client) =>
    client.patch('/v1/watchlists/{watchlist_id}', {
      path: { watchlist_id: watchlistId.value },
      body: { name },
    }),
  );
  if (!result?.ok) return;
  renaming.value = false;
  const document = result.value.data;
  if (document.watchlist) replace(document.watchlist);
  else void reload();
  focusHeading();
}

// Remove (D187, D219).
const removing = ref<RemovableEntry | null>(null);
const removeOpener = ref<HTMLElement | null>(null);
const remove = useAction();

function openRemove(entry: RemovableEntry, opener: HTMLElement): void {
  remove.clear();
  removing.value = entry;
  removeOpener.value = opener;
}

function closeRemove(): void {
  removing.value = null;
  const failed = isNotFound(remove.failure.value);
  remove.clear();
  if (failed) void reload();
}

async function confirmRemove(choice: RemoveChoice): Promise<void> {
  const entry = removing.value;
  if (entry === null) return;
  const result = await remove.run((client) => {
    const path = { watchlist_id: watchlistId.value };
    if (choice === 'ticker')
      return client.post('/v1/watchlists/{watchlist_id}/remove-tickers', {
        path,
        body: { tickers: [entry.ticker] },
      });
    if (choice === 'method')
      return client.post('/v1/watchlists/{watchlist_id}/remove-method', {
        path,
        body: { method_id: entry.selection.method_id },
      });
    return client.delete(
      '/v1/watchlists/{watchlist_id}/entries/{entry_number}',
      { path: { ...path, entry_number: String(entry.index) } },
    );
  });
  if (result === null) return;
  if (!result.ok) {
    // The dialog was closed before the engine answered: show what it holds.
    if (removing.value === null) void reload();
    return;
  }
  removing.value = null;
  const document = result.value.data;
  status.value =
    document.removed === 0
      ? { key: 'watchlist.removedNone' }
      : { key: 'watchlist.removed', count: document.removed };
  if (document.watchlist) replace(document.watchlist);
  else void reload();
  focusHeading();
}

// Delete (D186, D215).
const deleting = ref<{ name: string | null; entries: number | null } | null>(
  null,
);
const deleteOpener = ref<HTMLElement | null>(null);
const removeWatchlist = useAction();

async function openDelete(opener: HTMLElement): Promise<void> {
  removeWatchlist.clear();
  deleteOpener.value = opener;
  if (state.value.kind === 'ready') {
    deleting.value = {
      name: state.value.data.display_name,
      entries: state.value.data.entries.length,
    };
    return;
  }
  // The watchlist cannot be read: take its name from the list (D215).
  let name: string | null;
  try {
    const list = (await (await engine.client()).get('/v1/watchlists')).data;
    name =
      list.items.find((item) => item.watchlist_id === watchlistId.value)
        ?.display_name ?? null;
  } catch {
    name = null;
  }
  deleting.value = { name, entries: null };
}

function closeDelete(): void {
  deleting.value = null;
  const failed = isNotFound(removeWatchlist.failure.value);
  removeWatchlist.clear();
  if (failed) void reload();
}

async function confirmDelete(): Promise<void> {
  const target = deleting.value;
  if (target === null) return;
  const result = await removeWatchlist.run((client) =>
    client.delete('/v1/watchlists/{watchlist_id}', {
      path: { watchlist_id: watchlistId.value },
    }),
  );
  if (result === null) return;
  if (!result.ok) {
    if (deleting.value === null) void reload();
    return;
  }
  const name = result.value.data.watchlist?.display_name ?? target.name;
  leaveNotice(
    name === null
      ? { key: 'watchlists.deletedUnnamed' }
      : { key: 'watchlists.deleted', parameters: { name } },
  );
  deleting.value = null;
  await router.push({ name: 'watchlists' });
}

const deleteTitle = computed(() =>
  deleting.value?.name
    ? t('watchlist.deleteTitle', { name: deleting.value.name })
    : t('watchlist.deleteTitleNoName'),
);
</script>

<template>
  <AppBreadcrumb :crumbs="crumbs" />
  <p v-if="status !== null" role="status">
    {{
      status.count === undefined
        ? t(status.key, status.parameters)
        : plural(status.key, status.count, status.parameters)
    }}
  </p>
  <template v-if="state.kind !== 'ready'">
    <ScreenState :state="state" @retry="reload()" />
    <p v-if="unreadable">
      <button
        type="button"
        class="danger"
        @click="openDelete($event.currentTarget as HTMLElement)"
      >
        {{ t('watchlist.deleteThis') }}
      </button>
    </p>
  </template>
  <template v-else>
    <div class="heading-row">
      <NameForm
        v-if="renaming"
        :initial="state.data.display_name"
        :submit-label="t('watchlist.save')"
        :pending-label="t('actions.saving')"
        :pending="rename.pending.value"
        :error="rename.failure.value"
        @submit="submitRename"
        @cancel="closeRename()"
        @retry="rename.clear()"
      />
      <h1 v-else ref="heading" tabindex="-1">{{ state.data.display_name }}</h1>
      <div class="actions">
        <button ref="renameButton" type="button" @click="openRename()">
          {{ t('watchlist.rename') }}
        </button>
        <button
          type="button"
          class="danger"
          @click="openDelete($event.currentTarget as HTMLElement)"
        >
          {{ t('watchlist.delete') }}
        </button>
      </div>
    </div>
    <p>
      {{
        plural('watchlist.summary', state.data.entries.length, {
          date: formatInstant(locale, state.data.created_at),
        })
      }}
    </p>
    <EmptyMessage v-if="state.data.entries.length === 0">{{
      t('watchlist.noEntries')
    }}</EmptyMessage>
    <TableScroll v-else>
      <table>
        <thead>
          <tr>
            <th scope="col">{{ t('watchlist.columns.position') }}</th>
            <th scope="col">{{ t('watchlist.columns.ticker') }}</th>
            <th scope="col">{{ t('watchlist.columns.strategy') }}</th>
            <th scope="col">{{ t('watchlist.columns.asOf') }}</th>
            <th scope="col">
              <span class="visually-hidden">{{
                t('watchlist.columns.actions')
              }}</span>
            </th>
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
            <td>
              <RemoveEntryButton
                :index="entry.index"
                :ticker="entry.ticker"
                :method-id="entry.selection.method_id"
                @open="openRemove(entry, $event)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </TableScroll>
    <section aria-labelledby="watchlist-refreshes-heading">
      <h2 id="watchlist-refreshes-heading">
        {{ t('watchlist.refreshesHeading') }}
      </h2>
      <RefreshesTable
        :watchlist-id="state.data.watchlist_id"
        empty-key="watchlist.noRefreshes"
      />
    </section>
    <RemoveEntryDialog
      v-if="removing !== null"
      :watchlist-name="state.data.display_name"
      :entries="state.data.entries"
      :entry="removing"
      :pending="remove.pending.value"
      :error="remove.failure.value"
      :opener="removeOpener"
      @confirm="confirmRemove"
      @cancel="closeRemove()"
      @retry="remove.clear()"
    />
  </template>
  <ConfirmDialog
    v-if="deleting !== null"
    :title="deleteTitle"
    :confirm-label="t('watchlist.delete')"
    :pending-label="t('actions.deleting')"
    :pending="removeWatchlist.pending.value"
    :error="removeWatchlist.failure.value"
    :opener="deleteOpener"
    @confirm="confirmDelete()"
    @cancel="closeDelete()"
    @retry="removeWatchlist.clear()"
  >
    <p v-if="deleting.entries !== null">
      {{ plural('watchlist.deleteEntries', deleting.entries) }}
    </p>
    <p>{{ t('actions.runsKept') }}</p>
  </ConfirmDialog>
</template>

<style scoped>
.heading-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: space-between;
}

.actions {
  display: flex;
  gap: var(--space-2);
}
</style>
