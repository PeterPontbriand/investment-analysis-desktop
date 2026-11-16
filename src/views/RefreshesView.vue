<script setup lang="ts">
import RefreshesTable from '../components/RefreshesTable.vue';
import { useMessages } from '../i18n/index.ts';

const { t } = useMessages();
</script>

<template>
  <h1>{{ t('nav.refreshes') }}</h1>
  <RefreshesTable empty-key="refreshes.empty" />
</template>
