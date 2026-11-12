<script setup lang="ts">
withDefaults(defineProps<{
  state: 'loading' | 'empty' | 'filtered-empty' | 'error' | 'no-permission' | 'stale'
  title: string
  description?: string
}>(), { description: '' })
</script>

<template>
  <div class="cs-feedback-state" :role="state === 'error' ? 'alert' : 'status'" :aria-live="state === 'loading' ? 'polite' : undefined">
    <span class="cs-feedback-state__icon" aria-hidden="true">{{ state === 'loading' ? '…' : '○' }}</span>
    <strong>{{ title }}</strong>
    <p v-if="description">{{ description }}</p>
    <slot name="action" />
  </div>
</template>
