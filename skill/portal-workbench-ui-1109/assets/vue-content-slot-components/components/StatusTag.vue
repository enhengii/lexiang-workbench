<script setup lang="ts">
withDefaults(defineProps<{
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral'
  ariaLabel?: string
}>(), { tone: 'neutral' })
</script>

<template><span class="cs-status-tag" :class="`cs-status-tag--${tone}`" :aria-label="ariaLabel"><i aria-hidden="true" /><slot /></span></template>
