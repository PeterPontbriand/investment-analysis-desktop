<script setup lang="ts">
import { useEngineInfo } from '../api/useEngineInfo.ts';
import { formatList } from '../i18n/format.ts';
import { useMessages } from '../i18n/index.ts';

const { t, locale } = useMessages();
const engine = useEngineInfo();
</script>

<template>
  <main>
    <h1>{{ t('app.name') }}</h1>
    <p>{{ t('app.preReleaseNotice') }}</p>
    <section aria-labelledby="engine-heading">
      <h2 id="engine-heading">{{ t('engine.heading') }}</h2>
      <p v-if="engine.kind === 'loading'">{{ t('engine.loading') }}</p>
      <p v-else-if="engine.kind === 'message'" role="status">
        {{ t(engine.key) }}
      </p>
      <dl v-else>
        <dt>{{ t('engine.labels.version') }}</dt>
        <dd>{{ engine.info.engine_version }}</dd>
        <dt>{{ t('engine.labels.apiVersions') }}</dt>
        <dd>{{ formatList(locale, engine.info.api_versions) }}</dd>
        <dt>{{ t('engine.labels.schemaVersion') }}</dt>
        <dd>{{ engine.info.schema_version }}</dd>
        <dt>{{ t('engine.labels.secIdentity') }}</dt>
        <dd>
          {{
            engine.info.sec_identity_configured
              ? t('engine.secIdentity.configured')
              : t('engine.secIdentity.notConfigured')
          }}
        </dd>
        <dt>{{ t('engine.labels.languages') }}</dt>
        <dd :lang="engine.language ?? undefined">
          {{
            formatList(
              locale,
              engine.info.locales.map((item) => item.name),
            )
          }}
        </dd>
      </dl>
    </section>
  </main>
</template>

<style scoped>
main {
  margin-block: 4rem;
  margin-inline: auto;
  max-inline-size: 48rem;
  padding-inline: 1.5rem;
}

dt {
  font-weight: 600;
}

dd {
  margin-block-end: 0.75rem;
  margin-inline-start: 0;
}
</style>
