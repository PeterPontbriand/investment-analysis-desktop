<script setup lang="ts">
/* global console -- the browser's console; src/ configures no browser globals */
import { getPlatform } from '../platform/index.ts';
import { useMessages } from '../i18n/index.ts';

// A further-reading link (D368): the user's browser opens it, and only when
// the user activates it. Every other way to follow the address, such as a
// middle click, does nothing, so the application's own window never leaves.
const props = defineProps<{ href: string }>();

const { t, locale } = useMessages();

function open(): void {
  getPlatform().openExternal(props.href).catch(console.error);
}
</script>

<template>
  <a
    :href="href"
    rel="noreferrer"
    class="external-link"
    @click.prevent="open()"
    @auxclick.prevent
    ><slot />{{ ' '
    }}<span class="visually-hidden" :lang="locale">{{
      t('help.opensInBrowser')
    }}</span
    ><span class="mark" aria-hidden="true">{{
      t('help.externalMark')
    }}</span></a
  >
</template>

<style scoped>
.mark {
  display: inline-block;
}
</style>
