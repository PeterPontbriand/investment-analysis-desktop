<script setup lang="ts">
import { setShowPreviews, showPreviews } from '../preferences.ts';
import { useMessages } from '../i18n/index.ts';

// The switch that turns the previews of D284 on and off (D330). It is a real
// switch: a button with role "switch", operated with Space or Enter.
const { t } = useMessages();
</script>

<template>
  <button
    type="button"
    role="switch"
    class="popup-switch"
    :aria-checked="showPreviews ? 'true' : 'false'"
    @click="setShowPreviews(!showPreviews)"
  >
    <span class="track" aria-hidden="true"><span class="thumb" /></span>
    {{ t('previewSwitch.label') }}
  </button>
</template>

<style scoped>
.popup-switch {
  align-items: center;
  background: none;
  border: var(--border-width) solid transparent;
  color: var(--color-text-secondary);
  display: flex;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
}

.track {
  background: var(--color-surface-raised);
  border: var(--border-width) solid var(--color-control-border);
  border-radius: 999px;
  box-sizing: border-box;
  display: inline-flex;
  flex: none;
  inline-size: 2rem;
  block-size: 1.125rem;
  padding: 2px;
}

.thumb {
  background: var(--color-text-muted);
  border-radius: 50%;
  block-size: 100%;
  inline-size: 0.75rem;
}

[aria-checked='true'] .track {
  background: var(--color-accent);
  border-color: var(--color-accent);
  justify-content: flex-end;
}

[aria-checked='true'] .thumb {
  background: var(--color-surface);
}
</style>
