<script setup lang="ts">
import { useScreenData } from '../api/useScreenData.ts';
import AppBreadcrumb from '../components/AppBreadcrumb.vue';
import ScreenState from '../components/ScreenState.vue';
import { formatList } from '../i18n/format.ts';
import { useMessages } from '../i18n/index.ts';

const { t, locale } = useMessages();
const { state, reload } = useScreenData((client) => client.get('/v1/info'));
</script>

<template>
  <AppBreadcrumb :current="t('nav.about')" />
  <h1>{{ t('nav.about') }}</h1>
  <section aria-labelledby="engine-heading">
    <h2 id="engine-heading">{{ t('engine.heading') }}</h2>
    <ScreenState
      v-if="state.kind !== 'ready'"
      :state="state"
      @retry="reload()"
    />
    <dl v-else>
      <dt>{{ t('engine.labels.version') }}</dt>
      <dd>{{ state.data.data.engine_version }}</dd>
      <dt>{{ t('engine.labels.apiVersions') }}</dt>
      <dd>{{ formatList(locale, state.data.data.api_versions) }}</dd>
      <dt>{{ t('engine.labels.schemaVersion') }}</dt>
      <dd>{{ state.data.data.schema_version }}</dd>
      <dt>{{ t('engine.labels.secIdentity') }}</dt>
      <dd>
        {{
          state.data.data.sec_identity_configured
            ? t('engine.secIdentity.configured')
            : t('engine.secIdentity.notConfigured')
        }}
      </dd>
      <dt>{{ t('engine.labels.languages') }}</dt>
      <dd :lang="state.data.contentLanguage ?? undefined">
        {{
          formatList(
            locale,
            state.data.data.locales.map((item) => item.name),
          )
        }}
      </dd>
    </dl>
  </section>
</template>

<style scoped>
dt {
  font-weight: 600;
}

dd {
  margin-block-end: 0.75rem;
  margin-inline-start: 0;
}
</style>
