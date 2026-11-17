<script setup lang="ts">
/* global HTMLElement, HTMLButtonElement -- DOM types; src/ configures no browser globals */
import { nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useScreenData } from '../api/useScreenData.ts';
import EmptyMessage from '../components/EmptyMessage.vue';
import NameForm from '../components/NameForm.vue';
import ScreenState from '../components/ScreenState.vue';
import TableScroll from '../components/TableScroll.vue';
import { useAction } from '../composables/useAction.ts';
import { takeNotice } from '../composables/useNotice.ts';
import { formatCount, formatInstant } from '../i18n/format.ts';
import { useMessages } from '../i18n/index.ts';

const { t, plural, locale } = useMessages();
const router = useRouter();
const { state, reload } = useScreenData(
  async (client) => (await client.get('/v1/watchlists')).data,
  [],
);

// What the user's last action did, from the screen that sent them here (D220).
const notice = takeNotice();
const heading = ref<HTMLElement | null>(null);
onMounted(() => {
  if (notice !== null) heading.value?.focus();
});

const creating = ref(false);
const opener = ref<HTMLElement | null>(null);
const newButton = ref<HTMLButtonElement | null>(null);
const create = useAction();

function openForm(): void {
  create.clear();
  creating.value = true;
  opener.value = newButton.value;
}

function closeForm(): void {
  creating.value = false;
  create.clear();
  void nextTick(() => opener.value?.focus());
}

async function submit(name: string): Promise<void> {
  const result = await create.run((client) =>
    client.post('/v1/watchlists', { body: { name } }),
  );
  if (result?.ok)
    await router.push({
      name: 'watchlist',
      params: { watchlistId: result.value.data.watchlist_id },
    });
}
</script>

<template>
  <h1 ref="heading" tabindex="-1">{{ t('nav.watchlists') }}</h1>
  <div role="status">
    <p v-if="notice !== null">
      {{
        notice.count === undefined
          ? t(notice.key, notice.parameters)
          : plural(notice.key, notice.count, notice.parameters)
      }}
    </p>
  </div>
  <p v-if="!creating">
    <button ref="newButton" type="button" @click="openForm()">
      {{ t('watchlists.newWatchlist') }}
    </button>
  </p>
  <NameForm
    v-else
    initial=""
    :submit-label="t('watchlists.create')"
    :pending-label="t('actions.saving')"
    :pending="create.pending.value"
    :error="create.failure.value"
    @submit="submit"
    @cancel="closeForm()"
    @retry="create.clear()"
  />
  <ScreenState v-if="state.kind !== 'ready'" :state="state" @retry="reload()" />
  <EmptyMessage v-else-if="state.data.items.length === 0">{{
    t('watchlists.empty')
  }}</EmptyMessage>
  <TableScroll v-else>
    <table>
      <thead>
        <tr>
          <th scope="col">{{ t('watchlists.columns.name') }}</th>
          <th class="num" scope="col">{{ t('watchlists.columns.entries') }}</th>
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
          <td class="num">{{ formatCount(locale, item.entry_count) }}</td>
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
  </TableScroll>
</template>
