<script setup lang="ts">
// A term's definition, as the preview and the details panel show it (B8). The
// definition comes from the help index, in the index's language.
defineProps<{ definition: string; lang: string | null }>();
</script>

<template>
  <p class="definition" :lang="lang ?? undefined">{{ definition }}</p>
</template>

<style scoped>
.definition {
  margin: 0;
}
</style>
