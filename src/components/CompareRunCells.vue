<script setup lang="ts">
import { formatCellValue } from '../i18n/format.ts';
import { useMessages } from '../i18n/index.ts';
import { cellOf, type CompareRun, type Group } from '../views/compareModel.ts';
import { runLocation } from '../views/navigation.ts';
import OutcomePill from './OutcomePill.vue';
import TermName from './TermName.vue';

// One run's cells in one strategy group (D160). Every cell of a run links to
// the run's detail, with the cell's text as the link text; a missing run is
// one cell that says so and links nowhere.
const props = defineProps<{
  run: CompareRun | null;
  group: Group;
  // The language of the engine's text, from the comparison's response.
  lang: string | null;
}>();

const { t, locale } = useMessages();

function view(key: string) {
  const cell = props.run ? cellOf(props.run, key) : undefined;
  if (!cell) return { number: false, text: null, status: null };
  return {
    number: cell.kind === 'number',
    text: formatCellValue(locale.value, cell, (value) =>
      t('common.multiple', { value }),
    ),
    // A text cell with no value shows the dash alone (D160).
    status: cell.kind === 'number' ? cell.status : null,
  };
}
</script>

<template>
  <td v-if="run === null" class="group-start missing" :colspan="group.span">
    {{ t('common.noValue') }}
    <small>{{ t('compare.notRun') }}</small>
  </td>
  <template v-else>
    <td
      v-if="run.headline === null"
      class="group-start"
      :colspan="group.valueSpan"
    >
      <RouterLink :to="runLocation(run.analysis_run_id)" class="value">
        <template v-if="run.headline_unavailable !== null">
          <TermName
            code-set="HeadlineUnavailable"
            :code="run.headline_unavailable"
          />
        </template>
        <template v-else>{{ t('common.noValue') }}</template>
      </RouterLink>
    </td>
    <template v-else>
      <td v-if="group.columns.length === 0" class="group-start">
        {{ t('common.noValue') }}
      </td>
      <td
        v-for="(column, position) in group.columns"
        :key="column.key"
        :class="{
          'group-start': position === 0,
          num: view(column.key).number,
        }"
        :lang="view(column.key).number ? undefined : (lang ?? undefined)"
      >
        <RouterLink :to="runLocation(run.analysis_run_id)" class="value">
          <template v-if="view(column.key).text !== null">{{
            view(column.key).text
          }}</template>
          <template v-else>
            {{ t('common.noValue') }}
            <small v-if="view(column.key).status !== null">
              <TermName
                code-set="CellStatusValue"
                :code="view(column.key).status!"
              />
            </small>
          </template>
        </RouterLink>
      </td>
    </template>
    <td v-if="group.outcomeColumn">
      <RouterLink :to="runLocation(run.analysis_run_id)" class="pill-link">
        <OutcomePill :code="run.outcome" />
      </RouterLink>
    </td>
  </template>
</template>

<style scoped>
.group-start {
  border-inline-start: var(--border-width) solid var(--color-border);
}

.value {
  color: var(--color-text);
  font-weight: var(--font-weight-medium);
}

.pill-link {
  text-decoration: none;
}

small {
  color: var(--color-text-secondary);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-regular);
}

.missing {
  color: var(--color-text-secondary);
}
</style>
