<template>
  <div class="table-scroll"><slot /></div>
</template>

<style scoped>
.table-scroll {
  margin-block-end: var(--space-4);
  overflow-x: auto;
}
</style>
