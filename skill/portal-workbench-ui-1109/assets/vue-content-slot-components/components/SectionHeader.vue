<script setup lang="ts">
import { computed } from 'vue'
const props = withDefaults(defineProps<{
  title: string
  description?: string
  meta?: string
  headingLevel?: 2 | 3
}>(), { headingLevel: 2 })
const tag = computed(() => `h${props.headingLevel}` as 'h2' | 'h3')
</script>

<template>
  <header class="cs-section-header">
    <div class="cs-section-header__heading">
      <div class="cs-section-header__line">
        <component :is="tag" class="cs-section-header__title">{{ title }}</component>
        <slot name="badge" />
      </div>
      <p v-if="description" class="cs-section-header__description">{{ description }}</p>
    </div>
    <div v-if="meta || $slots.actions" class="cs-section-header__side">
      <span v-if="meta" class="cs-section-header__meta">{{ meta }}</span>
      <slot name="actions" />
    </div>
  </header>
</template>
