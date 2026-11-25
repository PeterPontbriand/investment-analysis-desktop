<script setup lang="ts">
import { computed, inject, shallowRef, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useEngine } from '../api/engine.ts';
import { focusHelpTarget, groupElementId } from '../api/helpLinks.ts';
import type { HelpTerm } from '../api/terms.ts';
import { closePanel } from '../composables/useDetailsPanel.ts';
import { useMessages } from '../i18n/index.ts';
import HelpMarkdown from './HelpMarkdown.vue';
import { insidePanel } from './panelScope.ts';
import ScreenState from './ScreenState.vue';
import TermDefinition from './TermDefinition.vue';

// The body of the details panel for a term (D364, D365): its definition at
// once, from the help index, then the rest of its entry and the group that
// lists it, from the term's own document.
const props = defineProps<{
  termId: string;
  definition: string;
  lang: string | null;
}>();

type EntryState =
  | { kind: 'loading' }
  | { kind: 'error'; error: unknown }
  | { kind: 'ready'; entry: HelpTerm | null };

const { t, locale } = useMessages();
const router = useRouter();
const engine = useEngine();
const inPanel = inject(insidePanel, false);
const state = shallowRef<EntryState>({ kind: 'loading' });
let latest = 0;

async function load(): Promise<void> {
  const current = ++latest;
  state.value = { kind: 'loading' };
  const next = await engine.terms.termDocument(props.termId).then(
    (entry): EntryState => ({ kind: 'ready', entry }),
    (error: unknown): EntryState => ({ kind: 'error', error }),
  );
  if (current === latest) state.value = next;
}
watch([locale, () => props.termId], load, { immediate: true });

const entry = computed(() =>
  state.value.kind === 'ready' ? state.value.entry : null,
);
const entryLang = computed(() => entry.value?.contentLanguage ?? null);
const group = computed(() => {
  const listed = entry.value?.data.group;
  return listed === undefined
    ? null
    : {
        title: listed.title,
        to: { name: 'help', hash: `#${groupElementId(listed.id)}` },
      };
});

// The link leaves the panel, also when only the address's hash changes, and
// focuses its group again when the address is already shown (D301).
function follow(): void {
  if (group.value === null) return;
  const target = router.resolve(group.value.to);
  if (inPanel) closePanel({ returnFocus: false });
  if (target.fullPath === router.currentRoute.value.fullPath)
    focusHelpTarget(target.hash);
}
</script>

<template>
  <TermDefinition :definition="definition" :lang="lang" />
  <p v-if="state.kind === 'loading'">{{ t('common.loading') }}</p>
  <ScreenState
    v-else-if="state.kind === 'error'"
    class="failure"
    :state="state"
    @retry="load()"
  />
  <p v-else-if="entry === null">{{ t('help.termNotFound') }}</p>
  <template v-else>
    <HelpMarkdown
      v-if="entry.data.body !== ''"
      class="body"
      :markdown="entry.data.body"
      :lang="entryLang"
    />
    <p v-if="group !== null" class="listed">
      {{ t('help.listedUnder') }}
      <RouterLink
        :to="group.to"
        :lang="entryLang ?? undefined"
        @click="follow()"
        >{{ group.title }}</RouterLink
      >
    </p>
  </template>
</template>

<style scoped>
.failure,
.body {
  margin-block-start: var(--space-3);
}

.listed {
  border-block-start: var(--border-width) solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: var(--font-size-small);
  margin-block-start: var(--space-4);
  padding-block-start: var(--space-2);
}
</style>
