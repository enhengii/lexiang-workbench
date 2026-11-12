<script setup lang="ts">
defineProps<{ title: string; description?: string; meta?: string }>()
</script>

<template>
  <header class="cs-page-header">
    <div class="cs-page-header__heading">
      <h1 class="cs-page-header__title">{{ title }}</h1>
      <p v-if="description" class="cs-page-header__description">{{ description }}</p>
      <p v-if="meta" class="cs-page-header__meta">{{ meta }}</p>
      <slot name="status" />
    </div>
    <div v-if="$slots.actions" class="cs-page-header__actions"><slot name="actions" /></div>
  </header>
</template>
