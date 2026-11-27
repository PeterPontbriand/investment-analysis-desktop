<script setup lang="ts">
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import { useEngine } from '../api/engine.ts';
import { focusHelpTarget, groupElementId } from '../api/helpLinks.ts';
import { useScreenData } from '../api/useScreenData.ts';
import ScreenState from '../components/ScreenState.vue';
import TermTrigger from '../components/TermTrigger.vue';
import { useMessages } from '../i18n/index.ts';
import { registerScreen } from '../composables/useTrail.ts';

// The engine's guides and glossary (D369), from the cached help index.
const { t } = useMessages();
const route = useRoute();
const engine = useEngine();
const { state, reload } = useScreenData(
  () => engine.terms.helpIndex(),
  ['help'],
);

// An address that names a group shows that group, on load and whenever the
// hash changes. The route object is shared, and changes before the screen goes.
watch(
  [state, () => route.hash],
  () => {
    if (
      state.value.kind === 'ready' &&
      route.name === 'help' &&
      route.hash !== ''
    )
      focusHelpTarget(route.hash);
  },
  { flush: 'post' },
);

// The trail's label for this screen (D382); it has no screen above it.
registerScreen({ label: () => t('nav.help'), parents: () => [] });
</script>

<template>
  <h1>{{ t('nav.help') }}</h1>
  <ScreenState v-if="state.kind !== 'ready'" :state="state" @retry="reload()" />
  <template v-else>
    <h2>{{ t('help.guides') }}</h2>
    <ul :lang="state.data.contentLanguage ?? undefined">
      <li v-for="guide in state.data.data.documents" :key="guide.id">
        <RouterLink
          :to="{ name: 'help-document', params: { documentId: guide.id } }"
          >{{ guide.title }}</RouterLink
        >
      </li>
    </ul>
    <section
      v-for="group in state.data.data.groups"
      :key="group.id"
      :lang="state.data.contentLanguage ?? undefined"
    >
      <h2 :id="groupElementId(group.id)" tabindex="-1">{{ group.title }}</h2>
      <ul class="terms">
        <li v-for="term in group.terms" :key="term.id">
          <TermTrigger :term-id="term.id" :name="term.name">{{
            term.name
          }}</TermTrigger>
        </li>
      </ul>
    </section>
  </template>
</template>

<style scoped>
/* Each item has the indent, so the bullets of every column have their room. */
.terms {
  columns: 16rem;
  padding-inline-start: 0;
}

.terms li {
  break-inside: avoid;
  margin-inline-start: 2.5rem;
}

/* A name that wraps starts beside its bullet. */
.terms :deep(.term-trigger) {
  vertical-align: top;
}
</style>
