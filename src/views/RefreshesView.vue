<script setup lang="ts">
import RefreshesTable from '../components/RefreshesTable.vue';
import { useMessages } from '../i18n/index.ts';
import { registerScreen } from '../composables/useTrail.ts';

const { t } = useMessages();

// The trail's label for this screen (D382); it has no screen above it.
registerScreen({ label: () => t('nav.refreshes'), parents: () => [] });
</script>

<template>
  <h1>{{ t('nav.refreshes') }}</h1>
  <RefreshesTable empty-key="refreshes.empty" />
</template>
