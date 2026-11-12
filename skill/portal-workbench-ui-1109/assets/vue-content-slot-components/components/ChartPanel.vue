<script setup lang="ts">
import SectionHeader from './SectionHeader.vue'
withDefaults(defineProps<{
  title: string
  description?: string
  scopeLabel?: string
  state?: 'loading' | 'data' | 'empty' | 'error' | 'stale'
}>(), { state: 'data' })
</script>

<template>
  <section class="cs-chart-panel">
    <SectionHeader :title="title" :description="description" :meta="scopeLabel"><template v-if="$slots.actions" #actions><slot name="actions" /></template></SectionHeader>
    <div v-if="$slots.legend" class="cs-chart-panel__legend"><slot name="legend" /></div>
    <div class="cs-chart-panel__plot"><slot v-if="state === 'data'" /><slot v-else name="state" :state="state" /></div>
  </section>
</template>
