<script setup lang="ts">
import { useMessages } from '../i18n/index.ts';

const { t } = useMessages();
</script>

<template>
  <main>
    <h1>{{ t('app.name') }}</h1>
    <p>{{ t('app.preReleaseNotice') }}</p>
  </main>
</template>

<style scoped>
main {
  margin-block: 4rem;
  margin-inline: auto;
  max-inline-size: 48rem;
  padding-inline: 1.5rem;
}
</style>
