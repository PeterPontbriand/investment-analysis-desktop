<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEngine } from '../api/engine.ts';
import { useScreenData } from '../api/useScreenData.ts';
import ScreenState from '../components/ScreenState.vue';
import TermTrigger from '../components/TermTrigger.vue';
import { useMessages } from '../i18n/index.ts';

// What the application does and does not do, and what each screen is for
// (D371, D372). It explains no engine term: each is a trigger that does. A
// screen's link and a term's trigger are never one inside the other (D317).
const { t } = useMessages();
const engine = useEngine();

// Only the guide's line waits for the help index; the rest always shows (D373).
const guideId = 'beginner-guide';
const { state, reload } = useScreenData(() => engine.terms.helpIndex(), []);
const guide = computed(() => {
  if (state.value.kind !== 'ready') return null;
  const { data, contentLanguage } = state.value.data;
  const listed = data.documents.find((item) => item.id === guideId);
  return listed === undefined
    ? null
    : { title: listed.title, lang: contentLanguage };
});

// A term read while the index could not be is plain text, so the lines are made
// again once "Try again" has read it.
const reads = ref(0);
async function retry(): Promise<void> {
  await reload();
  reads.value += 1;
}
</script>

<template>
  <h1>{{ t('nav.gettingStarted') }}</h1>
  <div :key="reads" class="text">
    <i18n-t keypath="gettingStarted.intro" scope="global" tag="p">
      <template #strategies>
        <TermTrigger
          term-id="analysis-strategy"
          :name="t('gettingStarted.terms.strategies')"
          >{{ t('gettingStarted.terms.strategies') }}</TermTrigger
        >
      </template>
      <template #tickers>
        <TermTrigger
          term-id="ticker"
          :name="t('gettingStarted.terms.tickers')"
          >{{ t('gettingStarted.terms.tickers') }}</TermTrigger
        >
      </template>
    </i18n-t>
    <ul>
      <i18n-t keypath="gettingStarted.analyze" scope="global" tag="li">
        <template #screen>
          <RouterLink :to="{ name: 'analyze' }">{{
            t('nav.analyze')
          }}</RouterLink>
        </template>
        <template #ticker>
          <TermTrigger
            term-id="ticker"
            :name="t('gettingStarted.terms.ticker')"
            >{{ t('gettingStarted.terms.ticker') }}</TermTrigger
          >
        </template>
      </i18n-t>
      <i18n-t keypath="gettingStarted.watchlists" scope="global" tag="li">
        <template #screen>
          <RouterLink :to="{ name: 'watchlists' }">{{
            t('nav.watchlists')
          }}</RouterLink>
        </template>
        <template #watchlists>
          <TermTrigger
            term-id="watchlist"
            :name="t('gettingStarted.terms.watchlists')"
            >{{ t('gettingStarted.terms.watchlists') }}</TermTrigger
          >
        </template>
        <template #entries>
          <TermTrigger
            term-id="entry"
            :name="t('gettingStarted.terms.entries')"
            >{{ t('gettingStarted.terms.entries') }}</TermTrigger
          >
        </template>
      </i18n-t>
      <i18n-t keypath="gettingStarted.refreshes" scope="global" tag="li">
        <template #screen>
          <RouterLink :to="{ name: 'refreshes' }">{{
            t('nav.refreshes')
          }}</RouterLink>
        </template>
        <template #refresh>
          <TermTrigger
            term-id="refresh"
            :name="t('gettingStarted.terms.refresh')"
            >{{ t('gettingStarted.terms.refresh') }}</TermTrigger
          >
        </template>
      </i18n-t>
      <i18n-t keypath="gettingStarted.runs" scope="global" tag="li">
        <template #screen>
          <RouterLink :to="{ name: 'runs' }">{{ t('nav.runs') }}</RouterLink>
        </template>
        <template #run>
          <TermTrigger
            term-id="analysis-run"
            :name="t('gettingStarted.terms.run')"
            >{{ t('gettingStarted.terms.run') }}</TermTrigger
          >
        </template>
      </i18n-t>
      <i18n-t keypath="gettingStarted.help" scope="global" tag="li">
        <template #screen>
          <RouterLink :to="{ name: 'help' }">{{ t('nav.help') }}</RouterLink>
        </template>
      </i18n-t>
      <i18n-t keypath="gettingStarted.about" scope="global" tag="li">
        <template #screen>
          <RouterLink :to="{ name: 'about' }">{{ t('nav.about') }}</RouterLink>
        </template>
      </i18n-t>
    </ul>
  </div>
  <ScreenState v-if="state.kind !== 'ready'" :state="state" @retry="retry()" />
  <i18n-t
    v-else-if="guide !== null"
    keypath="gettingStarted.guide"
    scope="global"
    tag="p"
    class="text"
  >
    <template #guide>
      <RouterLink
        :to="{ name: 'help-document', params: { documentId: guideId } }"
        :lang="guide.lang ?? undefined"
        >{{ guide.title }}</RouterLink
      >
    </template>
  </i18n-t>
</template>

<style scoped>
.text {
  max-inline-size: 48rem;
}
</style>
