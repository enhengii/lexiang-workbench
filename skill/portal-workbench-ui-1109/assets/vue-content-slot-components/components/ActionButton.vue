<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  iconOnly?: boolean
  ariaLabel?: string
}>(), { variant: 'secondary', size: 'md', loading: false, disabled: false, iconOnly: false })
</script>

<template>
  <button
    class="cs-action-button"
    :class="[`cs-action-button--${variant}`, `cs-action-button--${size}`, { 'is-icon-only': iconOnly }]"
    type="button"
    :disabled="disabled || loading"
    :aria-label="ariaLabel"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" class="cs-spinner" aria-hidden="true" />
    <slot name="leading" />
    <span v-if="!iconOnly"><slot /></span>
    <slot name="trailing" />
  </button>
</template>
