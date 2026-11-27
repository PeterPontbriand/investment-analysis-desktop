<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useEngine } from '../api/engine.ts';
import { focusHelpTarget, sectionElementId } from '../api/helpLinks.ts';
import { useScreenData } from '../api/useScreenData.ts';
import HelpMarkdown from '../components/HelpMarkdown.vue';
import ScreenState from '../components/ScreenState.vue';
import { useRouteParam } from '../composables/useRouteParam.ts';
import { useMessages } from '../i18n/index.ts';
import { registerScreen } from '../composables/useTrail.ts';

// One of the engine's guides (D369): its title, its introduction and its
// sections, all as served.
const { t } = useMessages();
const route = useRoute();
const engine = useEngine();
const documentId = useRouteParam('help-document', 'documentId');
const { state, reload } = useScreenData(
  () => engine.terms.helpDocument(documentId.value),
  ['help'],
  [documentId],
);
const guide = computed(() =>
  state.value.kind === 'ready' ? state.value.data : null,
);
const lang = computed(() => guide.value?.contentLanguage ?? null);

// The heading the address names has focus, or the guide's title when it names
// none, on load and whenever the hash changes. The route object is shared, and
// changes before the screen goes away.
watch(
  [state, () => route.hash],
  () => {
    if (state.value.kind === 'ready' && route.name === 'help-document')
      focusHelpTarget(route.hash);
  },
  { flush: 'post' },
);

// The trail's label: the guide's title, in its language, once it has loaded
// (D382); Help is the screen above it.
registerScreen({
  label: () =>
    guide.value === null
      ? t('trail.guide')
      : [{ text: guide.value.data.title, lang: lang.value }],
  parents: () => [{ label: t('nav.help'), to: { name: 'help' } }],
});
</script>

<template>
  <h1 tabindex="-1" :lang="lang ?? undefined">
    {{ guide === null ? t('nav.help') : guide.data.title }}
  </h1>
  <ScreenState v-if="state.kind !== 'ready'" :state="state" @retry="reload()" />
  <p v-else-if="guide === null">{{ t('help.documentNotFound') }}</p>
  <div v-else class="guide">
    <HelpMarkdown :markdown="guide.data.introduction" :lang="lang" />
    <section v-for="section in guide.data.sections" :key="section.id">
      <component
        :is="section.level === 2 ? 'h2' : 'h3'"
        :id="sectionElementId(section.id)"
        tabindex="-1"
        :lang="lang ?? undefined"
      >
        {{ section.heading }}
      </component>
      <HelpMarkdown :markdown="section.markdown" :lang="lang" />
    </section>
  </div>
</template>

<style scoped>
.guide {
  max-inline-size: 48rem;
}
</style>
