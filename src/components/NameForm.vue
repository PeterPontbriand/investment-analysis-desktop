<script setup lang="ts">
/* global HTMLInputElement -- DOM types; src/ configures no browser globals */
import { computed, nextTick, onMounted, ref, useId, watch } from 'vue';
import { useMessages } from '../i18n/index.ts';
import ActionFailure from './ActionFailure.vue';

// The name field of "New watchlist" and "Rename" (D221). A blank name is
// refused here, before anything is sent; the engine trims the name and
// compares names without regard to case.
const props = defineProps<{
  initial: string;
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  // The failure of the action, shown at the field.
  error: unknown;
}>();
const emit = defineEmits<{
  submit: [name: string];
  cancel: [];
}>();

const { t } = useMessages();
const name = ref(props.initial);
const blank = ref(false);
const input = ref<HTMLInputElement | null>(null);
const inputId = useId();
const messageId = useId();

const hasError = computed(
  () => blank.value || (props.error !== null && props.error !== undefined),
);

let lastName = props.initial;

function retry(): void {
  emit('submit', lastName);
}

function submit(): void {
  if (props.pending) return;
  if (name.value.trim() === '') {
    blank.value = true;
    return;
  }
  blank.value = false;
  lastName = name.value;
  emit('submit', name.value);
}

onMounted(() => {
  input.value?.focus();
  input.value?.select();
});

// Focus goes to the field when a message appears at it, so the message is read.
watch(hasError, async (shown) => {
  if (!shown) return;
  await nextTick();
  input.value?.focus();
});

defineExpose({ focus: () => input.value?.focus() });
</script>

<template>
  <form
    class="name-form"
    novalidate
    @submit.prevent="submit()"
    @keydown.esc="$emit('cancel')"
  >
    <label :for="inputId">{{ t('actions.nameLabel') }}</label>
    <input
      :id="inputId"
      ref="input"
      v-model="name"
      type="text"
      autocomplete="off"
      :aria-invalid="hasError ? 'true' : undefined"
      :aria-describedby="hasError ? messageId : undefined"
      @input="blank = false"
    />
    <button
      type="submit"
      class="primary"
      :aria-disabled="pending ? 'true' : 'false'"
    >
      {{ pending ? pendingLabel : submitLabel }}
    </button>
    <button type="button" @click="$emit('cancel')">
      {{ t('actions.cancel') }}
    </button>
    <p v-if="blank" :id="messageId" class="field-message">
      {{ t('actions.nameRequired') }}
    </p>
    <ActionFailure
      v-else-if="error !== null && error !== undefined"
      :id="messageId"
      class="field-message"
      :error="error"
      @retry="retry()"
    />
  </form>
</template>

<style scoped>
.name-form {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-block: var(--space-3);
}

.field-message {
  color: var(--color-negative);
  flex-basis: 100%;
  margin: 0;
}
</style>
