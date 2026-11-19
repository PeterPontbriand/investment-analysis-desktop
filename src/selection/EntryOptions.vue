<script setup lang="ts">
import ActionFailure from '../components/ActionFailure.vue';
import { useMessages } from '../i18n/index.ts';
import OptionsList from './OptionsList.vue';
import type { FormLoad } from './useSelectionForms.ts';

// What the expanded row of an entry shows (D233): the strategy's selection
// form while it loads, the failure to read it, or the stored options.
defineProps<{
  form: FormLoad | undefined;
  selection: Record<string, unknown>;
}>();
defineEmits<{ retry: [] }>();

const { t } = useMessages();
</script>

<template>
  <p v-if="form === undefined || form.kind === 'loading'" role="status">
    {{ t('common.loading') }}
  </p>
  <div v-else-if="form.kind === 'error'" role="alert">
    <ActionFailure :error="form.error" @retry="$emit('retry')" />
  </div>
  <OptionsList v-else :fields="form.form.fields" :selection="selection" />
</template>
