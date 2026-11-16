<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue';
import { useEngine } from '../api/engine.ts';
import type { ApiResult, GetResponse } from '../api/client.ts';
import type { ScreenState as ScreenStateValue } from '../api/useScreenData.ts';
import { directionOf } from '../i18n/direction.ts';
import { useMessages, type MessageKey } from '../i18n/index.ts';
import ScreenState from './ScreenState.vue';

type Mode = 'concise' | 'details' | 'diagnostics';
type RunDocument = ApiResult<GetResponse<'/v1/runs/{analysis_run_id}'>>;
type TextState = ScreenStateValue<{ text: string; lang: string | null }>;

// The four views of a run (D92, D164): the text in three modes, requested the
// first time its tab opens, and the stored document as JSON.
const props = defineProps<{
  runId: string;
  runDocument:
    { ok: true; result: RunDocument } | { ok: false; error: unknown };
}>();
defineEmits<{ retry: [] }>();

const { t, locale } = useMessages();
const engine = useEngine();
const id = useId();

const tabs: { key: Mode | 'json'; label: MessageKey }[] = [
  { key: 'concise', label: 'runDetail.tabs.summary' },
  { key: 'details', label: 'runDetail.tabs.details' },
  { key: 'diagnostics', label: 'runDetail.tabs.diagnostics' },
  { key: 'json', label: 'runDetail.tabs.json' },
];

const selected = ref<Mode | 'json'>('concise');
// The fetched texts live as long as this component. The run detail screen
// remounts it when the locale or the run changes (its data reload passes
// through the loading state), so a locale change fetches them again (D163).
const texts = ref<Partial<Record<Mode, TextState>>>({});

async function loadText(mode: Mode): Promise<void> {
  texts.value = { ...texts.value, [mode]: { kind: 'loading' } };
  let state: TextState;
  try {
    const client = await engine.client();
    const result = await client.get('/v1/runs/{analysis_run_id}/text', {
      path: { analysis_run_id: props.runId },
      query: { mode },
    });
    state = {
      kind: 'ready',
      data: { text: result.data.text, lang: result.contentLanguage },
    };
  } catch (error) {
    state = { kind: 'error', error };
  }
  texts.value = { ...texts.value, [mode]: state };
}

// A tab's text is requested the first time it opens and kept after that; a
// failed request is asked for again when the tab opens or the reader retries.
function show(key: Mode | 'json'): void {
  selected.value = key;
  if (key !== 'json' && texts.value[key]?.kind !== 'ready') void loadText(key);
}

show('concise');

type TabsEvent = {
  key: string;
  preventDefault(): void;
  currentTarget: unknown;
};
type Focusable = { querySelector(selector: string): { focus(): void } | null };

async function onKeydown(event: TabsEvent): Promise<void> {
  const index = tabs.findIndex((tab) => tab.key === selected.value);
  // Arrow keys follow the reading direction of the active locale.
  const rtl = directionOf(locale.value) === 'rtl';
  const step = (forward: boolean) =>
    (index + (forward === !rtl ? 1 : -1) + tabs.length) % tabs.length;
  let next: number;
  switch (event.key) {
    case 'ArrowRight':
      next = step(true);
      break;
    case 'ArrowLeft':
      next = step(false);
      break;
    case 'Home':
      next = 0;
      break;
    case 'End':
      next = tabs.length - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  const tab = tabs[next];
  if (!tab) return;
  show(tab.key);
  const list = event.currentTarget as Focusable;
  await nextTick();
  list.querySelector('[role="tab"][aria-selected="true"]')?.focus();
}

const json = computed(() =>
  props.runDocument.ok
    ? JSON.stringify(props.runDocument.result.data, null, 2)
    : '',
);
const textState = computed(() =>
  selected.value === 'json' ? undefined : texts.value[selected.value],
);
</script>

<template>
  <div>
    <div
      role="tablist"
      class="tablist"
      :aria-label="t('runDetail.tabs.label')"
      @keydown="onKeydown"
    >
      <button
        v-for="tab in tabs"
        :id="`${id}-tab-${tab.key}`"
        :key="tab.key"
        type="button"
        role="tab"
        class="tab"
        :aria-selected="selected === tab.key"
        :aria-controls="`${id}-panel`"
        :tabindex="selected === tab.key ? 0 : -1"
        @click="show(tab.key)"
      >
        {{ t(tab.label) }}
      </button>
    </div>
    <div
      :id="`${id}-panel`"
      role="tabpanel"
      class="panel"
      tabindex="0"
      :aria-labelledby="`${id}-tab-${selected}`"
    >
      <template v-if="selected === 'json'">
        <pre v-if="runDocument.ok" dir="ltr">{{ json }}</pre>
        <ScreenState
          v-else
          :state="{ kind: 'error', error: runDocument.error }"
          @retry="$emit('retry')"
        />
      </template>
      <template v-else-if="textState?.kind === 'ready'">
        <pre
          :lang="textState.data.lang ?? undefined"
          :dir="directionOf(textState.data.lang)"
          >{{ textState.data.text }}</pre>
      </template>
      <p
        v-else-if="textState === undefined || textState.kind === 'loading'"
        role="status"
        class="loading"
      >
        {{ t('common.loading') }}
      </p>
      <ScreenState
        v-else
        :state="textState"
        @retry="loadText(selected as Mode)"
      />
    </div>
  </div>
</template>

<style scoped>
.tablist {
  border-block-end: var(--border-width) solid var(--color-border);
  display: flex;
  gap: var(--space-1);
}

.tab {
  background: none;
  border: var(--border-width) solid transparent;
  border-radius: var(--radius-control) var(--radius-control) 0 0;
  color: var(--color-text-secondary);
  padding: var(--space-1) var(--space-3);
}

.tab[aria-selected='true'] {
  background: var(--color-surface-raised);
  border-color: var(--color-border);
  color: var(--color-text);
  font-weight: var(--font-weight-medium);
}

.panel {
  margin-block-start: var(--space-3);
  overflow-x: auto;
}

pre {
  font-family: var(--font-mono);
  font-size: var(--font-size-body);
  margin: 0;
  white-space: pre;
}

.loading {
  color: var(--color-text-secondary);
}
</style>
